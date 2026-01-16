"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { isAdminUser } from "../../../lib/isAdmin";

export default function AdminLeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      setMsg("Not logged in");
      setLoading(false);
      return;
    }

    const admin = await isAdminUser(user.id);
    if (!admin) {
      setMsg("Admins only");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("leaderboard");

    if (error) setMsg(error.message);
    else setRows(data ?? []);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="p-6">Loading...</p>;
  if (msg) return <p className="p-6">{msg}</p>;

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Evangelist Leaderboard</h1>

      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">Evangelist</th>
            <th className="p-2">Souls</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => (
            <tr key={i} className="border-t">
              <td className="p-2">{r.evangelist}</td>
              <td className="p-2">{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
