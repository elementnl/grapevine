import "server-only";

import { createSupabaseAuthClient } from "@/server/auth/supabase-auth";
import { GameError } from "@/server/shared/error";

export async function getAdminUser(): Promise<{ id: string } | null> {
  const supabase = await createSupabaseAuthClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    throw error;
  }
  if (!user) {
    return null;
  }

  return { id: user.id };
}

export async function requireAdmin(): Promise<void> {
  if (!(await getAdminUser())) {
    throw new GameError("Sign in to continue.", 401, "unauthorized");
  }
}
