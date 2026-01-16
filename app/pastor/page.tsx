"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Membership = {
  church_id: string;
  branch_id: string | null;
  role: "super_admin" | "pastor_admin" | "branch_admin" | "evangelist";
  status: "active" | "pending" | "disabled";
};

type Church = { id: string; name: string; slug: string };
type Branch = { id: string; church_id: string; name: string; slug: string };

type EvangelistRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  approved: boolean;
  church_id: string;
  branch_id: string | null;
  status: string;
};

export default function PastorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [church, setChurch] = useState<Church | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [evangelists, setEvangelists] = useState<EvangelistRow[]>([]);

  // create branch form
  const [branchName, setBranchName] = useState("");
  const [branchSlug, setBranchSlug] = useState("");

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    branches.forEach((b) => m.set(b.id, b.name));
    return m;
  }, [branches]);

  const pendingEvangelists = useMemo(
    () => evangelists.filter((e) => !e.approved),
    [evangelists]
  );

  const myChurchId = church?.id ?? null;

  const load = async () => {
    setLoading(true);
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      setLoading(false);
      setMsg("❌ Not logged in. Go to /login");
      return;
    }

    // Find my pastor_admin membership (or super_admin)
    const { data: myMemberships, error: memErr } = await supabase
      .from("memberships")
      .select("church_id, branch_id, role, status")
      .eq("user_id", user.id);

    if (memErr) {
      setLoading(false);
      setMsg("❌ Could not load memberships: " + memErr.message);
      return;
    }

    const mems = (myMemberships as Membership[]) ?? [];
    const adminMem =
      mems.find((m) => m.role === "pastor_admin" && m.status === "active") ??
      mems.find((m) => m.role === "super_admin" && m.status === "active");

    if (!adminMem) {
      setLoading(false);
      setMsg("❌ Access denied. Pastor Admins only.");
      return;
    }

    // Load church
    const { data: ch, error: chErr } = await supabase
      .from("churches")
      .select("id, name, slug")
      .eq("id", adminMem.church_id)
      .single();

    if (chErr) {
      setLoading(false);
      setMsg("❌ Could not load church: " + chErr.message);
      return;
    }

    setChurch(ch as Church);

    // Load branches
    const { data: br, error: brErr } = await supabase
      .from("branches")
      .select("id, church_id, name, slug")
      .eq("church_id", adminMem.church_id)
      .order("name", { ascending: true });

    if (brErr) {
      setLoading(false);
      setMsg("❌ Could not load branches: " + brErr.message);
      return;
    }

    setBranches((br as Branch[]) ?? []);

    // Load evangelists in this church
    const { data: ev, error: evErr } = await supabase
      .from("v_evangelists")
      .select("id, full_name, email, phone, approved, church_id, branch_id, status")
      .eq("church_id", adminMem.church_id)
      .order("approved", { ascending: true })
      .order("full_name", { ascending: true });

    if (evErr) {
      setLoading(false);
      setMsg("❌ Could not load evangelists: " + evErr.message);
      return;
    }

    setEvangelists((ev as EvangelistRow[]) ?? []);

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!myChurchId) return;

    const name = branchName.trim();
    const slug = (branchSlug.trim() || slugify(name)).toLowerCase();

    if (!name) {
      setMsg("❌ Branch name is required.");
      return;
    }

    const { error } = await supabase.from("branches").insert({
      church_id: myChurchId,
      name,
      slug,
    });

    if (error) {
      setMsg("❌ Could not create branch: " + error.message);
      return;
    }

    setBranchName("");
    setBranchSlug("");
    setMsg("✅ Branch created.");
    load();
  };

  const approveEvangelist = async (userId: string) => {
    setMsg(null);

    // Approve in profiles
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ approved: true })
      .eq("id", userId);

    if (pErr) {
      setMsg("❌ Could not approve: " + pErr.message);
      return;
    }

    setMsg("✅ Evangelist approved.");
    load();
  };

  const assignBranch = async (userId: string, branchId: string) => {
    setMsg(null);

    // Update membership branch_id
    const { error } = await supabase
      .from("memberships")
      .update({ branch_id: branchId, status: "active" })
      .eq("user_id", userId)
      .eq("role", "evangelist")
      .eq("church_id", myChurchId);

    if (error) {
      setMsg("❌ Could not assign branch: " + error.message);
      return;
    }

    setMsg("✅ Assigned to branch.");
    load();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <main className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Pastor Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage branches and evangelists for your church.
          </p>
          {church && (
            <p className="mt-1 text-sm">
              Church: <span className="font-semibold">{church.name}</span>
            </p>
          )}
        </div>

        <button
          onClick={logout}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Logout
        </button>
      </div>

      {msg && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading...</p>
      ) : (
        <>
          {/* Create branch */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Branches</h2>
            <p className="mt-1 text-sm text-gray-600">
              Create branches for your church (e.g., Ruiru, Juja).
            </p>

            <form onSubmit={createBranch} className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                className="rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Branch name (e.g., Ruiru)"
                value={branchName}
                onChange={(e) => {
                  setBranchName(e.target.value);
                  if (!branchSlug) setBranchSlug(slugify(e.target.value));
                }}
              />

              <input
                className="rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Slug (optional, e.g., ruiru)"
                value={branchSlug}
                onChange={(e) => setBranchSlug(e.target.value)}
              />

              <button className="rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800">
                Create Branch
              </button>
            </form>

            <div className="mt-4 overflow-auto">
              {branches.length === 0 ? (
                <p className="text-sm text-gray-500">No branches yet.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2">Name</th>
                      <th>Slug</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((b) => (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{b.name}</td>
                        <td className="text-gray-600">{b.slug}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Evangelists */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-bold">Evangelists</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Approve evangelists and assign them to a branch.
                </p>
              </div>
              <div className="text-sm text-gray-600">
                Pending: <b>{pendingEvangelists.length}</b>
              </div>
            </div>

            <div className="mt-4 overflow-auto">
              {evangelists.length === 0 ? (
                <p className="text-sm text-gray-500">No evangelists found yet.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2">Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Branch</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {evangelists.map((e) => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{e.full_name}</td>
                        <td>{e.email}</td>
                        <td>{e.phone ?? "-"}</td>
                        <td className="font-semibold">
                          {e.approved ? "Approved" : "Pending"}
                        </td>
                        <td>
                          {e.branch_id ? branchNameById.get(e.branch_id) ?? "Assigned" : "-"}
                        </td>
                        <td className="flex flex-wrap gap-2 py-2">
                          {!e.approved && (
                            <button
                              onClick={() => approveEvangelist(e.id)}
                              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              Approve
                            </button>
                          )}

                          <select
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
                            defaultValue={e.branch_id ?? ""}
                            onChange={(ev) => {
                              if (ev.target.value) assignBranch(e.id, ev.target.value);
                            }}
                          >
                            <option value="">Assign branch…</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Tip: Evangelists should be assigned to a branch before recording souls.
            </p>
          </section>
        </>
      )}
    </main>
  );
}

function slugify(s: string) {
  return (s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
