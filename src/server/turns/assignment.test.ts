import { describe, expect, it } from "vitest";

import {
  type Candidate,
  eligibleNodes,
  nodeWeight,
  pickWeighted,
  turnsUsed,
} from "@/server/turns/assignment";

const me = "00000000-0000-4000-8000-00000000000a";
const them = "00000000-0000-4000-8000-00000000000b";

function node(
  kind: Candidate["kind"],
  id: number,
  height: number,
  playerId: string | null = them,
): Candidate {
  return { kind, id, height, playerId };
}

describe("nodeWeight", () => {
  it("favours leaves on a power curve", () => {
    expect(nodeWeight(0)).toBe(1);
    expect(nodeWeight(1)).toBeCloseTo(0.354, 3);
    expect(nodeWeight(2)).toBeCloseTo(0.192, 3);
    expect(nodeWeight(3, 1)).toBe(0.25);
  });
});

describe("eligibleNodes", () => {
  it("leaves out the player's own nodes and anything excluded", () => {
    const nodes = [
      node("drawing", 1, 2, me),
      node("drawing", 2, 0),
      node("guess", 1, 1),
      node("guess", 2, 0),
      node("drawing", 3, 0, null),
    ];
    const excluded = new Set(["guess-1", "drawing-2"]);

    expect(eligibleNodes(nodes, me, excluded)).toEqual([
      node("guess", 2, 0),
      node("drawing", 3, 0, null),
    ]);
  });

  it("does not confuse a drawing and a guess with the same id", () => {
    const nodes = [node("drawing", 5, 0), node("guess", 5, 0)];
    expect(eligibleNodes(nodes, me, new Set(["guess-5"]))).toEqual([
      node("drawing", 5, 0),
    ]);
  });

  it("lets a visitor without a player id see every node", () => {
    expect(eligibleNodes([node("drawing", 1, 0, me)], null, new Set())).toEqual(
      [node("drawing", 1, 0, me)],
    );
  });
});

describe("pickWeighted", () => {
  const nodes = [node("drawing", 1, 3), node("drawing", 2, 0)];

  it("returns null when there is nothing to pick", () => {
    expect(pickWeighted([], () => 0.5)).toBeNull();
  });

  it("walks the cumulative weights", () => {
    // Weights 0.125 and 1 with exponent 1.5: the first node owns the bottom 11%.
    expect(pickWeighted(nodes, () => 0)?.id).toBe(1);
    expect(pickWeighted(nodes, () => 0.1)?.id).toBe(1);
    expect(pickWeighted(nodes, () => 0.12)?.id).toBe(2);
    expect(pickWeighted(nodes, () => 0.999999)?.id).toBe(2);
  });

  it("picks roughly in proportion to weight", () => {
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let leaves = 0;
    for (let draw = 0; draw < 10_000; draw += 1) {
      if (pickWeighted(nodes, random)?.id === 2) {
        leaves += 1;
      }
    }
    expect(leaves / 10_000).toBeCloseTo(1 / 1.125, 1);
  });
});

describe("turnsUsed", () => {
  const now = Date.parse("2026-11-12T12:00:00Z");

  it("counts submitted and still-open turns, not lapsed ones", () => {
    expect(
      turnsUsed(
        [
          { outcome: "submitted", expiresAt: "2026-11-12T11:00:00Z" },
          { outcome: null, expiresAt: "2026-11-12T12:01:00Z" },
          { outcome: null, expiresAt: "2026-11-12T11:59:00Z" },
          { outcome: "expired", expiresAt: "2026-11-12T11:00:00Z" },
        ],
        now,
      ),
    ).toBe(2);
  });
});
