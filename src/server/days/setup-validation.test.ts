import { describe, expect, it } from "vitest";

import {
  isGameDate,
  nextGameDate,
  parseDaySetupAction,
} from "@/server/days/setup-validation";

const validDrawing = {
  v: 1,
  strokes: [{ w: 1, erase: false, pts: [12, 14, 0] }],
};

describe("day setup validation", () => {
  it("accepts real calendar dates and rejects malformed dates", () => {
    expect(isGameDate("2026-11-02")).toBe(true);
    expect(isGameDate("2026-02-30")).toBe(false);
    expect(isGameDate("not-a-date")).toBe(false);
  });

  it("trims and validates an initial prompt", () => {
    expect(
      parseDaySetupAction({
        action: "create",
        date: "2026-11-02",
        initialPrompt: "  a red balloon  ",
      }),
    ).toEqual({
      action: "create",
      date: "2026-11-02",
      initialPrompt: "a red balloon",
    });
    expect(
      parseDaySetupAction({
        action: "create",
        date: "2026-11-02",
        initialPrompt: "  ",
      }),
    ).toBeNull();
  });

  it("accepts only the single starter position with a valid drawing", () => {
    expect(
      parseDaySetupAction({
        action: "starter",
        date: "2026-11-02",
        starterIndex: 1,
        drawing: validDrawing,
      }),
    ).toEqual({
      action: "starter",
      date: "2026-11-02",
      starterIndex: 1,
      drawing: validDrawing,
    });
    expect(
      parseDaySetupAction({
        action: "starter",
        date: "2026-11-02",
        starterIndex: 2,
        drawing: validDrawing,
      }),
    ).toBeNull();
  });

  it("accepts the publish action for a valid date", () => {
    expect(
      parseDaySetupAction({ action: "publish", date: "2026-11-02" }),
    ).toEqual({ action: "publish", date: "2026-11-02" });
  });

  it("accepts the freeze action for a valid date", () => {
    expect(
      parseDaySetupAction({ action: "freeze", date: "2026-11-02" }),
    ).toEqual({ action: "freeze", date: "2026-11-02" });
  });

  it("accepts a quick start with a prompt and a drawing", () => {
    expect(
      parseDaySetupAction({
        action: "start",
        initialPrompt: " a red balloon ",
        drawing: validDrawing,
      }),
    ).toEqual({
      action: "start",
      initialPrompt: "a red balloon",
      drawing: validDrawing,
    });
    expect(
      parseDaySetupAction({ action: "start", initialPrompt: "a red balloon" }),
    ).toBeNull();
  });

  it("picks today or the day after the latest game", () => {
    expect(nextGameDate("2026-11-03", null)).toBe("2026-11-03");
    expect(nextGameDate("2026-11-03", "2026-11-01")).toBe("2026-11-03");
    expect(nextGameDate("2026-11-03", "2026-11-03")).toBe("2026-11-04");
    expect(nextGameDate("2026-11-03", "2026-12-31")).toBe("2027-01-01");
  });
});
