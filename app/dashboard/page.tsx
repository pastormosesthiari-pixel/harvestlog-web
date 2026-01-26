"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadSession() {
    setLoading(true);
    setMsg(null);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? null);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to load session.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setMsg(null);
    try {
      await supabase.auth.signOut();

      // Force-clear browser state (prevents “dashboard appears once then breaks”)
      localStorage.clear();
      sessionStorage.clear();

      router.replace("/login");
    } catch (e: any) {
      setMsg(e?.message ?? "Logout failed");
    }
  }

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ maxWidth: 700, margin: "40px auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 30, fontWeight: 900 }}>Dashboard</h1>
        <button
          onClick={logout}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Logout
        </button>
      </div>

      {loading && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#EFF6FF" }}>
          Loading session...
        </div>
      )}

      {msg && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#FEF3C7" }}>
          ❌ {msg}
        </div>
      )}

      {!loading && !msg && (
        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: 16 }}>
            ✅ You are logged in as: <b>{email ?? "Unknown"}</b>
          </p>
          <p style={{ marginTop: 8, opacity: 0.7 }}>
            This is the “stable base”. Next we re-add souls, roles, and approvals carefully.
          </p>
        </div>
      )}
    </main>
  );
}
