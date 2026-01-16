"use client";

import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function LogoutPage() {
  useEffect(() => {
    const run = async () => {
      await supabase.auth.signOut();
      window.location.href = "/login";
    };
    run();
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <p>Logging out…</p>
    </main>
  );
}
