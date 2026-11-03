"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { postDebug } from "@/components/debug-api";

type ActionButtonProps = {
  children: string;
  payload: Record<string, unknown>;
  // Asked with the browser's confirm dialog before anything is sent.
  confirm?: string;
  endpoint?: string;
  // Where to go afterwards; by default the current page refreshes.
  redirectTo?: string;
  variant?: "default" | "primary" | "danger";
};

const variantClass = {
  default: "btn",
  primary: "btn btn-primary",
  danger: "btn btn-danger",
};

export function ActionButton({
  children,
  payload,
  confirm,
  endpoint = "/api/debug/admin",
  redirectTo,
  variant = "default",
}: ActionButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (confirm && !window.confirm(confirm)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await postDebug(endpoint, payload);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        className={`${variantClass[variant]} px-3 py-1 text-base`}
        disabled={busy}
        onClick={run}
        type="button"
      >
        {busy ? "Working…" : children}
      </button>
      {error && (
        <span aria-live="polite" className="text-sm text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
