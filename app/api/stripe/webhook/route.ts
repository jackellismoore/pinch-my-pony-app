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

  const updatePayload = {
    verification_status: "verified",
    verified_at: new Date().toISOString(),
    verification_provider: "stripe_identity",
    updated_at: new Date().toISOString(),
  };

  const { data: beforeRow, error: beforeErr } = await supabaseAdmin
    .from("profiles")
    .select("id, verification_status, verified_at, verification_provider")
    .eq("id", userId)
    .maybeSingle();

  if (beforeErr) {
    throw new Error(`Failed reading profile before update: ${beforeErr.message}`);
  }

  const { error: updateErr, count } = await supabaseAdmin
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId);

  if (updateErr) {
    throw new Error(`Failed to update verified profile: ${updateErr.message}`);
  }

  const { data: afterRow, error: afterErr } = await supabaseAdmin
    .from("profiles")
    .select("id, verification_status, verified_at, verification_provider")
    .eq("id", userId)
    .maybeSingle();

  if (afterErr) {
    throw new Error(`Failed reading profile after update: ${afterErr.message}`);
  }

  await writeIdentityVerificationSafe({
    supabaseAdmin,
    userId,
    providerSessionId,
    status: "verified",
    outcome: "verified",
  });

  return {
    beforeRow,
    afterRow,
    count: count ?? null,
  };
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
          return NextResponse.json(
            {
              received: true,
              warning: "verified event missing user_id metadata",
              eventType: event.type,
            },
            { status: 200 }
          );
        }

        const result = await markVerified({
          supabaseAdmin,
          userId,
          providerSessionId,
        });

        return NextResponse.json({
          received: true,
          eventType: event.type,
          userId,
          providerSessionId,
          result,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
        });
      }

      case "identity.verification_session.requires_input":
      case "identity.verification_session.canceled": {
        if (!userId) {
          return NextResponse.json(
            {
              received: true,
              warning: `${event.type} missing user_id metadata`,
              eventType: event.type,
            },
            { status: 200 }
          );
        }

        await markFailed({
          supabaseAdmin,
          userId,
          providerSessionId,
        });

        return NextResponse.json({
          received: true,
          eventType: event.type,
          userId,
          providerSessionId,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
        });
      }

      default:
        return NextResponse.json({
          received: true,
          eventType: event.type,
        });
    }
  } catch (err: any) {
    console.error("Webhook handler failed:", err);
    return NextResponse.json(
      {
        error: `Webhook handler failed: ${err?.message ?? "unknown"}`,
        eventType: event.type,
      },
      { status: 500 }
    );
  }
}