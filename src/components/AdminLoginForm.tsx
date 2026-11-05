"use client";

import { useActionState } from "react";

import { signIn } from "@/app/login/actions";

const initialState = { error: null };

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="font-hand text-lg">Email</span>
          <input
            autoComplete="username"
            className="field"
            name="email"
            required
            type="email"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-hand text-lg">Password</span>
          <input
            autoComplete="current-password"
            className="field"
            name="password"
            required
            type="password"
          />
        </label>
        {state.error && (
          <p className="text-danger" role="alert">
            {state.error}
          </p>
        )}
        <button className="btn btn-primary" disabled={pending} type="submit">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}
