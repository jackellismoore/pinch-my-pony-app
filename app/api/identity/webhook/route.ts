import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err?.message ?? "unknown"}` }, { status: 400 });
  }

  // We care about identity.verification_session.* events :contentReference[oaicite:8]{index=8}
  if (!event.type.startsWith("identity.verification_session.")) {
    // Still log minimal event if you want; or ignore
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Identity.VerificationSession;

  // Determine user_id from metadata/client_reference_id
  const userId =
    (session.metadata && (session.metadata["user_id"] as string | undefined)) ||
    (session.client_reference_id as string | undefined) ||
    null;

  if (!userId) {
    // Log event anyway for audit (no user mapping)
    await supabaseAdmin.from("identity_verification_events").insert({
      user_id: "00000000-0000-0000-0000-000000000000", // placeholder; or skip insert
      provider: "stripe_identity",
      provider_event_id: event.id,
      event_type: event.type,
      payload: event as any,
    });
    return NextResponse.json({ received: true });
  }

  // Map Stripe statuses to our profile gating statuses
  const stripeStatus = session.status || "requires_input"; // requires_input | processing | verified | canceled
  let profileStatus: string = "pending";
  let outcome: string | null = null;

  if (stripeStatus === "verified") {
    profileStatus = "verified";
    outcome = "approved";
  } else if (stripeStatus === "processing") {
    profileStatus = "processing";
  } else if (stripeStatus === "canceled") {
    profileStatus = "failed";
    outcome = "canceled";
  } else {
    profileStatus = "pending";
  }

  // Optional failure details (Stripe may provide last_error)
  const reasonCodes: string[] | null =
    (session.last_error && session.last_error.code ? [session.last_error.code] : null) ?? null;

  // Upsert verification row
  await supabaseAdmin.from("identity_verifications").upsert(
    {
      user_id: userId,
      provider: "stripe_identity",
      provider_session_id: session.id,
      status: stripeStatus,
      outcome,
      reason_codes: reasonCodes,
      minimal_metadata: {
        livemode: session.livemode,
      },
      updated_at: new Date().toISOString(),
      completed_at: stripeStatus === "verified" || stripeStatus === "canceled" ? new Date().toISOString() : null,
    },
    { onConflict: "provider_session_id" }
  );

  // Append-only audit event
  await supabaseAdmin.from("identity_verification_events").insert({
    user_id: userId,
    provider: "stripe_identity",
    provider_event_id: event.id,
    event_type: event.type,
    payload: event as any,
  });

  // Update profile gate fields
  if (profileStatus === "verified") {
    await supabaseAdmin
      .from("profiles")
      .update({ verification_status: "verified", verified_at: new Date().toISOString() })
      .eq("id", userId);
  } else {
    await supabaseAdmin.from("profiles").update({ verification_status: profileStatus }).eq("id", userId);
  }

  return NextResponse.json({ received: true });
}