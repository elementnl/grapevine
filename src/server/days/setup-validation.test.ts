import { describe, expect, it } from "vitest";

import {
  isGameDate,
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

  it("accepts the two starter positions only with valid drawings", () => {
    expect(
      parseDaySetupAction({
        action: "starter",
        date: "2026-11-02",
        starterIndex: 2,
        drawing: validDrawing,
      }),
    ).toEqual({
      action: "starter",
      date: "2026-11-02",
      starterIndex: 2,
      drawing: validDrawing,
    });
    expect(
      parseDaySetupAction({
        action: "starter",
        date: "2026-11-02",
        starterIndex: 3,
        drawing: validDrawing,
      }),
    ).toBeNull();
  });

  it("accepts the publish action for a valid date", () => {
    expect(
      parseDaySetupAction({ action: "publish", date: "2026-11-02" }),
    ).toEqual({ action: "publish", date: "2026-11-02" });
  });
});
