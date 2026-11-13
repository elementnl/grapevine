import type { DEBUG_PLAYERS } from "@/constants/game";
import type { DrawingData } from "@/types/drawing";

export type ChainNode =
  | {
      kind: "drawing";
      id: number;
      parentId: number | null;
      depth: number;
      playerId: string | null;
      drawing: DrawingData;
    }
  | {
      kind: "guess";
      id: number;
      parentId: number;
      depth: number;
      playerId: string | null;
      text: string;
    };

// What the play page shows. `turnsLeft` is null when turns are unlimited (local dev).
export type Turn =
  | { kind: "no_game" }
  | { kind: "ready"; turnsLeft: number | null }
  | { kind: "nothing_to_play"; turnsLeft: number | null }
  | { kind: "out_of_turns" }
  | { kind: "playing"; turn: OpenTurn };

// A turn in progress. Node ids never reach the browser, only the assignment id.
export type OpenTurn = {
  assignmentId: string;
  // When the timer reaches zero; the server accepts a little past it.
  endsAt: string;
  timeLimitSec: number;
  turnsLeft: number | null;
} & (
  { task: "guess"; drawing: DrawingData } | { task: "draw"; prompt: string }
);

export type TurnSubmission =
  { kind: "guess"; text: string } | { kind: "draw"; drawing: DrawingData };

export type GameChain = {
  date: string;
  prompt: string;
  status: GameStatus;
  nodes: ChainNode[];
};

export type GameStatus = "scheduled" | "live" | "frozen";

export type DebugPlayerSlot = keyof typeof DEBUG_PLAYERS;
