// lib/queries/soulsDashboard.ts
import type { SupabaseClient } from "@supabase/supabase-js";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getSoulsCounts(supabase: SupabaseClient, churchId: string) {
  const now = new Date();

  const todayISO = isoDate(now);
  const firstOfMonthISO = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));

  // Monday start (Kenya/UK-style week; if you prefer Sunday start, tell me)
  const day = now.getDay(); // Sun=0
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  const mondayISO = isoDate(monday);

  const [{ count: today, error: e1 }, { count: week, error: e2 }, { count: month, error: e3 }] =
    await Promise.all([
      supabase
        .from("souls")
        .select("*", { count: "exact", head: true })
        .eq("church_id", churchId)
        .eq("won_on", todayISO),

      supabase
        .from("souls")
        .select("*", { count: "exact", head: true })
        .eq("church_id", churchId)
        .gte("won_on", mondayISO),

      supabase
        .from("souls")
        .select("*", { count: "exact", head: true })
        .eq("church_id", churchId)
        .gte("won_on", firstOfMonthISO),
    ]);

  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;

  return { today: today ?? 0, week: week ?? 0, month: month ?? 0 };
}

export async function getRecentSouls(supabase: SupabaseClient, churchId: string) {
  const { data, error } = await supabase
    .from("souls")
    .select("id, name, phone, residence, notes, won_on, created_at, branch_id, evangelist_user_id")
    .eq("church_id", churchId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw error;
  return data ?? [];
}

export async function getSoulsByBranch(supabase: SupabaseClient, churchId: string) {
  // We’ll fetch branches, then count souls per branch in JS to avoid SQL views.
  const [{ data: branches, error: bErr }, { data: souls, error: sErr }] = await Promise.all([
    supabase.from("branches").select("id, name").eq("church_id", churchId).order("name", { ascending: true }),
    supabase.from("souls").select("branch_id").eq("church_id", churchId),
  ]);

  if (bErr) throw bErr;
  if (sErr) throw sErr;

  const counts = new Map<string, number>();
  for (const row of souls ?? []) {
    const key = row.branch_id ?? "__none__";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result = [
    ...(branches ?? []).map((b) => ({ label: b.name, souls: counts.get(b.id) ?? 0 })),
    { label: "(No branch)", souls: counts.get("__none__") ?? 0 },
  ];

  // highest first
  result.sort((a, b) => b.souls - a.souls);
  return result;
}
