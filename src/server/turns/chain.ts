import "server-only";

import type { ChainNode, Turn } from "@/types/game";

// The deepest node is the end of the line. Ties go to the earliest submission,
// so a race that briefly branches the line still has one canonical end.
export function findChainEnd(nodes: ChainNode[]): ChainNode | null {
  let end: ChainNode | null = null;
  for (const node of nodes) {
    if (
      !end ||
      node.depth > end.depth ||
      (node.depth === end.depth && node.id < end.id)
    ) {
      end = node;
    }
  }
  return end;
}

export function decideTurn(nodes: ChainNode[], playerId: string | null): Turn {
  const end = findChainEnd(nodes);
  if (!end) {
    return { kind: "no_game" };
  }
  if (playerId !== null && end.playerId === playerId) {
    return { kind: "wait" };
  }
  return end.kind === "drawing"
    ? { kind: "guess", drawingId: end.id, drawing: end.drawing }
    : { kind: "draw", guessId: end.id, prompt: end.text };
}
