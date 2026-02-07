// lib/getActiveChurchId.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getActiveChurchId(supabase: SupabaseClient) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;

  const userId = userData.user?.id;
  if (!userId) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("church_memberships")
    .select("church_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error) throw error;

  return data.church_id as string;
}
