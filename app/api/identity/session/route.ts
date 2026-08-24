import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripeServer";
import { requireApiUser, trustedAppOrigin } from "@/lib/serverAuth";
import { launchFeatureEnabled } from "@/lib/launchFeatures";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);

    if (!launchFeatureEnabled(process.env.STRIPE_IDENTITY_ENABLED)) {
      return NextResponse.json(
        { error: "Identity verification is not required during launch testing" },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const returnUrl = `${trustedAppOrigin(req)}/verify/return`;

    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        user_id: user.id,
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

    if (err?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json(
      { error: err?.message || "Failed to create identity session" },
      { status: 500 }
    );
  }
}
