import { describe, expect, it } from "vitest";

import { decideTurn, findChainEnd } from "@/server/turns/chain";
import type { ChainNode } from "@/types/game";

const drawing = {
  v: 1 as const,
  strokes: [{ erase: false, pts: [1, 1, 0], w: 1 }],
};

function drawingNode(
  id: number,
  parentId: number | null,
  depth: number,
  playerId: string,
): ChainNode {
  return { kind: "drawing", id, parentId, depth, playerId, drawing };
}

function guessNode(
  id: number,
  parentId: number,
  depth: number,
  playerId: string,
  text: string,
): ChainNode {
  return { kind: "guess", id, parentId, depth, playerId, text };
}

const starter = drawingNode(1, null, 1, "a");
const guess = guessNode(1, 1, 2, "b", "a cat on a bike");

describe("decideTurn", () => {
  it("reports no game when nothing is live", () => {
    expect(decideTurn([], "a")).toEqual({ kind: "no_game" });
  });

  it("asks someone else to guess the starter", () => {
    expect(decideTurn([starter], "b")).toEqual({
      kind: "guess",
      drawingId: 1,
      drawing,
    });
    expect(decideTurn([starter], null)).toMatchObject({ kind: "guess" });
  });

  it("makes the author of the end of the line wait", () => {
    expect(decideTurn([starter], "a")).toEqual({ kind: "wait" });
    expect(decideTurn([starter, guess], "b")).toEqual({ kind: "wait" });
  });

  it("asks the other player to draw the latest guess", () => {
    expect(decideTurn([starter, guess], "a")).toEqual({
      kind: "draw",
      guessId: 1,
      prompt: "a cat on a bike",
    });
  });
});

describe("chain", () => {
  it("prefers the earliest node when two land at the same depth", () => {
    const late = guessNode(2, 1, 2, "c", "a dog on a bike");
    expect(findChainEnd([starter, late, guess])).toBe(guess);
  });
});
