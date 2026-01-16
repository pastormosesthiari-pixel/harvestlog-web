"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type ProfileMini = {
  id: string;
  full_name: string;
  role: "admin" | "evangelist";
};

type SoulMini = {
  id: string;
  evangelist_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  residence: string | null;
  notes: string | null;
  won_on: string;
  created_at: string;
};

export default function AdminReportsPage() {
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

  const totals = useMemo(() => {
    return {
      totalSouls: souls.length,
      uniqueEvangelists: new Set(souls.map((s) => s.evangelist_id)).size,
    };
  }, [souls]);

  const soulsPerEvangelist = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of souls) counts.set(s.evangelist_id, (counts.get(s.evangelist_id) ?? 0) + 1);

    const rows = Array.from(counts.entries()).map(([evangelist_id, count]) => ({
      evangelist_id,
      name: evangelistNameById.get(evangelist_id) ?? "Unknown",
      count,
    }));

    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [souls, evangelistNameById]);

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

    // Load evangelists (for names)
    const { data: profs, error: profsErr } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("role", "evangelist")
      .order("full_name", { ascending: true });

    if (profsErr) {
      setLoading(false);
      setMsg("❌ Could not load evangelists: " + profsErr.message);
      return;
    }

    setProfiles((profs as ProfileMini[]) ?? []);

    // Load souls for date range
    const { data: soulsRows, error: soulsErr } = await supabase
      .from("souls")
      .select("id, evangelist_id, name, phone, email, residence, notes, won_on, created_at")
      .gte("won_on", from)
      .lte("won_on", to)
      .order("won_on", { ascending: false });

    setLoading(false);

    if (soulsErr) setMsg("❌ Could not load souls: " + soulsErr.message);
    else setSouls((soulsRows as SoulMini[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCSV = () => {
    const headers = ["won_on", "name", "phone", "email", "residence", "notes", "evangelist"];
    const lines: string[] = [headers.map(csvSafe).join(",")];

    for (const s of souls) {
      const evName = evangelistNameById.get(s.evangelist_id) ?? "Unknown";
      lines.push(
        [s.won_on, s.name, s.phone ?? "", s.email ?? "", s.residence ?? "", s.notes ?? "", evName]
          .map(csvSafe)
          .join(",")
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `harvestlog-report-${from}-to-${to}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Admin Reports</h1>
            <p className="mt-1 text-sm text-gray-600">
              View souls won by date range, and performance per evangelist.
            </p>
          </div>

          <a
            href="/logout"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 shadow-sm"
          >
            Logout
          </a>
        </div>

        {msg && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
            {msg}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        ) : !isAdmin ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Admins only.</p>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-700">From</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-gray-700">To</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={load}
                    className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 shadow-sm"
                  >
                    Apply
                  </button>

                  <button
                    onClick={exportCSV}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold hover:bg-gray-50 shadow-sm"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <StatCard label="Total souls (range)" value={totals.totalSouls} />
                <StatCard label="Evangelists active" value={totals.uniqueEvangelists} />
                <StatCard label="Date range" value={`${from} → ${to}`} />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900">Souls per Evangelist</h2>
                <p className="mt-1 text-sm text-gray-600">Top performers in the selected date range.</p>
              </div>

              <div className="px-6 pb-6 overflow-auto">
                {soulsPerEvangelist.length === 0 ? (
                  <p className="text-sm text-gray-500">No data for this range.</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-600">
                        <th className="py-3 px-3 font-semibold">Evangelist</th>
                        <th className="py-3 px-3 font-semibold">Souls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {soulsPerEvangelist.map((r, idx) => (
                        <tr
                          key={r.evangelist_id}
                          className={`border-t border-gray-100 hover:bg-gray-50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                          }`}
                        >
                          <td className="py-3 px-3 font-medium text-gray-900">{r.name}</td>
                          <td className="py-3 px-3 font-semibold text-gray-900">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900">Recent Souls (Range)</h2>
                <p className="mt-1 text-sm text-gray-600">Most recent records in the selected date range.</p>
              </div>

              <div className="px-6 pb-6 overflow-auto">
                {souls.length === 0 ? (
                  <p className="text-sm text-gray-500">No records for this range.</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-600">
                        <th className="py-3 px-3 font-semibold">Date</th>
                        <th className="py-3 px-3 font-semibold">Name</th>
                        <th className="py-3 px-3 font-semibold">Phone</th>
                        <th className="py-3 px-3 font-semibold">Email</th>
                        <th className="py-3 px-3 font-semibold">Residence</th>
                        <th className="py-3 px-3 font-semibold">Notes</th>
                        <th className="py-3 px-3 font-semibold">Evangelist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {souls.map((s, idx) => (
                        <tr
                          key={s.id}
                          className={`border-t border-gray-100 hover:bg-gray-50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                          }`}
                        >
                          <td className="py-3 px-3 text-gray-900 whitespace-nowrap">{s.won_on}</td>
                          <td className="py-3 px-3 font-medium text-gray-900 whitespace-nowrap">{s.name}</td>
                          <td className="py-3 px-3 text-gray-900 whitespace-nowrap">{s.phone ?? "-"}</td>
                          <td className="py-3 px-3 text-gray-900 whitespace-nowrap">{s.email ?? "-"}</td>
                          <td className="py-3 px-3 text-gray-900 whitespace-nowrap">{s.residence ?? "-"}</td>
                          <td className="py-3 px-3 text-gray-900 min-w-[220px]">{s.notes ?? "-"}</td>
                          <td className="py-3 px-3 text-gray-900 whitespace-nowrap">
                            {evangelistNameById.get(s.evangelist_id) ?? "Unknown"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

function csvSafe(v: any) {
  const s = String(v ?? "").replace(/"/g, '""');
  return `"${s}"`;
}
