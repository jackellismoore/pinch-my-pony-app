// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Webhook not configured (missing stripe-signature or STRIPE_WEBHOOK_SECRET)" },
      { status: 400 }
    );
  }

  // Stripe requires the raw body for signature verification
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Invalid signature: ${err?.message ?? "unknown"}` },
      { status: 400 }
    );
  }

  // If Supabase env is missing, don't crash the whole build/runtime—return a clear error
  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (e: any) {
    return NextResponse.json(
      { error: `Supabase not configured: ${e?.message ?? "missing env"}` },
      { status: 500 }
    );
  }

  try {
    // TODO: handle the Stripe events you care about.
    // Example: record webhook receipt
    await supabaseAdmin.from("stripe_events").insert({
      event_id: event.id,
      type: event.type,
      payload: event as any,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook handler failed: ${err?.message ?? "unknown"}` },
      { status: 500 }
    );
  }
}