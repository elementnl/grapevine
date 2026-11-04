"use server";

import { redirect } from "next/navigation";

import { createSupabaseAuthClient } from "@/server/auth/supabase-auth";

export type LoginActionState = {
  error: string | null;
};

export async function signIn(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createSupabaseAuthClient({ canWriteCookies: true });
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    return { error: "Email or password is incorrect." };
  }

  redirect("/debug");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseAuthClient({ canWriteCookies: true });
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }

  redirect("/login");
}
