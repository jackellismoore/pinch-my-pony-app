import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const KEEP_EMAIL = "owner@test.com";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing access token." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    const callerEmail = callerData.user?.email?.trim().toLowerCase() ?? "";

    if (callerError || !callerData.user || callerEmail !== KEEP_EMAIL) {
      return NextResponse.json({ error: "Only owner@test.com can run this reset." }, { status: 403 });
    }

    const usersToDelete: Array<{ id: string; email: string }> = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const users = data.users ?? [];
      for (const user of users) {
        const email = user.email?.trim().toLowerCase() ?? "";
        if (email !== KEEP_EMAIL) {
          usersToDelete.push({ id: user.id, email });
        }
      }

      if (users.length < perPage) break;
      page += 1;
    }

    const deleted: string[] = [];
    const failed: Array<{ email: string; error: string }> = [];

    for (const user of usersToDelete) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) {
        failed.push({ email: user.email || user.id, error: error.message });
      } else {
        deleted.push(user.email || user.id);
      }
    }

    return NextResponse.json({
      kept: KEEP_EMAIL,
      deletedCount: deleted.length,
      deleted,
      failed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to reset test accounts." },
      { status: 500 }
    );
  }
}
