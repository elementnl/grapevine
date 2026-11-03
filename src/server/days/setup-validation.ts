import "server-only";

import { STARTER_DRAWING_COUNT } from "@/constants/game";
import { isDrawingData } from "@/server/drawings/validation";
import type { DrawingData } from "@/types/drawing";

export type DaySetupAction =
  | { action: "create"; date: string; initialPrompt: string }
  | {
      action: "starter";
      date: string;
      starterIndex: number;
      drawing: DrawingData;
    }
  | { action: "publish"; date: string }
  | { action: "freeze"; date: string }
  | { action: "start"; initialPrompt: string; drawing: DrawingData };

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

// A quick-start game takes today's date, or the day after the latest game so
// test games never collide with an existing day.
export function nextGameDate(today: string, latestDate: string | null): string {
  if (latestDate === null || latestDate < today) {
    return today;
  }
  const next = new Date(`${latestDate}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function parseDaySetupAction(value: unknown): DaySetupAction | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.action === "start") {
    if (
      typeof value.initialPrompt !== "string" ||
      value.initialPrompt.trim().length === 0 ||
      !isDrawingData(value.drawing)
    ) {
      return null;
    }

    return {
      action: "start",
      initialPrompt: value.initialPrompt.trim(),
      drawing: value.drawing,
    };
  }

  if (!isGameDate(value.date)) {
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
      typeof value.starterIndex !== "number" ||
      !Number.isInteger(value.starterIndex) ||
      value.starterIndex < 1 ||
      value.starterIndex > STARTER_DRAWING_COUNT ||
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

  if (value.action === "freeze") {
    return { action: "freeze", date: value.date };
  }

  return null;
}
