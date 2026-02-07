"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

type UserMini = {
  name?: string;
  role?: string;
};

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/souls", label: "Souls" },
  { href: "/souls/new", label: "Add Soul" },
  { href: "/evangelists", label: "Evangelists" },
  { href: "/analytics", label: "Analytics" },
  { href: "/profile", label: "Profile" },
];

export default function AppShell({
  user,
  onLogout,
  children,
}: {
  user?: UserMini;
  onLogout?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="hl-container">
      {/* Sidebar */}
      <aside className="hl-sidebar">
        <div className="hl-brand">
          <div className="hl-brandMark">♡</div>
          <div>
            <div className="hl-brandTitle">HarvestLog</div>
            <div className="hl-brandSub">Evangelism Tracker</div>
          </div>
        </div>

        <nav className="hl-nav">
          {NAV.map((n) => {
            const active =
              pathname === n.href ||
              (n.href !== "/dashboard" && pathname.startsWith(n.href));

            return (
              <Link
                key={n.href}
                href={n.href}
                className={`hl-navItem ${
                  active ? "hl-navItemActive" : ""
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="hl-sidebarFooter">
          <div className="hl-userMini">
            <div className="hl-avatar">
              <span style={{ fontWeight: 800 }}>
                {(user?.name?.[0] || "P").toUpperCase()}
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="hl-userName">
                {user?.name || "Pastor Moses"}
              </div>
              <div className="hl-userRole">
                {user?.role || "Admin"}
              </div>
            </div>
          </div>

          <button className="hl-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="hl-main">
        <div className="hl-topbar">
          <button className="hl-btn" onClick={onLogout}>
            Logout
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}
