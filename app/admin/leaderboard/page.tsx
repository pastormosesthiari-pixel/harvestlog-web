"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type ProfileMini = {
  id: string;
  full_name: string;
  role: "admin" | "evangelist";
  approved?: boolean;
};

type SoulMini = {
  id: string;
  evangelist_id: string;
  name: string;
  phone: string | null;
  won_on: string;
  created_at: string;
};

export default function AdminLeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [from, setFrom] = useState(() => {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    return first.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const [profiles, setProfiles] = useState<ProfileMini[]>([]);
  const [souls, setSouls] = useState<SoulMini[]>([]);

  const evangelistNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of profiles) map.set(p.id, p.full_name);
    return map;
  }, [profiles]);

  const leaderboard = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of souls) {
      counts.set(s.evangelist_id, (counts.get(s.evangelist_id) ?? 0) + 1);
    }
    const rows = Array.from(counts.entries()).map(([evangelist_id, count]) => ({
      evangelist_id,
      evangelist: evangelistNameById.get(evangelist_id) ?? "Unknown",
      count,
    }));
    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [souls, evangelistNameById]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const load = async () => {
    setMsg(null);
    setLoading(true);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      setLoading(false);
      setMsg("❌ Not logged in. Go to /login");
      return;
    }

    // confirm admin
    const { data: myProf, error: myErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (myErr) {
      setLoading(false);
      setMsg("❌ Could not load your profile: " + myErr.message);
      return;
    }

    if (myProf?.role !== "admin") {
      setIsAdmin(false);
      setLoading(false);
      setMsg("❌ Access denied. Admins only.");
      return;
    }

    setIsAdmin(true);

    // load evangelists for names
    const { data: profs, error: profsErr } = await supabase
      .from("profiles")
      .select("id, full_name, role, approved")
      .eq("role", "evangelist")
      .order("full_name", { ascending: true });

    if (profsErr) {
      setLoading(false);
      setMsg("❌ Could not load evangelists: " + profsErr.message);
      return;
    }

    setProfiles((profs as ProfileMini[]) ?? []);

    // souls in date range
    const { data: soulsRows, error: soulsErr } = await supabase
      .from("souls")
      .select("id, evangelist_id, name, phone, won_on, created_at")
      .gte("won_on", from)
      .lte("won_on", to);

    setLoading(false);

    if (soulsErr) setMsg("❌ Could not load souls: " + soulsErr.message);
    else setSouls((soulsRows as SoulMini[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCSV = () => {
    const headers = ["evangelist", "souls_count", "from", "to"];
    const lines = [headers.join(",")];

    for (const r of leaderboard) {
      lines.push([csvSafe(r.evangelist), r.count, from, to].join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `harvestlog-leaderboard-${from}-to-${to}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Evangelist Leaderboard</h1>
          <p className="mt-1 text-sm text-gray-600">Top soul winners in a selected date range.</p>
        </div>

        <button
          onClick={logout}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Logout
        </button>
      </div>

      {msg && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading...</p>
      ) : !isAdmin ? (
        <p className="text-sm text-gray-600">Admins only.</p>
      ) : (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">From</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold">To</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={load}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Apply
                </button>

                <button
                  onClick={exportCSV}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Leaderboard</h2>

            <div className="mt-4 overflow-auto">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-gray-500">No data for this range.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2">Rank</th>
                      <th>Evangelist</th>
                      <th>Souls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((r, idx) => (
                      <tr key={r.evangelist_id} className="border-b last:border-0">
                        <td className="py-2 font-semibold">{idx + 1}</td>
                        <td className="font-medium">{r.evangelist}</td>
                        <td className="font-semibold">{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function csvSafe(v: string) {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}
