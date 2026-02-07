"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getActiveChurchId } from "@/lib/getActiveChurchId";

export default function NewSoulPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [churchId, setChurchId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [residence, setResidence] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        window.location.href = "/login";
        return;
      }

      setUserId(data.user.id);

      const activeChurchId = await getActiveChurchId(supabase);
      setChurchId(activeChurchId);
    }

    init();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!churchId || !userId) throw new Error("Not ready. Reload page.");

      const today = new Date().toISOString().slice(0, 10);

      const { error } = await supabase.from("souls").insert({
        church_id: churchId,
        branch_id: null, // we add branch selection later
        evangelist_user_id: userId,
        name,
        phone: phone || null,
        email: email || null,
        residence: residence || null,
        notes: notes || null,
        won_on: today,
      });

      if (error) throw error;

      setName("");
      setPhone("");
      setEmail("");
      setResidence("");
      setNotes("");

      setMessage("Soul recorded successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">Add New Soul</h1>

      {message && (
        <div className="mb-4 p-3 rounded border border-green-300 bg-green-50 text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Full Name" value={name} onChange={setName} required />

        <Input label="Phone" value={phone} onChange={setPhone} />

        <Input label="Email" value={email} onChange={setEmail} />

        <Input label="Residence" value={residence} onChange={setResidence} />

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            className="w-full border rounded p-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Saving..." : "Save Soul"}
        </button>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && "*"}
      </label>
      <input
        className="w-full border rounded p-2"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
