// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { requireApiUser, trustedAppOrigin } from "@/lib/serverAuth";
import { launchFeatureEnabled } from "@/lib/launchFeatures";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  plan?: "member_monthly";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const user = await requireApiUser(req);
    const checkoutEnabled = launchFeatureEnabled(process.env.STRIPE_MEMBERSHIP_CHECKOUT_ENABLED);
    const priceId = process.env.STRIPE_MEMBER_MONTHLY_PRICE_ID?.trim();

    if (!checkoutEnabled || body.plan !== "member_monthly" || !priceId) {
      return NextResponse.json(
        { error: "Paid memberships are not available during launch access" },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const appOrigin = trustedAppOrigin(req);
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id,membership_status")
      .eq("id", user.id)
      .maybeSingle();

    if (["active", "trialing"].includes(String(profile?.membership_status ?? "").toLowerCase())) {
      return NextResponse.json(
        { error: "Your borrowing membership is already active" },
        { status: 409 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appOrigin}/dashboard/membership?checkout=success`,
      cancel_url: `${appOrigin}/dashboard/membership?checkout=cancelled`,
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: body.plan },
      subscription_data: { metadata: { user_id: user.id, plan: body.plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    if (err?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err?.message ?? "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
