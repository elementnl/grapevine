import "server-only";

import { HEIGHT_EXPONENT } from "@/constants/game";

// A node a player can be handed: a drawing to guess, or a cluster (its head
// guess) to draw.
export type Candidate = {
  kind: "drawing" | "guess";
  id: number;
  height: number;
  playerId: string | null;
};

export type AssignmentRecord = {
  outcome: string | null;
  expiresAt: string;
};

export function nodeKey(node: Pick<Candidate, "kind" | "id">): string {
  return `${node.kind}-${node.id}`;
}

// Leaves weigh 1, then 0.35, 0.19, 0.13 with the default exponent: a power
// curve keeps the last few levels in play however big the tree gets.
export function nodeWeight(
  height: number,
  exponent: number = HEIGHT_EXPONENT,
): number {
  return 1 / (1 + height) ** exponent;
}

// `excluded` holds the keys of nodes the player was already given and of
// clusters containing their own guess. Their own drawings are left out by author.
export function eligibleNodes<T extends Candidate>(
  candidates: T[],
  playerId: string | null,
  excluded: ReadonlySet<string>,
): T[] {
  return candidates.filter(
    (node) =>
      (playerId === null || node.playerId !== playerId) &&
      !excluded.has(nodeKey(node)),
  );
}

export function pickWeighted<T extends Pick<Candidate, "height">>(
  nodes: T[],
  random: () => number = Math.random,
  exponent: number = HEIGHT_EXPONENT,
): T | null {
  const weights = nodes.map((node) => nodeWeight(node.height, exponent));
  let remaining = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (const [index, node] of nodes.entries()) {
    remaining -= weights[index]!;
    if (remaining < 0) {
      return node;
    }
  }
  // Floating point can leave a sliver past the end.
  return nodes.at(-1) ?? null;
}

// A turn counts once it's submitted, or while it's still open. One that ran
// out without a submission is given back.
export function turnsUsed(
  assignments: AssignmentRecord[],
  now: number,
): number {
  return assignments.filter(
    (assignment) =>
      assignment.outcome === "submitted" ||
      (assignment.outcome === null && Date.parse(assignment.expiresAt) > now),
  ).length;
}
