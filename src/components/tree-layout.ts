import type { DrawingData } from "@/types/drawing";
import type { ChainNode } from "@/types/game";

export const TREE_NODE_SIZE = {
  prompt: { width: 280, height: 96 },
  drawing: { width: 220, height: 220 },
  guess: { width: 240, height: 84 },
} as const;
const SIBLING_GAP = 48;
const LEVEL_GAP = 72;

export type LaidOutNode =
  | { kind: "prompt"; key: string; x: number; y: number; text: string }
  | {
      kind: "drawing";
      key: string;
      x: number;
      y: number;
      drawing: DrawingData;
      index: number;
    }
  | { kind: "guess"; key: string; x: number; y: number; text: string };

export type LaidOutEdge = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type TreeLayout = {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
};

type TreeNode = {
  key: string;
  kind: "prompt" | "drawing" | "guess";
  source: ChainNode | null;
  children: TreeNode[];
  subtreeWidth: number;
};

function nodeSize(node: TreeNode) {
  return TREE_NODE_SIZE[node.kind];
}

function measure(node: TreeNode): number {
  const childrenWidth =
    node.children.reduce((sum, child) => sum + measure(child), 0) +
    SIBLING_GAP * Math.max(0, node.children.length - 1);
  node.subtreeWidth = Math.max(nodeSize(node).width, childrenWidth);
  return node.subtreeWidth;
}

// A tidy top-down tree: each parent sits centred over the span of its children.
export function layoutTree(prompt: string, nodes: ChainNode[]): TreeLayout {
  const byParent = new Map<string, ChainNode[]>();
  for (const node of nodes) {
    const parentKey =
      node.parentId === null
        ? "prompt"
        : `${node.kind === "drawing" ? "guess" : "drawing"}-${node.parentId}`;
    const siblings = byParent.get(parentKey) ?? [];
    siblings.push(node);
    byParent.set(parentKey, siblings);
  }

  const build = (
    key: string,
    kind: TreeNode["kind"],
    source: ChainNode | null,
  ): TreeNode => ({
    key,
    kind,
    source,
    subtreeWidth: 0,
    children: (byParent.get(key) ?? [])
      .sort((a, b) => a.id - b.id)
      .map((child) => build(`${child.kind}-${child.id}`, child.kind, child)),
  });

  const root = build("prompt", "prompt", null);
  measure(root);

  const laidOut: LaidOutNode[] = [];
  const edges: LaidOutEdge[] = [];
  let drawingIndex = 0;
  let height = 0;

  const place = (node: TreeNode, left: number, top: number) => {
    const size = nodeSize(node);
    const x = left + (node.subtreeWidth - size.width) / 2;
    height = Math.max(height, top + size.height);

    if (node.kind === "prompt") {
      laidOut.push({ kind: "prompt", key: node.key, x, y: top, text: prompt });
    } else if (node.source?.kind === "drawing") {
      drawingIndex += 1;
      laidOut.push({
        kind: "drawing",
        key: node.key,
        x,
        y: top,
        drawing: node.source.drawing,
        index: drawingIndex,
      });
    } else if (node.source?.kind === "guess") {
      laidOut.push({
        kind: "guess",
        key: node.key,
        x,
        y: top,
        text: node.source.text,
      });
    }

    const childrenWidth =
      node.children.reduce((sum, child) => sum + child.subtreeWidth, 0) +
      SIBLING_GAP * Math.max(0, node.children.length - 1);
    let childLeft = left + (node.subtreeWidth - childrenWidth) / 2;
    const childTop = top + size.height + LEVEL_GAP;

    for (const child of node.children) {
      const childSize = nodeSize(child);
      const childX = childLeft + (child.subtreeWidth - childSize.width) / 2;
      edges.push({
        key: `${node.key}->${child.key}`,
        x1: x + size.width / 2,
        y1: top + size.height + 8,
        x2: childX + childSize.width / 2,
        y2: childTop - 8,
      });
      place(child, childLeft, childTop);
      childLeft += child.subtreeWidth + SIBLING_GAP;
    }
  };

  place(root, 0, 0);
  return { nodes: laidOut, edges, width: root.subtreeWidth, height };
}
