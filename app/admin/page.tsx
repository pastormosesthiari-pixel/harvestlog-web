"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { isAdminUser } from "../../lib/isAdmin";

type Evangelist = {
  id: string;
  full_name: string;
  email: string;
  approved: boolean;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [evangelists, setEvangelists] = useState<Evangelist[]>([]);

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
      .select("id, full_name, email, approved")
      .eq("role", "evangelist")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg("❌ Could not load evangelists: " + error.message);
    } else {
      setEvangelists(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved: true })
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      load();
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  if (!isAdmin) return <p className="p-6">{msg}</p>;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Evangelist Approval</h1>

      {msg && <p className="text-red-600">{msg}</p>}

      {evangelists.length === 0 ? (
        <p>No evangelists found.</p>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Status</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {evangelists.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2">{e.full_name}</td>
                <td className="p-2">{e.email}</td>
                <td className="p-2">
                  {e.approved ? "Approved" : "Pending"}
                </td>
                <td className="p-2">
                  {!e.approved && (
                    <button
                      onClick={() => approve(e.id)}
                      className="rounded bg-green-600 px-3 py-1 text-white"
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
