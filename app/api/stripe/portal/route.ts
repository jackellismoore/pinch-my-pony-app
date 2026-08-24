import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { requireApiUser, trustedAppOrigin } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await requireApiUser(req);
    const admin = getSupabaseAdmin();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account was found" }, { status: 404 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${trustedAppOrigin(req)}/dashboard/membership`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    if (error?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Stripe portal error:", error);
    return NextResponse.json({ error: "We couldn’t open billing settings" }, { status: 500 });
  }
}
