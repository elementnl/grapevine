import "server-only";

import { io } from "next/cache";

import type { AdminAction } from "@/server/admin/admin-validation";
import { requireAdmin } from "@/server/auth/admin";
import { getDebugPlayerSlot } from "@/server/players/player";
import { GameError } from "@/server/shared/error";
import { getSupabaseAdminClient } from "@/server/shared/supabase";
import type { GameSummary, PlayerSummary } from "@/types/admin";
import type { GameStatus } from "@/types/game";

function check(error: { message: string } | null): void {
  if (error) {
    throw new Error(`Supabase request failed: ${error.message}`);
  }
}

function countBy<T>(rows: T[], key: (row: T) => string | null) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = key(row);
    if (value !== null) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

// ponytail: counts by reading every drawing and guess row; switch to a SQL view once days get big.
async function nodeOwners() {
  const client = getSupabaseAdminClient();
  const [drawings, guesses] = await Promise.all([
    client.from("drawings").select("day, player_id"),
    client.from("guesses").select("day, player_id"),
  ]);
  check(drawings.error);
  check(guesses.error);
  return { drawings: drawings.data ?? [], guesses: guesses.data ?? [] };
}

export async function listGames(): Promise<GameSummary[]> {
  await io();
  await requireAdmin();
  const client = getSupabaseAdminClient();
  const [{ data: days, error }, owners] = await Promise.all([
    client
      .from("days")
      .select("date, initial_prompt, status, created_at")
      .order("date", { ascending: false }),
    nodeOwners(),
  ]);
  check(error);

  const drawings = countBy(owners.drawings, (row) => row.day);
  const guesses = countBy(owners.guesses, (row) => row.day);
  return (days ?? []).map((day) => ({
    date: day.date,
    prompt: day.initial_prompt,
    // days.status is text with a check constraint, so it is always a GameStatus.
    status: day.status as GameStatus,
    drawings: drawings.get(day.date) ?? 0,
    guesses: guesses.get(day.date) ?? 0,
    createdAt: day.created_at,
  }));
}

export async function listPlayers(): Promise<PlayerSummary[]> {
  await io();
  await requireAdmin();
  const client = getSupabaseAdminClient();
  const [{ data: players, error }, owners] = await Promise.all([
    client
      .from("players")
      .select("id, created_at")
      .order("created_at", { ascending: false }),
    nodeOwners(),
  ]);
  check(error);

  const drawings = countBy(owners.drawings, (row) => row.player_id);
  const guesses = countBy(owners.guesses, (row) => row.player_id);
  return (players ?? []).map((player) => ({
    id: player.id,
    slot: getDebugPlayerSlot(player.id),
    createdAt: player.created_at,
    drawings: drawings.get(player.id) ?? 0,
    guesses: guesses.get(player.id) ?? 0,
  }));
}

async function setGameStatus(date: string, status: "live" | "frozen") {
  const client = getSupabaseAdminClient();
  const now = new Date().toISOString();

  if (status === "frozen") {
    const { error } = await client
      .from("days")
      .update({ status: "frozen", frozen_at: now })
      .eq("date", date);
    check(error);
    return;
  }

  // Only one game can be live, so going live ends whatever else is.
  const { error: freezeError } = await client
    .from("days")
    .update({ status: "frozen", frozen_at: now })
    .eq("status", "live")
    .neq("date", date);
  check(freezeError);

  const { data, error } = await client
    .from("days")
    .update({ status: "live", frozen_at: null, opened_at: now })
    .eq("date", date)
    .select("date")
    .maybeSingle();
  check(error);
  if (!data) {
    throw new GameError("That game no longer exists.", 404, "not_found");
  }
}

export async function runAdminAction(
  action: AdminAction,
): Promise<{ ok: true }> {
  const client = getSupabaseAdminClient();
  switch (action.action) {
    case "rename_game": {
      const { error } = await client
        .from("days")
        .update({ initial_prompt: action.prompt })
        .eq("date", action.date);
      check(error);
      break;
    }
    case "set_game_status":
      await setGameStatus(action.date, action.status);
      break;
    // Deletes cascade: a game takes its drawings and guesses with it, and a
    // node takes every branch below it. A deleted player's nodes stay, unowned.
    case "delete_game": {
      const { error } = await client
        .from("days")
        .delete()
        .eq("date", action.date);
      check(error);
      break;
    }
    case "delete_node": {
      const table = action.kind === "drawing" ? "drawings" : "guesses";
      const { error } = await client.from(table).delete().eq("id", action.id);
      check(error);
      break;
    }
    case "delete_player": {
      const { error } = await client
        .from("players")
        .delete()
        .eq("id", action.playerId);
      check(error);
      break;
    }
  }
  return { ok: true };
}
