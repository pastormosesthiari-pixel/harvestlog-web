// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { getBearerToken, supabaseAdmin, supabaseVerify } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const { data: userData, error: userErr } = await supabaseVerify.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = userData.user;

    const { data: membership, error: mErr } = await supabaseAdmin
      .from("memberships")
      .select("church_id, branch_id, role, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    if (!membership) return NextResponse.json({ error: "No membership found for this user" }, { status: 403 });

    const church_id = membership.church_id;
    const branch_id = membership.branch_id;

    // Basic dashboard data: souls for this church/branch
    // (If you want branch-specific, keep branch_id filter; if church-wide, remove branch_id filter)
    const { data: souls, error: sErr } = await supabaseAdmin
      .from("souls")
      .select("*")
      .eq("church_id", church_id)
      .eq("branch_id", branch_id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      membership,
      souls: souls ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
