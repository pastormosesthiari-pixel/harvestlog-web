"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type DashboardData = {
  user: { id: string; email: string | null };
  membership: any;
  souls: any[];
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/dashboard", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load dashboard");

      setData(json);
    } catch (e: any) {
      setError(e?.message ?? "Timed out while loading dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: "40px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 800 }}>Dashboard</h1>
          <div style={{ opacity: 0.7 }}>Status: Check message below</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={load} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Refresh
          </button>
          <button onClick={logout} style={{ padding: "10px 14px", borderRadius: 10 }}>
            Logout
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: "#EFF6FF" }}>
          Loading dashboard...
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: "#FEF3C7" }}>
          ❌ {error}
        </div>
      )}

      {!loading && !error && data && (
        <div style={{ marginTop: 20 }}>
          <div style={{ padding: 16, borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <div><b>User:</b> {data.user.email}</div>
            <div><b>Role:</b> {data.membership?.role}</div>
            <div><b>Church:</b> {data.membership?.church_id}</div>
            <div><b>Branch:</b> {data.membership?.branch_id}</div>
            <div style={{ marginTop: 10 }}><b>Souls loaded:</b> {data.souls?.length ?? 0}</div>
          </div>

          <div style={{ marginTop: 20, padding: 16, borderRadius: 12, border: "1px solid #e5e7eb" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Recent Souls</h2>
            {(data.souls ?? []).slice(0, 10).map((s: any) => (
              <div key={s.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ fontWeight: 700 }}>{s.name ?? "Unknown"}</div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>{s.created_at}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
