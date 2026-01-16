"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { isAdminUser } from "../../../lib/isAdmin";

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

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
      setMsg("❌ Admins only");
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const { data, error } = await supabase
      .from("souls")
      .select(`
        name,
        phone,
        won_on,
        profiles:evangelist_id ( full_name )
      `)
      .order("won_on", { ascending: false });

    if (error) {
      setMsg(error.message);
    } else {
      setRows(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="p-6">Loading...</p>;
  if (!isAdmin) return <p className="p-6">{msg}</p>;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Reports</h1>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Phone</th>
            <th className="p-2">Date</th>
            <th className="p-2">Evangelist</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.phone ?? "-"}</td>
              <td className="p-2">{r.won_on}</td>
              <td className="p-2">{r.profiles?.full_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
