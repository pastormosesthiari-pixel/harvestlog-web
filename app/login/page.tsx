"use client";

import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMsg("❌ Login failed: " + error.message);
        return;
      }

      // Ensure session is available before redirect
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setMsg("❌ Login completed but session not found. Refresh and try again.");
        return;
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      setMsg("❌ Login failed: " + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto mt-10 max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-extrabold tracking-tight">Login</h1>
      <p className="mt-1 text-sm text-gray-600">Sign in to HarvestLog.</p>

      {msg && (
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-semibold">Email</label>
          <input
            className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold">Password</label>
          <input
            className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </div>

        <button
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-gray-600">
          No account? Go to <a className="underline" href="/register">/register</a>
        </p>
      </form>
    </main>
  );
}
