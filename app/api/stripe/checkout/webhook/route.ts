import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function updateBySupabaseUserId(
  supabaseUserId: string,
  patch: Record<string, any>
) {
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
    return NextResponse.json({ error: `Webhook signature failed: ${err?.message ?? "unknown"}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Fired when checkout completes (good time to store customer + initial intent)
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        // We set subscription metadata.plan in checkout; session metadata can be empty.
        // We'll use plan from subscription event too; but store what we can now.
        const supabaseUserId =
          (session?.subscription_data as any)?.metadata?.supabase_user_id ||
          (session?.metadata?.supabase_user_id as string | undefined);

        // Sometimes you *won't* have supabase_user_id on session; that’s fine.
        // We'll still update by customer id if we can find profile later.
        if (supabaseUserId) {
          await updateBySupabaseUserId(supabaseUserId, {
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            membership_status: "pending", // will be corrected by subscription events
          });
        } else if (customerId) {
          await updateByCustomerId(customerId, {
            stripe_subscription_id: subscriptionId ?? null,
            membership_status: "pending",
          });
        }

        break;
      }

      // Subscription became active / trialing / updated
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
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
            stripe_customer_id: customerId ?? null,
            ...patch,
          });
        } else if (customerId) {
          await updateByCustomerId(customerId, patch);
        }

        break;
      }

      // Subscription deleted/canceled
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
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
        // ignore unhandled event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Webhook handler failed" }, { status: 500 });
  }
}