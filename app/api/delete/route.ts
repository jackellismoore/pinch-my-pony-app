import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

    await admin.from("profiles").delete().eq("id", userId);
    await admin.from("borrow_requests").delete().eq("borrower_id", userId);
    await admin.from("horses").delete().eq("owner_id", userId);
    await admin
      .from("messages")
      .delete()
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);

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