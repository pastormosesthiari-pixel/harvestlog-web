"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Church = { id: string; name: string; slug: string };
type Branch = { id: string; church_id: string; name: string; slug: string };

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [churches, setChurches] = useState<Church[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [churchId, setChurchId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [note, setNote] = useState("");

  const filteredBranches = useMemo(
    () => branches.filter((b) => b.church_id === churchId),
    [branches, churchId]
  );

  const load = async () => {
    setLoading(true);
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      setMsg("❌ Not logged in. Go to /login");
      setLoading(false);
      return;
    }

    // Load churches + branches (public list based on RLS membership rules)
    // Since a new user might not have membership yet, we will allow churches/branches to be visible later
    // For now, we assume churches/branches are readable by authenticated users OR you’ll widen RLS if needed.
    const { data: ch, error: chErr } = await supabase
      .from("churches")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (chErr) {
      setMsg("❌ Could not load churches: " + chErr.message);
      setLoading(false);
      return;
    }

    const { data: br, error: brErr } = await supabase
      .from("branches")
      .select("id, church_id, name, slug")
      .order("name", { ascending: true });

    if (brErr) {
      setMsg("❌ Could not load branches: " + brErr.message);
      setLoading(false);
      return;
    }

    setChurches((ch as Church[]) ?? []);
    setBranches((br as Branch[]) ?? []);

    // Check if user already requested
    const { data: reqs, error: reqErr } = await supabase
      .from("access_requests")
      .select("status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!reqErr && reqs && reqs.length > 0) {
      const r = reqs[0] as any;
      setMsg(`✅ Your latest request is: ${r.status.toUpperCase()}`);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      setMsg("❌ Not logged in. Go to /login");
      return;
    }

    if (!churchId) {
      setMsg("❌ Please select a church.");
      return;
    }

    // branch is optional: some churches may assign later
    const { error } = await supabase.from("access_requests").insert({
      user_id: user.id,
      church_id: churchId,
      branch_id: branchId || null,
      note: note || null,
      status: "pending",
    });

    if (error) {
      setMsg("❌ Could not submit request: " + error.message);
      return;
    }

    setMsg("✅ Request submitted. Please wait for approval.");
    setNote("");
  };

  return (
    <main className="mt-6 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Join a Church</h1>
        <p className="mt-1 text-sm text-gray-600">
          Select your church and branch. Your request will be reviewed by church leadership.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading...</p>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold">Church</label>
              <select
                className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                value={churchId}
                onChange={(e) => {
                  setChurchId(e.target.value);
                  setBranchId("");
                }}
              >
                <option value="">Select church…</option>
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold">Branch (optional)</label>
              <select
                className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={!churchId}
              >
                <option value="">Select branch…</option>
                {filteredBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                If you’re not sure, leave it blank — leadership can assign later.
              </p>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold">Note to leadership (optional)</label>
              <textarea
                className="min-h-[90px] rounded-lg border border-gray-200 px-3 py-2"
                placeholder="E.g., I serve in the youth evangelism team…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button className="rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800">
              Submit Request
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500">
            After approval, you can log in and start recording souls.
          </p>
        </section>
      )}
    </main>
  );
}
