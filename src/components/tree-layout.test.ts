import { describe, expect, it } from "vitest";

import { TREE_NODE_SIZE, layoutTree } from "@/components/tree-layout";
import type { ChainNode } from "@/types/game";

const drawing = {
  v: 1 as const,
  strokes: [{ erase: false, pts: [1, 1, 0], w: 1 }],
};

const starter: ChainNode = {
  kind: "drawing",
  id: 1,
  parentId: null,
  depth: 1,
  playerId: "a",
  drawing,
};

function guess(id: number, parentId: number): ChainNode {
  return {
    kind: "guess",
    id,
    parentId,
    depth: 2,
    playerId: "b",
    text: `guess ${id}`,
  };
}

describe("layoutTree", () => {
  it("stacks a single line under the prompt with an arrow per link", () => {
    const layout = layoutTree("a cat", [starter, guess(1, 1)]);
    expect(layout.nodes.map((node) => node.kind)).toEqual([
      "prompt",
      "drawing",
      "guess",
    ]);
    expect(layout.edges).toHaveLength(2);

    const [prompt, first, second] = layout.nodes;
    expect(first!.y).toBeGreaterThan(prompt!.y + TREE_NODE_SIZE.prompt.height);
    expect(second!.y).toBeGreaterThan(first!.y + TREE_NODE_SIZE.drawing.height);
  });

  it("spreads siblings apart and centres the parent over them", () => {
    const layout = layoutTree("a cat", [starter, guess(1, 1), guess(2, 1)]);
    const guesses = layout.nodes.filter((node) => node.kind === "guess");
    const parent = layout.nodes.find((node) => node.kind === "drawing")!;

    expect(guesses[1]!.x).toBeGreaterThanOrEqual(
      guesses[0]!.x + TREE_NODE_SIZE.guess.width,
    );
    const childrenCentre =
      (guesses[0]!.x + guesses[1]!.x + TREE_NODE_SIZE.guess.width) / 2;
    expect(parent.x + TREE_NODE_SIZE.drawing.width / 2).toBeCloseTo(
      childrenCentre,
    );
  });

  it("leaves out nodes whose parent isn't shown", () => {
    const layout = layoutTree("a cat", [starter, guess(1, 99)]);
    expect(layout.nodes.map((node) => node.kind)).toEqual([
      "prompt",
      "drawing",
    ]);
  });
});
