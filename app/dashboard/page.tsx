"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
};

type SoulRow = {
  id: string;
  evangelist_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  residence: string | null;
  notes: string | null;
  won_on: string;
  created_at: string;
};

type Step = "session" | "profile" | "souls" | "ready" | "error";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("session");
  const [msg, setMsg] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [souls, setSouls] = useState<SoulRow[]>([]);

  // form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [residence, setResidence] = useState("");
  const [notes, setNotes] = useState("");
  const [wonOn, setWonOn] = useState(() => new Date().toISOString().slice(0, 10));

  const total = useMemo(() => souls.length, [souls]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const load = async () => {
    setLoading(true);
    setMsg(null);
    setStep("session");

    // Timeout guard so it never "hangs forever"
    const timeoutMs = 12000;
    let t: any = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      t = setTimeout(() => reject(new Error("Timed out while loading dashboard.")), timeoutMs);
    });

    try {
      await Promise.race([
        (async () => {
          // 1) Session
          const { data: sessData, error: sessErr } = await supabase.auth.getSession();
          if (sessErr) throw new Error("Session error: " + sessErr.message);

          const user = sessData.session?.user;
          if (!user) {
            setLoading(false);
            setStep("error");
            setMsg("❌ Not logged in. Go to /login");
            return;
          }

          setUserId(user.id);

          // 2) Profile (only self)
          setStep("profile");
          const { data: prof, error: profErr } = await supabase
            .from("profiles")
            .select("id, full_name, phone")
            .eq("id", user.id)
            .maybeSingle();

          if (profErr) throw new Error("Profile error: " + profErr.message);

          if (!prof) {
            setProfile(null);
            setSouls([]);
            setLoading(false);
            setStep("error");
            setMsg("❌ No profile found for this user. Please register again.");
            return;
          }

          setProfile(prof as Profile);

          // 3) Souls (only self, enforced by RLS)
          setStep("souls");
          const { data: soulRows, error: soulsErr } = await supabase
            .from("souls")
            .select("id, evangelist_id, name, phone, email, residence, notes, won_on, created_at")
            .order("created_at", { ascending: false })
            .limit(200);

          if (soulsErr) throw new Error("Souls error: " + soulsErr.message);

          setSouls((soulRows as SoulRow[]) ?? []);
          setStep("ready");
          setLoading(false);
        })(),
        timeoutPromise,
      ]);
    } catch (e: any) {
      setLoading(false);
      setStep("error");
      setMsg("❌ " + (e?.message ?? String(e)));
    } finally {
      if (t) clearTimeout(t);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSoul = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!userId) {
      setMsg("❌ Not logged in. Go to /login");
      return;
    }

    if (!name.trim()) {
      setMsg("❌ Name is required.");
      return;
    }

    const { error } = await supabase.from("souls").insert({
      evangelist_id: userId,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      residence: residence.trim() || null,
      notes: notes.trim() || null,
      won_on: wonOn,
    });

    if (error) {
      setMsg("❌ Could not save: " + error.message);
      return;
    }

    setName("");
    setPhone("");
    setEmail("");
    setResidence("");
    setNotes("");
    setWonOn(new Date().toISOString().slice(0, 10));
    setMsg("✅ Saved.");
    load();
  };

  return (
    <main className="mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Status:{" "}
            <span className="font-semibold">
              {loading ? `Loading (${step})…` : step === "ready" ? "Ready" : "Check message below"}
            </span>
          </p>
          {profile && (
            <p className="mt-1 text-sm text-gray-600">
              Welcome, <span className="font-semibold">{profile.full_name}</span>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">Loading…</p>
          <p className="mt-2 text-xs text-gray-500">
            If it times out, you’ll see the exact cause (no silent hangs).
          </p>
        </div>
      ) : step !== "ready" ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Dashboard not ready</h2>
          <p className="mt-2 text-sm text-gray-600">Use Refresh. If it persists, share the message above.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Add Soul */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Add Soul Won</h2>

            <form onSubmit={addSoul} className="mt-4 grid gap-4">
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
              <input
                className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Residence"
                value={residence}
                onChange={(e) => setResidence(e.target.value)}
              />
              <textarea
                className="min-h-[90px] rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <input
                type="date"
                className="rounded-lg border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-300"
                value={wonOn}
                onChange={(e) => setWonOn(e.target.value)}
              />
              <button className="rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800">
                Save
              </button>
            </form>
          </section>

          {/* My Report */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">My Report</h2>
            <p className="mt-1 text-sm text-gray-600">
              Total souls recorded (latest 200): <b>{total}</b>
            </p>

            <div className="mt-4 overflow-auto">
              {souls.length === 0 ? (
                <p className="text-sm text-gray-500">No records yet.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2">Name</th>
                      <th>Phone</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {souls.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{s.name}</td>
                        <td>{s.phone ?? "-"}</td>
                        <td>{s.won_on}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
