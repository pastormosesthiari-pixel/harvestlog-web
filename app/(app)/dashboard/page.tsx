// app/(app)/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getActiveChurchId } from "@/lib/getActiveChurchId";
import { getRecentSouls, getSoulsByBranch, getSoulsCounts } from "@/lib/queries/soulsDashboard";

type RecentSoul = {
  id: string;
  name: string;
  phone: string | null;
  residence: string | null;
  notes: string | null;
  won_on: string;
  created_at: string;
  branch_id: string | null;
  evangelist_user_id: string;
};

export default function DashboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);

  const [counts, setCounts] = useState<{ today: number; week: number; month: number } | null>(null);
  const [recent, setRecent] = useState<RecentSoul[]>([]);
  const [byBranch, setByBranch] = useState<{ label: string; souls: number }[]>([]);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!userData.user) {
          // if your auth redirects elsewhere, keep it simple
          window.location.href = "/login";
          return;
        }

        const activeChurchId = await getActiveChurchId(supabase);
        if (cancelled) return;

        setChurchId(activeChurchId);

        const [c, r, b] = await Promise.all([
          getSoulsCounts(supabase, activeChurchId),
          getRecentSouls(supabase, activeChurchId),
          getSoulsByBranch(supabase, activeChurchId),
        ]);

        if (cancelled) return;

        setCounts(c);
        setRecent(r);
        setByBranch(b);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Something went wrong.");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {churchId ? <>Active church: <span className="font-mono">{churchId}</span></> : "Resolving church…"}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm">
          <div className="font-semibold text-red-700">Error</div>
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border p-6">Loading…</div>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Souls Today" value={counts?.today ?? 0} />
            <StatCard title="This Week" value={counts?.week ?? 0} />
            <StatCard title="This Month" value={counts?.month ?? 0} />
          </div>

          {/* By Branch */}
          <div className="rounded-2xl border p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Souls by Branch</h2>
            </div>

            {byBranch.length === 0 ? (
              <div className="text-sm text-muted-foreground mt-3">No data yet.</div>
            ) : (
              <div className="mt-4 space-y-2">
                {byBranch.slice(0, 10).map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="font-semibold">{row.souls}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Souls */}
          <div className="rounded-2xl border p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Souls</h2>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr className="border-b">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Residence</th>
                    <th className="py-2 pr-4">Won On</th>
                    <th className="py-2 pr-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-muted-foreground">
                        No souls recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recent.map((s) => (
                      <tr key={s.id} className="border-b last:border-b-0">
                        <td className="py-2 pr-4 font-medium">{s.name}</td>
                        <td className="py-2 pr-4">{s.phone ?? "-"}</td>
                        <td className="py-2 pr-4">{s.residence ?? "-"}</td>
                        <td className="py-2 pr-4">{s.won_on}</td>
                        <td className="py-2 pr-4">{s.notes ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
