import "server-only";

import { isDrawingData } from "@/server/drawings/validation";
import type { DrawingData } from "@/types/drawing";

export type DaySetupAction =
  | { action: "create"; date: string; initialPrompt: string }
  | {
      action: "starter";
      date: string;
      starterIndex: 1 | 2;
      drawing: DrawingData;
    }
  | { action: "publish"; date: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isGameDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function parseDaySetupAction(value: unknown): DaySetupAction | null {
  if (!isRecord(value) || !isGameDate(value.date)) {
    return null;
  }

  if (value.action === "create") {
    if (
      typeof value.initialPrompt !== "string" ||
      value.initialPrompt.trim().length === 0
    ) {
      return null;
    }

    return {
      action: "create",
      date: value.date,
      initialPrompt: value.initialPrompt.trim(),
    };
  }

  if (value.action === "starter") {
    if (
      (value.starterIndex !== 1 && value.starterIndex !== 2) ||
      !isDrawingData(value.drawing)
    ) {
      return null;
    }

    return {
      action: "starter",
      date: value.date,
      starterIndex: value.starterIndex,
      drawing: value.drawing,
    };
  }

  if (value.action === "publish") {
    return { action: "publish", date: value.date };
  }

  return null;
}
