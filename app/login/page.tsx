"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Confirm session exists
      if (!data.session?.access_token) throw new Error("No session token returned.");

      router.push("/dashboard");
    } catch (err: any) {
      setMsg(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "60px auto", padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>Login</h1>
      <p>Sign in to HarvestLog.</p>

      {msg && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "#FEF3C7" }}>
          ❌ {msg}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: 20 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          style={{ width: "100%", padding: 10, marginBottom: 16 }}
        />

        <label style={{ display: "block", marginBottom: 6 }}>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          style={{ width: "100%", padding: 10, marginBottom: 16 }}
        />

        <button
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            background: "#0F172A",
            color: "white",
            fontWeight: 700,
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
