import "server-only";

import { isGameDate } from "@/server/days/setup-validation";

export type AdminAction =
  | { action: "rename_game"; date: string; prompt: string }
  | { action: "set_game_status"; date: string; status: "live" | "frozen" }
  | { action: "delete_game"; date: string }
  | { action: "delete_node"; kind: "drawing" | "guess"; id: number }
  | { action: "delete_player"; playerId: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAdminAction(value: unknown): AdminAction | null {
  if (!isRecord(value)) {
    return null;
  }

  switch (value.action) {
    case "rename_game":
      return isGameDate(value.date) &&
        typeof value.prompt === "string" &&
        value.prompt.trim().length > 0
        ? {
            action: "rename_game",
            date: value.date,
            prompt: value.prompt.trim(),
          }
        : null;
    case "set_game_status":
      return isGameDate(value.date) &&
        (value.status === "live" || value.status === "frozen")
        ? { action: "set_game_status", date: value.date, status: value.status }
        : null;
    case "delete_game":
      return isGameDate(value.date)
        ? { action: "delete_game", date: value.date }
        : null;
    case "delete_node":
      return (value.kind === "drawing" || value.kind === "guess") &&
        typeof value.id === "number" &&
        Number.isSafeInteger(value.id) &&
        value.id > 0
        ? { action: "delete_node", kind: value.kind, id: value.id }
        : null;
    case "delete_player":
      return typeof value.playerId === "string" &&
        UUID_PATTERN.test(value.playerId)
        ? { action: "delete_player", playerId: value.playerId }
        : null;
    default:
      return null;
  }
}
