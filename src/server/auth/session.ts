import "server-only";

import { createSupabaseAuthClient } from "@/server/auth/supabase-auth";

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const supabase = await createSupabaseAuthClient({ canWriteCookies: true });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error === null;
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseAuthClient({ canWriteCookies: true });
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
