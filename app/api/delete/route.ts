import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing access token." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    const {
      data: { user },
      error: userErr,
    } = await admin.auth.getUser(token);

    if (userErr || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const userId = user.id;

    const { data: billingProfile, error: billingLookupError } = await admin
      .from("profiles")
      .select("stripe_subscription_id")
      .eq("id", userId)
      .maybeSingle();
    if (billingLookupError) throw billingLookupError;

    if (billingProfile?.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.cancel(billingProfile.stripe_subscription_id);
      } catch (stripeError: any) {
        if (stripeError?.code !== "resource_missing") {
          throw new Error("We couldn’t cancel the active membership. Please try again before deleting your account.");
        }
      }
    }

    const { data: ownedHorses, error: horseLookupError } = await admin
      .from("horses")
      .select("id")
      .eq("owner_id", userId);
    if (horseLookupError) throw horseLookupError;

    const horseIds = (ownedHorses ?? []).map((horse) => horse.id);

    const deletions = [
      admin.from("messages").delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
      admin.from("reviews").delete().or(`borrower_id.eq.${userId},owner_id.eq.${userId}`),
      admin.from("push_subscriptions").delete().eq("user_id", userId),
      admin.from("notification_preferences").delete().eq("user_id", userId),
      admin.from("identity_verifications").delete().eq("user_id", userId),
      admin.from("borrow_requests").delete().eq("borrower_id", userId),
      ...(horseIds.length
        ? [
            admin.from("horse_unavailability").delete().in("horse_id", horseIds),
            admin.from("borrow_requests").delete().in("horse_id", horseIds),
          ]
        : []),
      admin.from("horses").delete().eq("owner_id", userId),
      admin.from("profiles").delete().eq("id", userId),
    ];

    for (const operation of deletions) {
      const { error } = await operation;
      if (error) throw error;
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to delete account." },
      { status: 500 }
    );
  }
}
