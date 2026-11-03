import type { DebugPlayerSlot, GameStatus } from "@/types/game";

export type GameSummary = {
  date: string;
  prompt: string;
  status: GameStatus;
  drawings: number;
  guesses: number;
  createdAt: string;
};

export type PlayerSummary = {
  id: string;
  slot: DebugPlayerSlot | null;
  createdAt: string;
  drawings: number;
  guesses: number;
};
