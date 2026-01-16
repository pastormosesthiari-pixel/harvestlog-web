"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type MyProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "evangelist";
  approved: boolean;
};

type SoulRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  residence: string | null;
  notes: string | null;
  won_on: string;
  created_at: string;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [souls, setSouls] = useState<SoulRow[]>([]);

  // form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [residence, setResidence] = useState("");
  const [notes, setNotes] = useState("");
  const [wonOn, setWonOn] = useState(() => new Date().toISOString().slice(0, 10));

  const total = useMemo(() => souls.length, [souls]);

  const load = async () => {
    setMsg(null);
    setLoading(true);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      setLoading(false);
      setMsg("❌ Not logged in. Go to /login");
      return;
    }

    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, approved")
      .eq("id", user.id)
      .single();

    if (profErr) {
      setLoading(false);
      setMsg("❌ Could not load your profile: " + profErr.message);
      return;
    }

    const myProfile = prof as MyProfile;
    setProfile(myProfile);

    if (myProfile.role === "evangelist" && !myProfile.approved) {
      setSouls([]);
      setLoading(false);
      return;
    }

    const { data: soulRows, error: soulsErr } = await supabase
      .from("souls")
      .select("id, name, phone, email, residence, notes, won_on, created_at")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (soulsErr) setMsg("❌ Could not load souls: " + soulsErr.message);
    else setSouls((soulRows as SoulRow[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSoul = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;

    if (!user) {
      setMsg("❌ Not logged in. Go to /login");
      return;
    }

    if (!profile) {
      setMsg("❌ Profile not loaded yet.");
      return;
    }

    if (profile.role === "evangelist" && !profile.approved) {
      setMsg("⏳ Pending approval by church leadership.");
      return;
    }

    const { error } = await supabase.from("souls").insert({
      evangelist_id: user.id,
      name,
      phone: phone || null,
      email: email || null,
      residence: residence || null,
      notes: notes || null,
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
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
            {profile && (
              <p className="mt-1 text-sm text-gray-600">
                Welcome, <span className="font-semibold">{profile.full_name}</span>{" "}
                <span className="text-gray-500">
                  ({profile.role === "admin" ? "Admin" : "Evangelist"})
                </span>
              </p>
            )}
          </div>

          <a
            href="/logout"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 shadow-sm"
          >
            Logout
          </a>
        </div>

        {msg && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
            {msg}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        ) : !profile ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-600">No profile found.</p>
          </div>
        ) : profile.role === "evangelist" && !profile.approved ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">⏳ Pending Approval</h2>
            <p className="mt-2 text-sm text-gray-600">
              Your account is awaiting approval by church leadership.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Add Soul Card */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Add Soul Won</h2>
              <p className="mt-1 text-sm text-gray-600">
                Record details for follow-up and reporting.
              </p>

              <form onSubmit={addSoul} className="mt-4 grid gap-4">
                <input
                  className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <input
                  className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <input
                  className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />

                <input
                  className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="Residence"
                  value={residence}
                  onChange={(e) => setResidence(e.target.value)}
                />

                <textarea
                  className="min-h-[100px] rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                <input
                  type="date"
                  className="rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  value={wonOn}
                  onChange={(e) => setWonOn(e.target.value)}
                />

                <button className="rounded-xl bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 shadow-sm">
                  Save
                </button>
              </form>
            </section>

            {/* Report Card */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900">My Report</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Total souls recorded: <b>{total}</b>
                </p>
              </div>

              <div className="px-6 pb-6 overflow-auto">
                {souls.length === 0 ? (
                  <p className="text-sm text-gray-500">No records yet.</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-600">
                        <th className="py-3 px-3 font-semibold">Name</th>
                        <th className="py-3 px-3 font-semibold">Phone</th>
                        <th className="py-3 px-3 font-semibold">Email</th>
                        <th className="py-3 px-3 font-semibold">Residence</th>
                        <th className="py-3 px-3 font-semibold">Notes</th>
                        <th className="py-3 px-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {souls.map((s, idx) => (
                        <tr
                          key={s.id}
                          className={`border-t border-gray-100 hover:bg-gray-50 ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                          }`}
                        >
                          <td className="py-3 px-3 font-medium text-gray-900 whitespace-nowrap">
                            {s.name}
                          </td>
                          <td className="py-3 px-3 text-gray-900 whitespace-nowrap">
                            {s.phone ?? "-"}
                          </td>
                          <td className="py-3 px-3 text-gray-900 whitespace-nowrap">
                            {s.email ?? "-"}
                          </td>
                          <td className="py-3 px-3 text-gray-900 whitespace-nowrap">
                            {s.residence ?? "-"}
                          </td>
                          <td className="py-3 px-3 text-gray-900 min-w-[240px]">
                            {s.notes ? (
                              <span title={s.notes}>
                                {s.notes.length > 60 ? s.notes.slice(0, 60) + "…" : s.notes}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-900 whitespace-nowrap">
                            {s.won_on}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
