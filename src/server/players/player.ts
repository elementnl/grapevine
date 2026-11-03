import "server-only";

import { cookies } from "next/headers";

import {
  DEBUG_PLAYERS,
  PLAYER_COOKIE_MAX_AGE_SECONDS,
  PLAYER_COOKIE_NAME,
} from "@/constants/game";
import { getSupabaseAdminClient } from "@/server/shared/supabase";
import type { DebugPlayerSlot } from "@/types/game";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reads the player without creating one, so pages can render for new visitors.
export async function readPlayerId(): Promise<string | null> {
  const value = (await cookies()).get(PLAYER_COOKIE_NAME)?.value;
  return value && UUID_PATTERN.test(value) ? value : null;
}

async function ensurePlayerRow(playerId: string): Promise<void> {
  // ponytail: anyone can mint a player id; fine without accounts, the spec's Turnstile gate comes later.
  const { error } = await getSupabaseAdminClient()
    .from("players")
    .upsert({ id: playerId }, { ignoreDuplicates: true, onConflict: "id" });
  if (error) {
    throw new Error(`Supabase request failed: ${error.message}`);
  }
}

// Only callable from route handlers: setting a cookie needs a response.
async function setPlayerCookie(playerId: string): Promise<void> {
  (await cookies()).set(PLAYER_COOKIE_NAME, playerId, {
    httpOnly: true,
    maxAge: PLAYER_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getOrCreatePlayerId(): Promise<string> {
  const existing = await readPlayerId();
  const playerId = existing ?? crypto.randomUUID();
  await ensurePlayerRow(playerId);
  if (!existing) {
    await setPlayerCookie(playerId);
  }
  return playerId;
}

export function isDebugPlayerSlot(value: unknown): value is DebugPlayerSlot {
  return typeof value === "string" && Object.hasOwn(DEBUG_PLAYERS, value);
}

export async function switchToDebugPlayer(
  slot: DebugPlayerSlot,
): Promise<void> {
  const { id } = DEBUG_PLAYERS[slot];
  await ensurePlayerRow(id);
  await setPlayerCookie(id);
}

// Drops the current identity, as if this browser had never played.
export async function becomeNewPlayer(): Promise<void> {
  const id = crypto.randomUUID();
  await ensurePlayerRow(id);
  await setPlayerCookie(id);
}

export function getDebugPlayerSlot(
  playerId: string | null,
): DebugPlayerSlot | null {
  for (const slot of Object.keys(DEBUG_PLAYERS) as DebugPlayerSlot[]) {
    if (DEBUG_PLAYERS[slot].id === playerId) {
      return slot;
    }
  }
  return null;
}
