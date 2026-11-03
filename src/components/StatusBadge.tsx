import type { GameStatus } from "@/types/game";

const badge: Record<GameStatus, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-grape-wash text-grape-strong" },
  frozen: { label: "Ended", className: "bg-white text-ink-muted" },
  scheduled: { label: "Not started", className: "bg-white text-ink-muted" },
};

export function StatusBadge({ status }: { status: GameStatus }) {
  const { label, className } = badge[status];
  return (
    <span
      className={`sketch-alt inline-block px-2.5 py-0.5 font-hand text-sm font-bold ${className}`}
    >
      {label}
    </span>
  );
}
