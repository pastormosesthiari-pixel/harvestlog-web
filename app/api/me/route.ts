// app/api/me/route.ts
import { NextResponse } from "next/server";
import { getBearerToken, supabaseAdmin, supabaseVerify } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const { data: userData, error: userErr } = await supabaseVerify.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = userData.user;

    // Get membership (we assume 1 active membership per user for now)
    const { data: membership, error: mErr } = await supabaseAdmin
      .from("memberships")
      .select("id, user_id, church_id, branch_id, role, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mErr) {
      return NextResponse.json({ error: mErr.message }, { status: 500 });
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      membership: membership ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
