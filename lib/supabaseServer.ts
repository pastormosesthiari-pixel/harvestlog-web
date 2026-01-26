import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";

/**
 * Admin client (bypasses RLS)
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Verify client (used to verify JWT safely)
 */
export const supabaseVerify = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Extract Bearer token from request
 */
export function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  if (!auth.startsWith("Bearer ")) return null;
  return auth.replace("Bearer ", "").trim();
}
