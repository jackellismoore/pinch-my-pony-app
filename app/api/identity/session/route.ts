import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization Bearer token" }, { status: 401 });
    }

    // Validate the user from the Supabase JWT
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !userData.user) {
      return NextResponse.json(
        { error: "Invalid auth token", details: userErr?.message ?? null },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_SITE_URL env var" }, { status: 500 });
    }

    // Create Stripe session
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { user_id: userId },
      client_reference_id: userId,
      return_url: `${siteUrl}/verify/return`,
    });

    // Save records (best-effort; don’t block redirect if table missing)
    try {
      await supabaseAdmin.from("identity_verifications").upsert(
        {
          user_id: userId,
          provider: "stripe_identity",
          provider_session_id: session.id,
          status: session.status || "requires_input",
          minimal_metadata: { return_url: `${siteUrl}/verify/return`, livemode: session.livemode },
        },
        { onConflict: "provider_session_id" }
      );

      await supabaseAdmin
        .from("profiles")
        .update({ verification_status: "pending", verification_provider: "stripe_identity" })
        .eq("id", userId);
    } catch (dbErr: any) {
      // still return session URL even if DB write fails
      console.error("DB write failed:", dbErr?.message ?? dbErr);
    }

    if (!session.url) {
      return NextResponse.json({ error: "Stripe session created but url was missing" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e: any) {
    console.error("Identity session error:", e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? "Failed to create verification session" }, { status: 500 });
  }
}