"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { isAdminUser } from "../../../lib/isAdmin";

type AuditRow = {
  id: number;
  evangelist_id: string;
  approved: boolean;
  action_by: string;
  action_at: string;
  evangelist_name?: string;
  admin_name?: string;
};

type ProfileMini = {
  id: string;
  full_name: string;
};

export default function AdminAuditPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [from, setFrom] = useState(() => {
    const d = new Date();
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    return first.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMini[]>([]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of profiles) map.set(p.id, p.full_name);
    return map;
  }, [profiles]);

  const load = async () => {
    setLoading(true);
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      setMsg("❌ Not logged in. Go to /login");
      setLoading(false);
      return;
    }

    const admin = await isAdminUser(user.id);
    if (!admin) {
      setMsg("❌ Access denied. Admins only.");
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    // Load names (evangelists + admins) for display
    const { data: profs, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (profErr) {
      setMsg("❌ Could not load profiles for names: " + profErr.message);
      setLoading(false);
      return;
    }

    setProfiles((profs as ProfileMini[]) ?? []);

    // We filter by datetime range for action_at:
    const fromDT = `${from}T00:00:00.000Z`;
    const toDT = `${to}T23:59:59.999Z`;

    const { data: logs, error: logErr } = await supabase
      .from("approval_logs")
      .select("id, evangelist_id, approved, action_by, action_at")
      .gte("action_at", fromDT)
      .lte("action_at", toDT)
      .order("action_at", { ascending: false });

    if (logErr) {
      setMsg("❌ Could not load audit logs: " + logErr.message);
      setAudit([]);
      setLoading(false);
      return;
    }

    const rows = ((logs as AuditRow[]) ?? []).map((r) => ({
      ...r,
      evangelist_name: nameById.get(r.evangelist_id) ?? r.evangelist_id,
      admin_name: nameById.get(r.action_by) ?? r.action_by,
    }));

    setAudit(rows);
    setLoading(false);
  };

  // refresh computed names after profiles load
  useEffect(() => {
    // no-op: load() rebuilds rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCSV = () => {
    const headers = ["action_at", "evangelist", "action", "by_admin"];
    const lines = [headers.join(",")];

    for (const r of audit) {
      const action = r.approved ? "APPROVED" : "UNAPPROVED";
      lines.push(
        [
          csvSafe(new Date(r.action_at).toISOString()),
          csvSafe(r.evangelist_name ?? r.evangelist_id),
          csvSafe(action),
          csvSafe(r.admin_name ?? r.action_by),
        ].join(",")
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `harvestlog-approval-audit-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <main className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Approval Audit Log</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track who approved/unapproved evangelists and when.
          </p>
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
            <h2 className="text-lg font-bold">Audit Events</h2>

            <div className="mt-4 overflow-auto">
              {audit.length === 0 ? (
                <p className="text-sm text-gray-500">No audit events in this range.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2">Time</th>
                      <th>Evangelist</th>
                      <th>Action</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2">{new Date(r.action_at).toLocaleString()}</td>
                        <td className="font-medium">{r.evangelist_name ?? r.evangelist_id}</td>
                        <td className={r.approved ? "font-semibold" : "font-semibold"}>
                          {r.approved ? "APPROVED" : "UNAPPROVED"}
                        </td>
                        <td>{r.admin_name ?? r.action_by}</td>
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
