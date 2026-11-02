import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SupabaseConfigurationError } from "@/server/shared/error";
import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | undefined;

export function isSupabaseServiceRoleKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) {
    return true;
  }

  const payload = key.split(".")[1];
  if (!payload) {
    return false;
  }

  try {
    const claims: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    return (
      typeof claims === "object" &&
      claims !== null &&
      "role" in claims &&
      claims.role === "service_role"
    );
  } catch {
    return false;
  }
}

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (client) {
    return client;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new SupabaseConfigurationError(
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.",
    );
  }

  if (!isSupabaseServiceRoleKey(serviceRoleKey)) {
    const message = serviceRoleKey.startsWith("sb_publishable_")
      ? "SUPABASE_SERVICE_ROLE_KEY contains a publishable key. Replace it with a Supabase service-role key; publishable keys are subject to row-level security."
      : "SUPABASE_SERVICE_ROLE_KEY must be a Supabase service-role key that bypasses row-level security.";
    throw new SupabaseConfigurationError(message);
  }

  client = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  return client;
}
