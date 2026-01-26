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

    // Hard timeout to prevent infinite "Logging in..."
    const timeoutMs = 15000;

    try {
      const loginPromise = supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Login timed out. Check network / Supabase settings.")),
          timeoutMs
        )
      );

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

      if (error) throw error;

      if (!data?.session) {
        throw new Error("Login returned no session. Check Supabase Auth settings.");
      }

      // IMPORTANT: Do NOT fetch profile/membership here.
      // Just go to dashboard. Dashboard can load data separately.
      router.replace("/dashboard");
    } catch (err: any) {
      setMsg(err?.message ?? "Login failed");
      setLoading(false);
      return;
    } finally {
      // Ensure loading always stops
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Login</h1>
      <p style={{ marginBottom: 20 }}>Sign in to HarvestLog.</p>

      {msg && (
        <div
          style={{
            padding: 12,
            border: "1px solid #f5c2c7",
            background: "#fff3cd",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          ❌ {msg}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginBottom: 8 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="you@example.com"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ddd",
            marginBottom: 16,
          }}
        />

        <label style={{ display: "block", marginBottom: 8 }}>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="••••••••••"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #ddd",
            marginBottom: 16,
          }}
        />

        <button
          disabled={loading}
          type="submit"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: "#0b1220",
            color: "white",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div style={{ marginTop: 14 }}>
        No account? Go to <a href="/register">/register</a>
      </div>
    </div>
  );
}
