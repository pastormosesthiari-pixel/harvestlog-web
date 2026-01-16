"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [status, setStatus] = useState("Checking Supabase connection...");

  useEffect(() => {
    supabase.auth.getSession().then(({ error, data }) => {
      if (error) {
        setStatus("❌ Supabase error: " + error.message);
      } else {
        setStatus(
          "✅ Supabase connected. Session: " +
            (data.session ? "Logged in" : "Not logged in")
        );
      }
    });
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1>HarvestLog</h1>
      <p>{status}</p>
    </main>
  );
}
