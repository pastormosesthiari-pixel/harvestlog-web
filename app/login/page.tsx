"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const next = params.get("next") || "/dashboard";

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMsg("❌ " + error.message);
        return;
      }

      if (!data.session) {
        setMsg("❌ Login failed: no session returned.");
        return;
      }

      // Force navigation after success
      router.replace(next);
      router.refresh();
    } catch (err: any) {
      setMsg("❌ " + (err?.message ?? "Unknown error"));
    } finally {
      // IMPORTANT: always stop the spinner
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto mt-10 max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold tracking-tight">Login</h1>

      <form onSubmit={onLogin} className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-semibold">Email</label>
          <input
            className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
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
            autoComplete="current-password"
          />
        </div>

        {msg && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
            {msg}
          </div>
        )}

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
