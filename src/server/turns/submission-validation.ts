import "server-only";

import { GUESS_MAX_LENGTH, GUESS_MIN_LENGTH } from "@/constants/game";
import { isDrawingData } from "@/server/drawings/validation";
import type { TurnSubmission } from "@/types/game";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function normalizeGuess(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseTurnSubmission(value: unknown): TurnSubmission | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.kind === "guess") {
    if (!isNodeId(value.drawingId) || typeof value.text !== "string") {
      return null;
    }
    const text = normalizeGuess(value.text);
    if (text.length < GUESS_MIN_LENGTH || text.length > GUESS_MAX_LENGTH) {
      return null;
    }
    return { kind: "guess", drawingId: value.drawingId, text };
  }

  if (value.kind === "draw") {
    if (!isNodeId(value.guessId) || !isDrawingData(value.drawing)) {
      return null;
    }
    return { kind: "draw", guessId: value.guessId, drawing: value.drawing };
  }

  return null;
}
