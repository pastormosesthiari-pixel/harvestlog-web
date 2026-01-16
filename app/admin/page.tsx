"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type ProfileRow = {
  id: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "evangelist";
  approved: boolean;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<ProfileRow[]>([]);

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

    const { data: myProfile, error: myErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (myErr) {
      setLoading(false);
      setMsg("❌ Could not load profile: " + myErr.message);
      return;
    }

    if (myProfile?.role !== "admin") {
      setLoading(false);
      setMsg("❌ Access denied. Admins only.");
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, approved")
      .eq("role", "evangelist")
      .order("full_name", { ascending: true });

    setLoading(false);

    if (error) setMsg("❌ Error loading evangelists: " + error.message);
    else setRows((data as ProfileRow[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (id: string) => {
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ approved: true })
      .eq("id", id);

    if (error) setMsg("❌ Approve failed: " + error.message);
    else {
      setMsg("✅ Approved.");
      load();
    }
  };

  return (
    <main className="mt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Admin Approval</h1>
        <p className="mt-1 text-sm text-gray-600">
          Approve evangelists before they can submit records.
        </p>

        <p className="mt-2 text-sm">
          📊 Reports:{" "}
          <a
            href="/admin/reports"
            className="font-semibold underline text-gray-900"
          >
            /admin/reports
          </a>
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-600">No evangelists found.</p>
      ) : (
        <div className="overflow-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th className="pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{r.full_name}</td>
                  <td>{r.phone ?? "-"}</td>
                  <td>{r.approved ? "Approved" : "Pending"}</td>
                  <td className="pr-4">
                    {!r.approved && (
                      <button
                        onClick={() => approve(r.id)}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
