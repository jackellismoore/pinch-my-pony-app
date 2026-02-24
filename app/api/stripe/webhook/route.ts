import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Stripe sends raw body; Next App Router supports req.text() for this.
async function updateBySupabaseUserId(supabaseUserId: string, patch: Record<string, any>) {
  const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", supabaseUserId);
  if (error) throw new Error(error.message);
}

async function updateByCustomerId(customerId: string, patch: Record<string, any>) {
  const { data: prof, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!prof?.id) return; // ok: no profile yet (or not linked)
  await updateBySupabaseUserId(prof.id, patch);
}

function getCustomerId(v: Stripe.Checkout.Session["customer"] | Stripe.Subscription["customer"]) {
  return typeof v === "string" ? v : v?.id ?? null;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature failed: ${err?.message ?? "unknown"}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      /**
       * Fired when checkout completes.
       * Good time to store stripe_customer_id + stripe_subscription_id.
       * Don't try to read "subscription_data" off the session (not a real property).
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerId = getCustomerId(session.customer);
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        // ✅ We set these in /api/stripe/checkout -> session.metadata
        const supabaseUserId = session.metadata?.supabase_user_id ?? undefined;
        // (Optional) You can also read plan here if you put it in metadata:
        // const plan = (session.metadata?.plan as "borrower" | "owner" | undefined) ?? undefined;

        if (supabaseUserId) {
          await updateBySupabaseUserId(supabaseUserId, {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            membership_status: "pending", // corrected by subscription events
          });
        } else if (customerId) {
          await updateByCustomerId(customerId, {
            stripe_subscription_id: subscriptionId,
            membership_status: "pending",
          });
        }

        break;
      }

      /**
       * Subscription lifecycle updates (source of truth).
       * We rely on metadata set on the subscription in /api/stripe/checkout.
       */
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const customerId = getCustomerId(sub.customer);
        const supabaseUserId = (sub.metadata?.supabase_user_id as string | undefined) ?? undefined;
        const plan = (sub.metadata?.plan as string | undefined) ?? undefined; // "borrower" | "owner"

        const patch: Record<string, any> = {
          stripe_subscription_id: sub.id,
          membership_status: sub.status, // active, trialing, past_due, canceled, unpaid, etc.
        };

        if (plan === "borrower" || plan === "owner") {
          patch.membership_tier = plan;
        }

        if (supabaseUserId) {
          await updateBySupabaseUserId(supabaseUserId, {
            stripe_customer_id: customerId,
            ...patch,
          });
        } else if (customerId) {
          await updateByCustomerId(customerId, patch);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const customerId = getCustomerId(sub.customer);
        const supabaseUserId = (sub.metadata?.supabase_user_id as string | undefined) ?? undefined;

        const patch: Record<string, any> = {
          membership_status: "canceled",
          membership_tier: "free",
          stripe_subscription_id: null,
        };

        if (supabaseUserId) {
          await updateBySupabaseUserId(supabaseUserId, patch);
        } else if (customerId) {
          await updateByCustomerId(customerId, patch);
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Webhook handler failed" }, { status: 500 });
  }
}