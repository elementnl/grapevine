"use server";

import { redirect } from "next/navigation";

import {
  signInWithPassword,
  signOut as endSession,
} from "@/server/auth/session";

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

  if (!(await signInWithPassword(email.trim(), password))) {
    return { error: "Email or password is incorrect." };
  }

  redirect("/debug");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/login");
}
