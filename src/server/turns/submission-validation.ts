import "server-only";

import { GUESS_MAX_LENGTH, GUESS_MIN_LENGTH } from "@/constants/game";
import { isDrawingData } from "@/server/drawings/validation";
import type { TurnSubmission } from "@/types/game";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAssignmentId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function normalizeGuess(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// The body is `{ text }` for a guess or `{ drawing }` for a drawing; the
// assignment decides which one is expected.
export function parseTurnSubmission(value: unknown): TurnSubmission | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.text === "string") {
    const text = normalizeGuess(value.text);
    if (text.length < GUESS_MIN_LENGTH || text.length > GUESS_MAX_LENGTH) {
      return null;
    }
    return { kind: "guess", text };
  }

  if (isDrawingData(value.drawing)) {
    return { kind: "draw", drawing: value.drawing };
  }

  return null;
}
