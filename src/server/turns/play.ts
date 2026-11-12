import "server-only";

import {
  DRAW_SECONDS,
  GUESS_SECONDS,
  TURN_GRACE_SECONDS,
  TURNS_PER_DAY,
} from "@/constants/game";
import { drawingToJson, isDrawingData } from "@/server/drawings/validation";
import { isLocalDebugEnabled } from "@/server/shared/development-only";
import { GameError } from "@/server/shared/error";
import { getSupabaseAdminClient } from "@/server/shared/supabase";
import {
  type Candidate,
  eligibleNodes,
  nodeKey,
  pickWeighted,
  turnsUsed,
} from "@/server/turns/assignment";
import { getLiveDay } from "@/server/turns/turns";
import type { OpenTurn, Turn, TurnSubmission } from "@/types/game";

const ASSIGNMENT_COLUMNS =
  "id, drawing_id, guess_id, issued_at, expires_at, outcome";

type AssignmentRow = {
  id: string;
  drawing_id: number | null;
  guess_id: number | null;
  issued_at: string;
  expires_at: string;
  outcome: string | null;
};

function check(error: { message: string } | null): void {
  if (error) {
    throw new Error(`Supabase request failed: ${error.message}`);
  }
}

// A drawing is assigned to be guessed; a cluster head is assigned to be drawn.
function timeLimitSec(row: Pick<AssignmentRow, "drawing_id">): number {
  return row.drawing_id !== null ? GUESS_SECONDS : DRAW_SECONDS;
}

function endsAt(row: AssignmentRow): number {
  return Date.parse(row.issued_at) + timeLimitSec(row) * 1000;
}

// Shown as in progress only until its timer ends. The grace period after that
// is for a submission already on its way, not for resuming after a reload.
function findOpen(rows: AssignmentRow[], now: number): AssignmentRow | null {
  return rows.find((row) => row.outcome === null && endsAt(row) > now) ?? null;
}

function turnsLeft(rows: AssignmentRow[], now: number): number | null {
  if (isLocalDebugEnabled()) {
    return null;
  }
  const used = turnsUsed(
    rows.map((row) => ({ outcome: row.outcome, expiresAt: row.expires_at })),
    now,
  );
  return Math.max(0, TURNS_PER_DAY - used);
}

async function loadPlayerState(dayId: string, playerId: string | null) {
  const client = getSupabaseAdminClient();
  const [drawings, guesses, assignments] = await Promise.all([
    client
      .from("drawings")
      .select("id, height, player_id")
      .eq("day_id", dayId)
      .eq("status", "visible"),
    client
      .from("guesses")
      .select("id, height, player_id, cluster_id")
      .eq("day_id", dayId),
    playerId
      ? client
          .from("assignments")
          .select(ASSIGNMENT_COLUMNS)
          .eq("day_id", dayId)
          .eq("player_id", playerId)
      : Promise.resolve({ data: [] as AssignmentRow[], error: null }),
  ]);
  check(drawings.error);
  check(guesses.error);
  check(assignments.error);

  const candidates: Candidate[] = [
    ...drawings.data!.map((row) => ({
      kind: "drawing" as const,
      id: row.id,
      height: row.height,
      playerId: row.player_id,
    })),
    ...guesses
      .data!.filter((row) => row.cluster_id === null)
      .map((row) => ({
        kind: "guess" as const,
        id: row.id,
        height: row.height,
        playerId: row.player_id,
      })),
  ];

  const excluded = new Set<string>();
  for (const row of assignments.data!) {
    excluded.add(
      row.drawing_id !== null
        ? nodeKey({ kind: "drawing", id: row.drawing_id })
        : nodeKey({ kind: "guess", id: row.guess_id! }),
    );
  }
  // A player never draws a cluster their own guess is part of.
  for (const row of guesses.data!) {
    if (playerId !== null && row.player_id === playerId) {
      excluded.add(nodeKey({ kind: "guess", id: row.cluster_id ?? row.id }));
    }
  }

  return {
    eligible: eligibleNodes(candidates, playerId, excluded),
    assignments: assignments.data!,
  };
}

async function describeTurn(
  row: AssignmentRow,
  left: number | null,
): Promise<OpenTurn> {
  const client = getSupabaseAdminClient();
  const base = {
    assignmentId: row.id,
    endsAt: new Date(endsAt(row)).toISOString(),
    timeLimitSec: timeLimitSec(row),
    turnsLeft: left,
  };

  if (row.drawing_id !== null) {
    const { data, error } = await client
      .from("drawings")
      .select("strokes")
      .eq("id", row.drawing_id)
      .single();
    check(error);
    if (!isDrawingData(data!.strokes)) {
      throw new Error(`Drawing ${row.drawing_id} has invalid strokes.`);
    }
    return { ...base, task: "guess", drawing: data!.strokes };
  }

  const { data, error } = await client
    .from("guesses")
    .select("text")
    .eq("id", row.guess_id!)
    .single();
  check(error);
  return { ...base, task: "draw", prompt: data!.text };
}

