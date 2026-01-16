"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Role = "admin" | "evangelist" | null;

export default function NavBar() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      setLoggedIn(!!user);

      if (!user) {
        setRole(null);
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        setRole(null);
        return;
      }

      setRole(prof?.role ?? null);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <a href="/" className="font-extrabold tracking-tight text-lg">
          HarvestLog
        </a>

        <a
          href="/dashboard"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Dashboard
        </a>

        {role === "admin" && (
          <a
            href="/admin"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Admin
          </a>
        )}

        <div className="ml-auto flex items-center gap-3">
          {!loggedIn ? (
            <>
              <a
                href="/login"
                className="text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                Login
              </a>
              <a
                href="/register"
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Register
              </a>
            </>
          ) : (
            <a
  href="/logout"
  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
>
  Logout
</a>
          )}
        </div>
      </nav>
    </header>
  );
}
