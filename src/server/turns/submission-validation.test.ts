import { describe, expect, it } from "vitest";

import {
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
    expect(
      parseTurnSubmission({ kind: "guess", drawingId: 4, text: " a cat " }),
    ).toEqual({ kind: "guess", drawingId: 4, text: "a cat" });
    expect(
      parseTurnSubmission({ kind: "guess", drawingId: 4, text: " ab " }),
    ).toBeNull();
    expect(
      parseTurnSubmission({
        kind: "guess",
        drawingId: 4,
        text: "x".repeat(81),
      }),
    ).toBeNull();
  });

  it("accepts a drawing for a guess and rejects bad ids", () => {
    expect(parseTurnSubmission({ kind: "draw", guessId: 7, drawing })).toEqual({
      kind: "draw",
      guessId: 7,
      drawing,
    });
    expect(
      parseTurnSubmission({ kind: "draw", guessId: 0, drawing }),
    ).toBeNull();
    expect(
      parseTurnSubmission({ kind: "draw", guessId: 7, drawing: { v: 1 } }),
    ).toBeNull();
    expect(parseTurnSubmission({ kind: "skip" })).toBeNull();
  });
});
