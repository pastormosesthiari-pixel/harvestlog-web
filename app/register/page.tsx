"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    // 1) Create auth user
    const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName, phone },
  },
});

    if (error) {
      setLoading(false);
      setMsg("❌ " + error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setLoading(false);
      setMsg("❌ Registration created, but no user id returned. Try logging in.");
      return;
    }
setLoading(false);
setMsg("✅ Registered. Wait for approval, then login at /login");

    // 2) Create profile row (approved = false by default)
    
  };

  return (
    <main style={{ padding: 20, maxWidth: 480 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Register (Evangelist)</h1>

      <form onSubmit={onRegister} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <label>
          Full name
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </label>

        <label>
          Phone
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254..."
          />
        </label>

        <label>
          Email
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>

        <label>
          Password
          <input
            style={{ width: "100%", padding: 10, marginTop: 6 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>

        <button disabled={loading} style={{ padding: 12, cursor: "pointer" }}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Already registered? Go to <a href="/login">/login</a>
      </p>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
