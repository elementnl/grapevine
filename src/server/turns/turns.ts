import "server-only";

import { connection } from "next/server";

import { drawingToJson, isDrawingData } from "@/server/drawings/validation";
import { GameError } from "@/server/shared/error";
import { getSupabaseAdminClient } from "@/server/shared/supabase";
import { decideTurn, findChainEnd } from "@/server/turns/chain";
import type {
  ChainNode,
  GameChain,
  GameStatus,
  Turn,
  TurnSubmission,
} from "@/types/game";

type GameDay = { id: string; date: string; prompt: string; status: GameStatus };

async function getLiveDay(): Promise<GameDay | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("days")
    .select("id, date, initial_prompt")
    .eq("status", "live")
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase request failed: ${error.message}`);
  }
  return data
    ? {
        id: data.id,
        date: data.date,
        prompt: data.initial_prompt,
        status: "live",
      }
    : null;
}

async function getLatestFrozenDay(): Promise<GameDay | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from("days")
    .select("id, date, initial_prompt")
    .eq("status", "frozen")
    .order("frozen_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase request failed: ${error.message}`);
  }
  return data
    ? {
        id: data.id,
        date: data.date,
        prompt: data.initial_prompt,
        status: "frozen",
      }
    : null;
}

export async function getDayNodes(date: string): Promise<ChainNode[]> {
  const client = getSupabaseAdminClient();
  const [drawings, guesses] = await Promise.all([
    client
      .from("drawings")
      .select("id, parent_guess_id, depth, player_id, strokes")
      .eq("day", date)
      .eq("status", "visible"),
    client
      .from("guesses")
      .select("id, drawing_id, depth, player_id, text")
      .eq("day", date),
  ]);

  if (drawings.error) {
    throw new Error(`Supabase request failed: ${drawings.error.message}`);
  }
  if (guesses.error) {
    throw new Error(`Supabase request failed: ${guesses.error.message}`);
  }

  const nodes: ChainNode[] = [];
  for (const row of drawings.data) {
    if (!isDrawingData(row.strokes)) {
      console.error(`Skipping drawing ${row.id} with invalid strokes.`);
      continue;
    }
    nodes.push({
      kind: "drawing",
      id: row.id,
      parentId: row.parent_guess_id,
      depth: row.depth,
      playerId: row.player_id,
      drawing: row.strokes,
    });
  }
  for (const row of guesses.data) {
    nodes.push({
      kind: "guess",
      id: row.id,
      parentId: row.drawing_id,
      depth: row.depth,
      playerId: row.player_id,
      text: row.text,
    });
  }
  return nodes;
}

export async function getCurrentTurn(playerId: string | null): Promise<Turn> {
  const day = await getLiveDay();
  if (!day) {
    return { kind: "no_game" };
  }
  return decideTurn(await getDayNodes(day.date), playerId);
}

// Every node of the live game, or of the most recently finished one once it's frozen.
export async function getLatestGame(): Promise<GameChain | null> {
  // The tree changes with every turn, so it must never be prerendered.
  await connection();
  const day = (await getLiveDay()) ?? (await getLatestFrozenDay());
  if (!day) {
    return null;
  }
  return { ...day, nodes: await getDayNodes(day.date) };
}

// One specific game, in any state, for the debug tools and shared tree links.
export async function getGame(date: string): Promise<GameChain | null> {
  await connection();
  const { data, error } = await getSupabaseAdminClient()
    .from("days")
    .select("date, initial_prompt, status")
    .eq("date", date)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase request failed: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return {
    date: data.date,
    prompt: data.initial_prompt,
    // days.status is text with a check constraint, so it is always a GameStatus.
    status: data.status as GameStatus,
    nodes: await getDayNodes(data.date),
  };
}

export async function submitTurn(
  submission: TurnSubmission,
  playerId: string,
): Promise<{ ok: true }> {
  const day = await getLiveDay();
  if (!day) {
    throw new GameError("There is no game in progress.", 409, "day_closed");
  }

  const end = findChainEnd(await getDayNodes(day.date));
  const expected =
    submission.kind === "guess"
      ? { kind: "drawing", id: submission.drawingId }
      : { kind: "guess", id: submission.guessId };
  if (!end || end.kind !== expected.kind || end.id !== expected.id) {
    throw new GameError(
      "The other player already took this turn. Reload to continue.",
      409,
      "turn_taken",
    );
  }
  if (end.playerId === playerId) {
    throw new GameError("It's the other player's turn.", 409, "not_your_turn");
  }

  // ponytail: check-then-insert can race; the loser becomes a side branch; play follows findChainEnd.
  const client = getSupabaseAdminClient();
  const { error } =
    submission.kind === "guess"
      ? await client.from("guesses").insert({
          day: day.date,
          day_id: day.id,
          drawing_id: submission.drawingId,
          player_id: playerId,
          text: submission.text,
        })
      : await client.from("drawings").insert({
          day: day.date,
          day_id: day.id,
          parent_guess_id: submission.guessId,
          player_id: playerId,
          status: "visible",
          strokes: drawingToJson(submission.drawing),
        });

  if (error) {
    throw new Error(`Supabase request failed: ${error.message}`);
  }
  return { ok: true };
}
