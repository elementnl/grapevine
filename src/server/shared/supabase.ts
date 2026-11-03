import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SupabaseConfigurationError } from "@/server/shared/error";
import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | undefined;

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (client) {
    return client;
  }

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new SupabaseConfigurationError(
      "Set SUPABASE_URL and SUPABASE_SECRET_KEY in the server environment.",
    );
  }

  client = createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return client;
}
