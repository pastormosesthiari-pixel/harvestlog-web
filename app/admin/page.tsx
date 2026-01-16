"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { isAdminUser } from "../../lib/isAdmin";

type Evangelist = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [evangelists, setEvangelists] = useState<Evangelist[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      setMsg("❌ Not logged in");
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

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, approved, approved_by, approved_at")
      .eq("role", "evangelist")
      .order("created_at", { ascending: false });

    if (error) setMsg("❌ Could not load evangelists: " + error.message);
    else setEvangelists((data as Evangelist[]) ?? []);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setApproval = async (evangelistId: string, approve: boolean) => {
    setMsg(null);
    setBusyId(evangelistId);

    const { data: sess } = await supabase.auth.getSession();
    const adminUser = sess.session?.user;

    if (!adminUser) {
      setMsg("❌ You are not logged in.");
      setBusyId(null);
      return;
    }

    // 1) Update profile approval fields
    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        approved: approve,
        approved_by: approve ? adminUser.id : null,
        approved_at: approve ? new Date().toISOString() : null,
      })
      .eq("id", evangelistId);

    if (profErr) {
      setMsg("❌ Could not update approval: " + profErr.message);
      setBusyId(null);
      return;
    }

    // 2) Insert audit log row
    const { error: logErr } = await supabase.from("approval_logs").insert({
      evangelist_id: evangelistId,
      approved: approve,
      action_by: adminUser.id,
    });

    if (logErr) {
      // profile already updated, so don't block admin; just show warning
      setMsg("⚠️ Approved, but could not write audit log: " + logErr.message);
    } else {
      setMsg(approve ? "✅ Evangelist approved." : "✅ Evangelist unapproved.");
    }

    setBusyId(null);
    load();
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!isAdmin) return <p className="p-6">{msg}</p>;

  return (
    <main className="mt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Evangelist Approval</h1>
        <p className="mt-1 text-sm text-gray-600">
          Approve evangelists before they can record souls. All actions are logged.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {evangelists.length === 0 ? (
          <p className="text-sm text-gray-600">No evangelists found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Approved at</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {evangelists.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{e.full_name}</td>
                    <td>{e.email}</td>
                    <td>{e.phone ?? "-"}</td>
                    <td className="font-semibold">
                      {e.approved ? "Approved" : "Pending"}
                    </td>
                    <td>{e.approved_at ? new Date(e.approved_at).toLocaleString() : "-"}</td>
                    <td>
                      {e.approved ? (
                        <button
                          disabled={busyId === e.id}
                          onClick={() => setApproval(e.id, false)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold hover:bg-gray-50 disabled:opacity-60"
                        >
                          {busyId === e.id ? "Working..." : "Unapprove"}
                        </button>
                      ) : (
                        <button
                          disabled={busyId === e.id}
                          onClick={() => setApproval(e.id, true)}
                          className="rounded-lg bg-green-600 px-3 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          {busyId === e.id ? "Working..." : "Approve"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-sm text-gray-500">
        Next: we’ll add a page to view the audit logs (who approved who & when).
      </p>
    </main>
  );
}
