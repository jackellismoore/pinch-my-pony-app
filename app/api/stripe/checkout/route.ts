import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripeServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const stripe = getStripe();

    const body = await req.json();
    const { priceId, successUrl, cancelUrl, customerEmail } = body;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
    });

    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error("Stripe checkout error:", err);

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}