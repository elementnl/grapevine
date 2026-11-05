import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { AuthenticationConfigurationError } from "@/server/shared/error";
import type { Database } from "@/types/database";

type SupabaseAuthClientOptions = {
  canWriteCookies?: boolean;
};

export async function createSupabaseAuthClient({
  canWriteCookies = false,
}: SupabaseAuthClientOptions = {}) {
  const cookieStore = await cookies();
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new AuthenticationConfigurationError(
      "Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the server environment.",
    );
  }

  return createServerClient<Database>(url, publishableKey, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        if (!canWriteCookies) {
          throw new Error(
            "Supabase auth cookies can only be updated by the proxy or a Server Action.",
          );
        }

        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
