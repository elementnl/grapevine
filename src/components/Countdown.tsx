"use client";

import { useSyncExternalStore } from "react";

function subscribeToClock(onTick: () => void): () => void {
  const interval = setInterval(onTick, 250);
  return () => clearInterval(interval);
}

// Whole seconds until `endsAt`, or null while server rendering (no clock there).
function useSecondsLeft(endsAt: string): number | null {
  const end = Date.parse(endsAt);
  return useSyncExternalStore(
    subscribeToClock,
    () => Math.max(0, Math.ceil((end - Date.now()) / 1000)),
    () => null,
  );
}

type CountdownProps = {
  endsAt: string;
  totalSeconds: number;
};

export function Countdown({ endsAt, totalSeconds }: CountdownProps) {
  const seconds = useSecondsLeft(endsAt) ?? totalSeconds;
  const urgent = seconds <= 10;

  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden
        className="sketch-alt h-3 flex-1 overflow-hidden rounded-full"
      >
        <div
          className={`h-full transition-[width] duration-300 ease-linear motion-reduce:transition-none ${
            urgent ? "bg-danger" : "bg-grape"
          }`}
          style={{ width: `${(seconds / totalSeconds) * 100}%` }}
        />
      </div>
      <p
        aria-label={`${seconds} seconds left`}
        className={`w-14 text-right font-hand text-2xl font-bold tabular-nums ${
          urgent ? "text-danger" : ""
        }`}
        role="timer"
      >
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
      </p>
    </div>
  );
}
