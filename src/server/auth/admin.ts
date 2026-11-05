import "server-only";

import { cache } from "react";

import { createSupabaseAuthClient } from "@/server/auth/supabase-auth";
import { GameError } from "@/server/shared/error";

export const getAdminUser = cache(async (): Promise<{ id: string } | null> => {
  const supabase = await createSupabaseAuthClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error && error.name !== "AuthSessionMissingError") {
    throw error;
  }
  const claims = data?.claims;
  if (!claims) {
    return null;
  }

  return { id: claims.sub };
});

export async function requireAdmin(): Promise<void> {
  if (!(await getAdminUser())) {
    throw new GameError("Sign in to continue.", 401, "unauthorized");
  }
}
