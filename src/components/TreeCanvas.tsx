"use client";

import Link from "next/link";
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useDrawingImage } from "@/components/DrawingView";
import { roughArrow, roughRect } from "@/components/sketch";
import {
  type LaidOutNode,
  TREE_NODE_SIZE,
  type TreeLayout,
} from "@/components/tree-layout";
import type { GameStatus } from "@/types/game";

type TreeCanvasProps = {
  layout: TreeLayout;
  date: string;
  status: GameStatus;
};

type View = { x: number; y: number; scale: number };

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_STEP = 1.2;
const PAN_STEP = 80;
const TOP_INSET = 96;
const SIDE_INSET = 32;
const DOT_SPACING = 22;

const STATUS_LABEL: Record<GameStatus, string> = {
  scheduled: "Not started",
  live: "Still growing",
  frozen: "Finished",
};

const clampScale = (scale: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

function PromptNode({
  node,
}: {
  node: Extract<LaidOutNode, { kind: "prompt" }>;
}) {
  const [revealed, setRevealed] = useState(false);
  const { width, height } = TREE_NODE_SIZE.prompt;
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <rect className="fill-grape-wash" height={height} rx={10} width={width} />
      <path
        className="stroke-ink"
        d={roughRect(0, 0, width, height, node.key)}
        fill="none"
        strokeLinecap="round"
        strokeWidth={2}
      />
      <foreignObject height={height} width={width}>
        <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
          <span className="font-hand text-sm text-ink-muted">
            The secret prompt
          </span>
          {revealed ? (
            <span className="font-hand text-xl leading-tight font-bold">
              {node.text}
            </span>
          ) : (
            <button
              className="btn btn-primary px-3 py-0.5 text-base"
              onClick={() => setRevealed(true)}
              type="button"
            >
              Reveal it
            </button>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

function DrawingNode({
  node,
}: {
  node: Extract<LaidOutNode, { kind: "drawing" }>;
}) {
  const { width, height } = TREE_NODE_SIZE.drawing;
  const src = useDrawingImage(node.drawing);
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <rect fill="white" height={height} width={width} />
      {src && (
        <image
          aria-label={`Drawing ${node.index}`}
          height={height}
          href={src}
          role="img"
          width={width}
        />
      )}
      <path
        className="stroke-ink"
        d={roughRect(0, 0, width, height, node.key)}
        fill="none"
        strokeLinecap="round"
        strokeWidth={2}
      />
    </g>
  );
}

function GuessNode({
  node,
}: {
  node: Extract<LaidOutNode, { kind: "guess" }>;
}) {
  const { width, height } = TREE_NODE_SIZE.guess;
  return (
    <foreignObject height={height} width={width} x={node.x} y={node.y}>
      <div className="flex h-full items-center justify-center px-2 text-center">
        <p className="font-hand text-2xl leading-tight font-bold [overflow-wrap:anywhere]">
          <span className="marker">{node.text}</span>
        </p>
      </div>
    </foreignObject>
  );
}

export function TreeCanvas({ layout, date, status }: TreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; view: View } | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: TOP_INSET, scale: 1 });
  const [dragging, setDragging] = useState(false);

  // Fit the tree's width to the screen, starting at the prompt.
  const fit = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const scale = clampScale(
      Math.min(1, (container.clientWidth - SIDE_INSET * 2) / layout.width),
    );
    setView({
      x: (container.clientWidth - layout.width * scale) / 2,
      y: TOP_INSET,
      scale,
    });
  }, [layout.width]);

  useLayoutEffect(fit, [fit]);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setView((current) => {
      const scale = clampScale(current.scale * factor);
      const ratio = scale / current.scale;
      return {
        x: px - (px - current.x) * ratio,
        y: py - (py - current.y) * ratio,
        scale,
      };
    });
  }, []);

  const zoomFromCentre = (factor: number) => {
    const container = containerRef.current;
    if (container) {
      zoomAt(factor, container.clientWidth / 2, container.clientHeight / 2);
    }
  };

  // Trackpad and wheel: pinch (ctrl) zooms, scrolling pans, like Excalidraw.
  // Attached by hand because React's wheel listener is passive.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const bounds = container.getBoundingClientRect();
        zoomAt(
          Math.exp(-event.deltaY * 0.01),
          event.clientX - bounds.left,
          event.clientY - bounds.top,
        );
      } else {
        setView((current) => ({
          ...current,
          x: current.x - event.deltaX,
          y: current.y - event.deltaY,
        }));
      }
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button, a")) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    setDragging(true);
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.hypot(a!.x - b!.x, a!.y - b!.y),
        view,
      };
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointersRef.current.get(event.pointerId);
    if (!previous) {
      return;
    }
    const next = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, next);

    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const bounds = event.currentTarget.getBoundingClientRect();
      const midX = (a!.x + b!.x) / 2 - bounds.left;
      const midY = (a!.y + b!.y) / 2 - bounds.top;
      const scale = clampScale(
        (pinch.view.scale * Math.hypot(a!.x - b!.x, a!.y - b!.y)) /
          pinch.distance,
      );
      const ratio = scale / pinch.view.scale;
      setView({
        x: midX - (midX - pinch.view.x) * ratio,
        y: midY - (midY - pinch.view.y) * ratio,
        scale,
      });
      return;
    }

    setView((current) => ({
      ...current,
      x: current.x + next.x - previous.x,
      y: current.y + next.y - previous.y,
    }));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      setDragging(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const pan: Record<string, [number, number]> = {
      ArrowUp: [0, PAN_STEP],
      ArrowDown: [0, -PAN_STEP],
      ArrowLeft: [PAN_STEP, 0],
      ArrowRight: [-PAN_STEP, 0],
    };
    const step = pan[event.key];
    if (step) {
      event.preventDefault();
      setView((current) => ({
        ...current,
        x: current.x + step[0],
        y: current.y + step[1],
      }));
    } else if (event.key === "+" || event.key === "=") {
      zoomFromCentre(ZOOM_STEP);
    } else if (event.key === "-") {
      zoomFromCentre(1 / ZOOM_STEP);
    } else if (event.key === "0") {
      fit();
    }
  };

  const dotSize = DOT_SPACING * view.scale;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        aria-label="Game tree. Drag or use the arrow keys to move around; plus and minus zoom, 0 fits the tree."
        className={`absolute inset-0 touch-none select-none focus-visible:outline-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={containerRef}
        role="region"
        style={{
          // Solid underneath, so the page's fixed dot grid can't show through.
          backgroundColor: "var(--color-board)",
          backgroundImage:
            "radial-gradient(var(--color-board-dot) 1px, transparent 1.2px)",
          backgroundPosition: `${view.x}px ${view.y}px`,
          backgroundSize: `${dotSize}px ${dotSize}px`,
        }}
        tabIndex={0}
      >
        <svg
          className="absolute top-0 left-0 overflow-visible"
          height={layout.height}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "0 0",
          }}
          width={layout.width}
        >
          <g
            className="stroke-ink-muted"
            fill="none"
            strokeLinecap="round"
            strokeWidth={2}
          >
            {layout.edges.map((edge) => (
              <path
                d={roughArrow(edge.x1, edge.y1, edge.x2, edge.y2, edge.key)}
                key={edge.key}
              />
            ))}
          </g>
          {layout.nodes.map((node) =>
            node.kind === "prompt" ? (
              <PromptNode key={node.key} node={node} />
            ) : node.kind === "drawing" ? (
              <DrawingNode key={node.key} node={node} />
            ) : (
              <GuessNode key={node.key} node={node} />
            ),
          )}
        </svg>
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="sketch pointer-events-auto flex items-center gap-3 py-1.5 pr-4 pl-2">
          <Link className="btn btn-quiet px-3 py-0.5 text-base" href="/">
            ← Back to the game
          </Link>
          <span className="font-hand text-lg font-bold text-grape">
            Grapevine
          </span>
        </div>
        <p className="sketch-alt pointer-events-auto px-4 py-2 font-hand text-base text-ink-muted">
          {STATUS_LABEL[status]} · {date}
        </p>
      </header>

      <div
        aria-label="Zoom"
        className="sketch absolute bottom-4 left-4 flex items-center gap-1 p-1"
        role="group"
      >
        <button
          aria-label="Zoom out"
          className="btn btn-quiet h-9 w-9 p-0 text-xl"
          onClick={() => zoomFromCentre(1 / ZOOM_STEP)}
          type="button"
        >
          −
        </button>
        <button
          aria-label="Fit the tree to the screen"
          className="btn btn-quiet h-9 min-w-16 px-2 py-0 text-base tabular-nums"
          onClick={fit}
          type="button"
        >
          {Math.round(view.scale * 100)}%
        </button>
        <button
          aria-label="Zoom in"
          className="btn btn-quiet h-9 w-9 p-0 text-xl"
          onClick={() => zoomFromCentre(ZOOM_STEP)}
          type="button"
        >
          +
        </button>
      </div>

      <ol className="sr-only">
        {layout.nodes.map((node) => (
          <li key={node.key}>
            {node.kind === "prompt"
              ? "The secret prompt (hidden until revealed)"
              : node.kind === "drawing"
                ? `Drawing ${node.index}`
                : `Guess: ${node.text}`}
          </li>
        ))}
      </ol>
    </div>
  );
}