// What the play page shows, without handing out anything new.
export async function getTurn(playerId: string | null): Promise<Turn> {
  const day = await getLiveDay();
  if (!day) {
    return { kind: "no_game" };
  }

  const { eligible, assignments } = await loadPlayerState(day.id, playerId);
  const now = Date.now();
  const left = turnsLeft(assignments, now);
  const open = findOpen(assignments, now);
  if (open) {
    return { kind: "playing", turn: await describeTurn(open, left) };
  }
  if (left === 0) {
    return { kind: "out_of_turns" };
  }
  return eligible.length > 0
    ? { kind: "ready", turnsLeft: left }
    : { kind: "nothing_to_play", turnsLeft: left };
}

// Hands the player a weighted random node, or the turn they already have open.
export async function requestTurn(playerId: string): Promise<Turn> {
  const day = await getLiveDay();
  if (!day) {
    throw new GameError("There is no game in progress.", 409, "day_closed");
  }

  const { eligible, assignments } = await loadPlayerState(day.id, playerId);
  const now = Date.now();
  const left = turnsLeft(assignments, now);
  const open = findOpen(assignments, now);
  if (open) {
    return { kind: "playing", turn: await describeTurn(open, left) };
  }
  if (left === 0) {
    throw new GameError(
      "You've played all your turns today. Come back tomorrow.",
      429,
      "out_of_turns",
    );
  }

  const node = pickWeighted(eligible);
  if (!node) {
    return { kind: "nothing_to_play", turnsLeft: left };
  }

  const target =
    node.kind === "drawing"
      ? { drawing_id: node.id, guess_id: null }
      : { drawing_id: null, guess_id: node.id };
  const limitSec = timeLimitSec(target);
  const { data, error } = await getSupabaseAdminClient()
    .from("assignments")
    .insert({
      day_id: day.id,
      player_id: playerId,
      ...target,
      issued_at: new Date(now).toISOString(),
      expires_at: new Date(
        now + (limitSec + TURN_GRACE_SECONDS) * 1000,
      ).toISOString(),
    })
    .select(ASSIGNMENT_COLUMNS)
    .single();

  // The unique (player, node) index: a double click picked the same node twice.
  if (error?.code === "23505") {
    throw new GameError(
      "That turn was just handed out. Try again.",
      409,
      "turn_conflict",
    );
  }
  check(error);
  return {
    kind: "playing",
    turn: await describeTurn(data!, left === null ? null : left - 1),
  };
}

export async function submitTurn(
  assignmentId: string,
  playerId: string,
  submission: TurnSubmission,
): Promise<{ ok: true }> {
  const day = await getLiveDay();
  if (!day) {
    throw new GameError("There is no game in progress.", 409, "day_closed");
  }

  const client = getSupabaseAdminClient();
  const { data: row, error } = await client
    .from("assignments")
    .select(`day_id, ${ASSIGNMENT_COLUMNS}`)
    .eq("id", assignmentId)
    .eq("player_id", playerId)
    .maybeSingle();
  check(error);

  if (!row) {
    throw new GameError("That turn doesn't exist.", 404, "not_found");
  }
  if (row.day_id !== day.id) {
    throw new GameError("That game has ended.", 409, "day_closed");
  }
  if (row.outcome !== null) {
    throw new GameError(
      "That turn was already submitted.",
      409,
      "already_submitted",
    );
  }
  if (Date.parse(row.expires_at) <= Date.now()) {
    throw new GameError(
      "Time ran out on that turn, so it wasn't counted.",
      409,
      "assignment_expired",
    );
  }
  const expected = row.drawing_id !== null ? "guess" : "draw";
  if (submission.kind !== expected) {
    throw new GameError(
      expected === "guess"
        ? "This turn needs a guess."
        : "This turn needs a drawing.",
      422,
      "invalid_payload",
    );
  }

  // Claim the turn before adding the node, so a double submit adds one node.
  const { data: claimed, error: claimError } = await client
    .from("assignments")
    .update({ outcome: "submitted" })
    .eq("id", assignmentId)
    .is("outcome", null)
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();
  check(claimError);
  if (!claimed) {
    throw new GameError(
      "That turn was already submitted.",
      409,
      "already_submitted",
    );
  }

  const { error: insertError } =
    submission.kind === "guess"
      ? await client.from("guesses").insert({
          day: day.date,
          day_id: day.id,
          drawing_id: row.drawing_id!,
          player_id: playerId,
          text: submission.text,
        })
      : await client.from("drawings").insert({
          day: day.date,
          day_id: day.id,
          parent_guess_id: row.guess_id!,
          player_id: playerId,
          // ponytail: visible straight away until drawing moderation sets pending.
          status: "visible",
          strokes: drawingToJson(submission.drawing),
        });

  if (insertError) {
    await client
      .from("assignments")
      .update({ outcome: null })
      .eq("id", assignmentId);
    throw new Error(`Supabase request failed: ${insertError.message}`);
  }
  return { ok: true };
}
