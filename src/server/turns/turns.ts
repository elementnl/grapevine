import "server-only";

import { connection } from "next/server";

import { isDrawingData } from "@/server/drawings/validation";
import { getSupabaseAdminClient } from "@/server/shared/supabase";
import type { ChainNode, GameChain, GameStatus } from "@/types/game";

export type GameDay = {
  id: string;
  date: string;
  prompt: string;
  status: GameStatus;
};

export async function getLiveDay(): Promise<GameDay | null> {
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
