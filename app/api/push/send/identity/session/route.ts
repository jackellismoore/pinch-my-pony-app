import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    // Validate user via Supabase (server-side)
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
    }

    const userId = userData.user.id;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const returnUrl = `${siteUrl}/verify/return`;

    // Create Stripe Identity VerificationSession (hosted redirect flow)
    // Stripe docs: can redirect to session.url :contentReference[oaicite:7]{index=7}
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      // Optional: require selfie match (uncomment if desired)
      // options: { document: { require_matching_selfie: true } },
      metadata: { user_id: userId },
      client_reference_id: userId,
      return_url: returnUrl,
    });

    // Upsert identity_verifications record
    await supabaseAdmin.from("identity_verifications").upsert(
      {
        user_id: userId,
        provider: "stripe_identity",
        provider_session_id: session.id,
        status: session.status || "requires_input",
        minimal_metadata: { return_url: returnUrl },
      },
      { onConflict: "provider_session_id" }
    );

    // Update profile to pending (gating)
    await supabaseAdmin
      .from("profiles")
      .update({ verification_status: "pending", verification_provider: "stripe_identity" })
      .eq("id", userId);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to create verification session" }, { status: 500 });
  }
}