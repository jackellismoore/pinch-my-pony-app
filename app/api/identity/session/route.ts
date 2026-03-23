import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripeServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const stripe = getStripe();

    const body = await req.json().catch(() => null);
    const { userId, returnUrl } = body ?? {};

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!returnUrl) {
      return NextResponse.json({ error: "Missing returnUrl" }, { status: 400 });
    }

    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: userId,
      },
      return_url: returnUrl,
    });

    return NextResponse.json({
      id: session.id,
      url: session.url ?? null,
      clientSecret: session.client_secret ?? null,
    });
  } catch (err: any) {
    console.error("Identity session error:", err);

    return NextResponse.json(
      { error: err?.message || "Failed to create identity session" },
      { status: 500 }
    );
  }
}