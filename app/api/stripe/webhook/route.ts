import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function extractUserIdFromEvent(event: Stripe.Event): string | null {
  const obj = event.data?.object as Record<string, any> | undefined;

  const userId =
    obj?.metadata?.user_id ??
    obj?.verification_session?.metadata?.user_id ??
    null;

  return typeof userId === "string" && userId.trim() ? userId.trim() : null;
}

async function writeIdentityVerificationSafe(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  providerSessionId: string | null;
  status: "verified" | "failed";
  outcome: "verified" | "failed";
}) {
  const { supabaseAdmin, userId, providerSessionId, status, outcome } = params;

  try {
    await supabaseAdmin.from("identity_verifications").upsert(
      {
        user_id: userId,
        provider: "stripe_identity",
        provider_event_id: providerSessionId,
        status,
        outcome,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );
  } catch (err) {
    console.warn("identity_verifications upsert skipped:", err);
  }
}

async function markVerified(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  providerSessionId: string | null;
}) {
  const { supabaseAdmin, userId, providerSessionId } = params;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      verification_status: "verified",
      verified_at: new Date().toISOString(),
      verification_provider: "stripe_identity",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to update verified profile: ${error.message}`);
  }

  await writeIdentityVerificationSafe({
    supabaseAdmin,
    userId,
    providerSessionId,
    status: "verified",
    outcome: "verified",
  });
}

async function markFailed(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  userId: string;
  providerSessionId: string | null;
}) {
  const { supabaseAdmin, userId, providerSessionId } = params;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      verification_status: "failed",
      verification_provider: "stripe_identity",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to update failed profile: ${error.message}`);
  }

  await writeIdentityVerificationSafe({
    supabaseAdmin,
    userId,
    providerSessionId,
    status: "failed",
    outcome: "failed",
  });
}

async function logStripeEventSafe(params: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  event: Stripe.Event;
}) {
  const { supabaseAdmin, event } = params;

  try {
    await supabaseAdmin.from("stripe_events").insert({
      event_id: event.id,
      type: event.type,
      payload: event as any,
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn("stripe_events insert skipped:", err?.message ?? err);
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      {
        error:
          "Webhook not configured (missing stripe-signature or STRIPE_WEBHOOK_SECRET)",
      },
      { status: 400 }
    );
  }

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

  let supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (e: any) {
    return NextResponse.json(
      { error: `Supabase not configured: ${e?.message ?? "missing env"}` },
      { status: 500 }
    );
  }

  try {
    await logStripeEventSafe({ supabaseAdmin, event });

    const obj = event.data?.object as Record<string, any> | undefined;
    const userId = extractUserIdFromEvent(event);
    const providerSessionId =
      typeof obj?.id === "string" && obj.id.trim() ? obj.id.trim() : null;

    switch (event.type) {
      case "identity.verification_session.verified": {
        if (!userId) {
          console.warn("identity.verification_session.verified missing user_id metadata");
          break;
        }

        await markVerified({
          supabaseAdmin,
          userId,
          providerSessionId,
        });
        break;
      }

      case "identity.verification_session.requires_input":
      case "identity.verification_session.canceled": {
        if (!userId) {
          console.warn(`${event.type} missing user_id metadata`);
          break;
        }

        await markFailed({
          supabaseAdmin,
          userId,
          providerSessionId,
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler failed:", err);
    return NextResponse.json(
      { error: `Webhook handler failed: ${err?.message ?? "unknown"}` },
      { status: 500 }
    );
  }
}