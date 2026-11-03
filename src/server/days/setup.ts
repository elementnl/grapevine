import "server-only";

import { GameError } from "@/server/shared/error";
import { getSupabaseAdminClient } from "@/server/shared/supabase";
import type { Json } from "@/types/database";
import type { DrawingData } from "@/types/drawing";
import type { DaySetupAction } from "@/server/days/setup-validation";

function drawingToJson(drawing: DrawingData): Json {
  return {
    v: 1,
    strokes: drawing.strokes.map(({ erase, pts, w }) => ({
      erase,
      pts,
      w,
    })),
  };
}

function matchesDrawing(stored: Json, candidate: DrawingData): boolean {
  if (
    typeof stored !== "object" ||
    stored === null ||
    Array.isArray(stored) ||
    stored.v !== 1 ||
    !Array.isArray(stored.strokes) ||
    stored.strokes.length !== candidate.strokes.length
  ) {
    return false;
  }

  return stored.strokes.every((stroke, index) => {
    const expected = candidate.strokes[index];
    if (!expected) {
      return false;
    }

    return (
      typeof stroke === "object" &&
      stroke !== null &&
      !Array.isArray(stroke) &&
      stroke.w === expected.w &&
      stroke.erase === expected.erase &&
      Array.isArray(stroke.pts) &&
      stroke.pts.length === expected.pts.length &&
      stroke.pts.every(
        (point, pointIndex) => point === expected.pts[pointIndex],
      )
    );
  });
}

async function getStarterDrawings(date: string) {
  const { data, error } = await getSupabaseAdminClient()
    .from("drawings")
    .select("id, strokes, status")
    .eq("day", date)
    .is("parent_guess_id", null)
    .order("id", { ascending: true })
    .limit(3);

  if (error) {
    throw new Error(`Supabase request failed: ${error.message}`);
  }
  return data;
}

async function createScheduledDay(
  date: string,
  initialPrompt: string,
): Promise<{
  date: string;
  initialPrompt: string;
  starterCount: number;
  status: "scheduled" | "live";
}> {
  const client = getSupabaseAdminClient();
  const { data: existingDay, error: existingDayError } = await client
    .from("days")
    .select("date, initial_prompt, status")
    .eq("date", date)
    .maybeSingle();

  if (existingDayError) {
    throw new Error(`Supabase request failed: ${existingDayError.message}`);
  }
  if (existingDay) {
    if (
      (existingDay.status !== "scheduled" && existingDay.status !== "live") ||
      existingDay.initial_prompt !== initialPrompt
    ) {
      throw new GameError(
        "That date already has a day with a different prompt or status.",
        409,
        "day_already_exists",
      );
    }

    const starters = await getStarterDrawings(date);
    if (starters.length > 2) {
      throw new GameError(
        "This day has more than two starter drawings and cannot be resumed.",
        409,
        "invalid_starter_count",
      );
    }

    return {
      date,
      initialPrompt: existingDay.initial_prompt,
      starterCount: starters.length,
      status: existingDay.status,
    };
  }

  const { error: insertError } = await client.from("days").insert({
    date,
    initial_prompt: initialPrompt,
    status: "scheduled",
  });

  if (insertError) {
    throw new Error(`Supabase request failed: ${insertError.message}`);
  }

  return { date, initialPrompt, starterCount: 0, status: "scheduled" };
}

async function saveStarterDrawing(
  date: string,
  starterIndex: 1 | 2,
  drawing: DrawingData,
): Promise<{ date: string; starterCount: number }> {
  const client = getSupabaseAdminClient();
  const { data: day, error: dayError } = await client
    .from("days")
    .select("status")
    .eq("date", date)
    .maybeSingle();

  if (dayError) {
    throw new Error(`Supabase request failed: ${dayError.message}`);
  }
  if (!day || day.status !== "scheduled") {
    throw new GameError(
      "Starter drawings can only be added to a scheduled day.",
      409,
      "day_not_scheduled",
    );
  }

  const starters = await getStarterDrawings(date);
  if (starters.length > 2) {
    throw new GameError(
      "This day already has more than two starter drawings.",
      409,
      "invalid_starter_count",
    );
  }

  const existingStarter = starters[starterIndex - 1];
  if (existingStarter) {
    if (matchesDrawing(existingStarter.strokes, drawing)) {
      return { date, starterCount: starters.length };
    }
    throw new GameError(
      `Starter drawing ${starterIndex} has already been saved.`,
      409,
      "starter_already_saved",
    );
  }

  if (starters.length !== starterIndex - 1) {
    throw new GameError(
      `Save starter drawing ${starters.length + 1} first.`,
      409,
      "starter_order_invalid",
    );
  }

  const { error: insertError } = await client.from("drawings").insert({
    day: date,
    parent_guess_id: null,
    player_id: null,
    status: "visible",
    strokes: drawingToJson(drawing),
  });

  if (insertError) {
    throw new Error(`Supabase request failed: ${insertError.message}`);
  }

  return { date, starterCount: starters.length + 1 };
}

async function publishDay(
  date: string,
): Promise<{ date: string; status: "live" }> {
  const client = getSupabaseAdminClient();
  const { data: day, error: dayError } = await client
    .from("days")
    .select("status")
    .eq("date", date)
    .maybeSingle();

  if (dayError) {
    throw new Error(`Supabase request failed: ${dayError.message}`);
  }
  if (!day || (day.status !== "scheduled" && day.status !== "live")) {
    throw new GameError(
      "Only a scheduled day can be published.",
      409,
      "day_not_scheduled",
    );
  }

  const starters = await getStarterDrawings(date);
  if (
    starters.length !== 2 ||
    starters.some((starter) => starter.status !== "visible")
  ) {
    throw new GameError(
      "Save exactly two starter drawings before publishing the day.",
      409,
      "starter_drawings_incomplete",
    );
  }

  const { data: liveDays, error: liveDaysError } = await client
    .from("days")
    .select("date")
    .eq("status", "live");

  if (liveDaysError) {
    throw new Error(`Supabase request failed: ${liveDaysError.message}`);
  }
  if (liveDays.some((liveDay) => liveDay.date !== date)) {
    throw new GameError(
      "Another day is already live. Freeze it before publishing this day.",
      409,
      "another_day_is_live",
    );
  }

  if (day.status === "scheduled") {
    const { data: updatedDay, error: updateError } = await client
      .from("days")
      .update({ opened_at: new Date().toISOString(), status: "live" })
      .eq("date", date)
      .eq("status", "scheduled")
      .select("date")
      .maybeSingle();

    if (updateError) {
      throw new Error(`Supabase request failed: ${updateError.message}`);
    }
    if (!updatedDay) {
      throw new GameError(
        "This day changed while it was being published. Reload and try again.",
        409,
        "day_state_changed",
      );
    }
  }

  return { date, status: "live" };
}

export function runDaySetupAction(action: DaySetupAction) {
  switch (action.action) {
    case "create":
      return createScheduledDay(action.date, action.initialPrompt);
    case "starter":
      return saveStarterDrawing(
        action.date,
        action.starterIndex,
        action.drawing,
      );
    case "publish":
      return publishDay(action.date);
  }
}
