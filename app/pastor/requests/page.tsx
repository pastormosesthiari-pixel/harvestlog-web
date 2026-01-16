"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type Membership = {
  church_id: string;
  role: "super_admin" | "pastor_admin" | "branch_admin" | "evangelist";
  status: "active" | "pending" | "disabled";
};

type ReqRow = {
  id: number;
  user_id: string;
  church_id: string;
  branch_id: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Branch = { id: string; name: string; church_id: string };

export default function PastorRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [churchId, setChurchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [requests, setRequests] = useState<ReqRow[]>([]);

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    branches.forEach((b) => m.set(b.id, b.name));
    return m;
  }, [branches]);

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

    const { data: mems, error: memErr } = await supabase
      .from("memberships")
      .select("church_id, role, status")
      .eq("user_id", user.id);

    if (memErr) {
      setMsg("❌ Could not load memberships: " + memErr.message);
      setLoading(false);
      return;
    }

    const rows = (mems as Membership[]) ?? [];
    const adminMem =
      rows.find((m) => m.role === "pastor_admin" && m.status === "active") ??
      rows.find((m) => m.role === "super_admin" && m.status === "active");

    if (!adminMem) {
      setMsg("❌ Access denied. Pastor Admins only.");
      setLoading(false);
      return;
    }

    setChurchId(adminMem.church_id);

    const { data: br, error: brErr } = await supabase
      .from("branches")
      .select("id, name, church_id")
      .eq("church_id", adminMem.church_id)
      .order("name", { ascending: true });

    if (brErr) {
      setMsg("❌ Could not load branches: " + brErr.message);
      setLoading(false);
      return;
    }

    setBranches((br as Branch[]) ?? []);

    const { data: reqs, error: reqErr } = await supabase
      .from("access_requests")
      .select("id, user_id, church_id, branch_id, note, status, created_at")
      .eq("church_id", adminMem.church_id)
      .order("created_at", { ascending: false });

    if (reqErr) {
      setMsg("❌ Could not load requests: " + reqErr.message);
      setLoading(false);
      return;
    }

    setRequests((reqs as ReqRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (r: ReqRow, branchId: string | null) => {
    setMsg(null);

    if (!churchId) return;

    // 1) Create/Update evangelist membership
    const { error: memUpErr } = await supabase.from("memberships").upsert(
      {
        user_id: r.user_id,
        church_id: r.church_id,
        branch_id: branchId ?? r.branch_id ?? null,
        role: "evangelist",
        status: "active",
      },
      { onConflict: "user_id,church_id,role" }
    );

    if (memUpErr) {
      setMsg("❌ Could not assign membership: " + memUpErr.message);
      return;
    }

    // 2) Approve in profiles
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ approved: true })
      .eq("id", r.user_id);

    if (profErr) {
      setMsg("❌ Could not approve profile: " + profErr.message);
      return;
    }

    // 3) Mark request approved
    const { data: sess } = await supabase.auth.getSession();
    const adminUser = sess.session?.user;

    const { error: reqErr } = await supabase
      .from("access_requests")
      .update({
        status: "approved",
        handled_at: new Date().toISOString(),
        handled_by: adminUser?.id ?? null,
        branch_id: branchId ?? r.branch_id ?? null,
      })
      .eq("id", r.id);

    if (reqErr) {
      setMsg("⚠️ Approved, but request update failed: " + reqErr.message);
    } else {
      setMsg("✅ Approved and assigned.");
    }

    load();
  };

  const reject = async (r: ReqRow) => {
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const adminUser = sess.session?.user;

    const { error } = await supabase
      .from("access_requests")
      .update({
        status: "rejected",
        handled_at: new Date().toISOString(),
        handled_by: adminUser?.id ?? null,
      })
      .eq("id", r.id);

    if (error) setMsg("❌ Could not reject: " + error.message);
    else setMsg("✅ Rejected.");

    load();
  };

  return (
    <main className="mt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Access Requests</h1>
        <p className="mt-1 text-sm text-gray-600">
          Approve evangelists and assign them to a branch.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-gray-600">No requests found.</p>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2">When</th>
                  <th>User ID</th>
                  <th>Requested branch</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="font-mono text-xs">{r.user_id}</td>
                    <td>
                      {r.branch_id ? branchNameById.get(r.branch_id) ?? "Selected" : "-"}
                    </td>
                    <td className="font-semibold">{r.status.toUpperCase()}</td>
                    <td className="max-w-[280px] truncate text-gray-600">
                      {r.note ?? "-"}
                    </td>
                    <td className="py-2">
                      {r.status === "pending" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"
                            defaultValue={r.branch_id ?? ""}
                            onChange={(e) => {
                              // just keep selected in DOM; we read it on approve click
                              (e.target as any).dataset.selected = e.target.value;
                            }}
                          >
                            <option value="">Assign branch…</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>

                          <button
                            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                            onClick={(ev) => {
                              const select = (ev.currentTarget
                                .previousElementSibling as HTMLSelectElement) ?? null;
                              const selected = select?.value || null;
                              approve(r, selected);
                            }}
                          >
                            Approve
                          </button>

                          <button
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                            onClick={() => reject(r)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
