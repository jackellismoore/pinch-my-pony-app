import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Body = { plan: "borrower" | "owner" };

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (body.plan !== "borrower" && body.plan !== "owner") {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const priceId =
      body.plan === "borrower"
        ? process.env.STRIPE_PRICE_BORROWER_GBP_MONTHLY
        : process.env.STRIPE_PRICE_OWNER_GBP_MONTHLY;

    if (!priceId) {
      return NextResponse.json({ error: "Missing Stripe price ID env var." }, { status: 500 });
    }

    // Client sends Supabase access token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!token) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data: userData, error: userErr } = await admin.auth.getUser(token);

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const user = userData.user;

    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("beta_access,stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    // 🔒 Keep memberships OFF until you intentionally enable.
    if (!profile?.beta_access) {
      return NextResponse.json(
        { error: "Memberships are not enabled yet." },
        { status: 403 }
      );
    }

    let customerId = (profile?.stripe_customer_id as string | null) ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });

      customerId = customer.id;

      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl()}/membership?success=1`,
      cancel_url: `${appUrl()}/membership?canceled=1`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan: body.plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Checkout failed." },
      { status: 500 }
    );
  }
}