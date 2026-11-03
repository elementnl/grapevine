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

export type Turn =
  | { kind: "no_game" }
  | { kind: "wait" }
  | { kind: "guess"; drawingId: number; drawing: DrawingData }
  | { kind: "draw"; guessId: number; prompt: string };

export type TurnSubmission =
  | { kind: "guess"; drawingId: number; text: string }
  | { kind: "draw"; guessId: number; drawing: DrawingData };

export type GameChain = {
  date: string;
  prompt: string;
  status: GameStatus;
  nodes: ChainNode[];
};

export type GameStatus = "scheduled" | "live" | "frozen";

export type DebugPlayerSlot = keyof typeof DEBUG_PLAYERS;
