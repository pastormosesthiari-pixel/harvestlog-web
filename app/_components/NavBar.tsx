"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { isAdminUser } from "../../lib/isAdmin";

export default function NavBar() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        setLoggedIn(false);
        setIsAdmin(false);
        return;
      }

      setLoggedIn(true);
      const admin = await isAdminUser(user.id);
      setIsAdmin(admin);
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
    <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        {/* Brand */}
        <a href="/" className="text-lg font-extrabold tracking-tight">
          HarvestLog
        </a>

        {/* Common */}
        {loggedIn && (
          <a
            href="/dashboard"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Dashboard
          </a>
        )}

        {/* Admin Links */}
        {loggedIn && isAdmin && (
          <>
            <a
              href="/admin"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Approvals
            </a>

            <a
              href="/admin/reports"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Reports
            </a>

            <a
              href="/admin/leaderboard"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Leaderboard
            </a>

            <a
              href="/admin/audit"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Audit
            </a>
          </>
        )}

        {/* Right side */}
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
            <button
              onClick={logout}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
