// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = {
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const priceId = body.priceId?.trim();
    const successUrl = body.successUrl?.trim();
    const cancelUrl = body.cancelUrl?.trim();
    const customerEmail = body.customerEmail?.trim();

    if (!priceId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing priceId, successUrl, or cancelUrl" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to create checkout session" },
      { status: 500 }
    );
  }
}