"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DEBUG_PLAYERS } from "@/constants/game";
import type { DebugPlayerSlot } from "@/types/game";

type PlayerSwitcherProps = {
  slot: DebugPlayerSlot | null;
};

const slots = Object.keys(DEBUG_PLAYERS) as DebugPlayerSlot[];

export function PlayerSwitcher({ slot }: PlayerSwitcherProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchTo = async (next: DebugPlayerSlot) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/debug/player", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slot: next }),
      });
      if (!response.ok) {
        throw new Error(`Could not switch player (HTTP ${response.status}).`);
      }
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not switch player.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-hand text-ink-muted">Playing as</span>
      <div
        aria-label="Debug player"
        className="sketch flex gap-1 p-1"
        role="group"
      >
        {slots.map((option) => (
          <button
            aria-pressed={slot === option}
            className="btn btn-quiet px-3 py-0 text-base"
            disabled={busy}
            key={option}
            onClick={() => switchTo(option)}
            type="button"
          >
            {DEBUG_PLAYERS[option].label}
          </button>
        ))}
      </div>
      {slot === null && (
        <span className="font-hand text-ink-muted">(your own)</span>
      )}
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
