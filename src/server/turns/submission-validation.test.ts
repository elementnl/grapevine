import { describe, expect, it } from "vitest";

import {
  isAssignmentId,
  normalizeGuess,
  parseTurnSubmission,
} from "@/server/turns/submission-validation";

const drawing = {
  v: 1,
  strokes: [{ w: 1, erase: false, pts: [12, 14, 0, 3, 5, 10] }],
};

describe("turn submission validation", () => {
  it("normalizes guess whitespace and invisible characters", () => {
    expect(normalizeGuess("  a​  red\n balloon ")).toBe("a red balloon");
  });

  it("accepts a guess within the length limits", () => {
    expect(parseTurnSubmission({ text: " a cat " })).toEqual({
      kind: "guess",
      text: "a cat",
    });
    expect(parseTurnSubmission({ text: " ab " })).toBeNull();
    expect(parseTurnSubmission({ text: "x".repeat(81) })).toBeNull();
  });

  it("accepts a valid drawing and rejects anything else", () => {
    expect(parseTurnSubmission({ drawing })).toEqual({ kind: "draw", drawing });
    expect(parseTurnSubmission({ drawing: { v: 1 } })).toBeNull();
    expect(parseTurnSubmission({ skip: true })).toBeNull();
    expect(parseTurnSubmission("a cat")).toBeNull();
  });

  it("only accepts uuid assignment ids", () => {
    expect(isAssignmentId("4f2c1a6e-3b7d-4c2e-9f10-2a3b4c5d6e7f")).toBe(true);
    expect(isAssignmentId("42")).toBe(false);
    expect(isAssignmentId(42)).toBe(false);
  });
});
