"use client";

import {
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  paintDrawing,
  paintFill,
  paintStroke,
  paintStrokeSegment,
  strokeColor,
} from "@/components/paint-drawing";
import {
  DRAWING_COLORS,
  DRAWING_COLOR_ORDER,
  DRAWING_SIZE,
  ERASER_WIDTH_INDEX,
  MAX_DRAWING_POINTS,
  PEN_WIDTHS,
  PEN_WIDTH_INDEX,
} from "@/constants/drawing";
import type { DrawingData, Stroke } from "@/types/drawing";

type DrawingCanvasProps = {
  onSubmit: (drawing: DrawingData) => Promise<void>;
  prompt: string;
  submitLabel?: string;
  // When the turn's timer ends: the drawing submits itself, or, if the board
  // is empty, `onTimeUp` runs instead.
  endsAt?: string;
  onTimeUp?: () => void;
};

type DrawingPhase = "drawing" | "saving" | "saved" | "error";
type CanvasPoint = { x: number; y: number };
type Tool = "pen" | "fill" | "eraser";

const COLOR_NAMES = [
  "Ink",
  "Grey",
  "Light grey",
  "White",
  "Red",
  "Orange",
  "Amber",
  "Yellow",
  "Lime",
  "Green",
  "Forest green",
  "Teal",
  "Cyan",
  "Sky blue",
  "Blue",
  "Navy",
  "Indigo",
  "Grape",
  "Lilac",
  "Pink",
  "Raspberry",
  "Brown",
  "Tan",
  "Peach",
  "Clay",
  "Coral",
  "Golden orange",
  "Soft yellow",
  "Pale lime",
  "Spring green",
  "Mint",
  "Light cyan",
  "Periwinkle",
  "Soft violet",
];

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

const icons = {
  pen: (
    <Icon>
      <path d="M4 20l1.2-4.6L16.5 4.1a2 2 0 0 1 2.9 0l.5.5a2 2 0 0 1 0 2.9L8.6 18.8z" />
      <path d="M14.5 6l3.5 3.5" />
    </Icon>
  ),
  fill: (
    <Icon>
      <path d="M5 11l6-6 8 8-6 6a2 2 0 0 1-2.8 0L5 13.8a2 2 0 0 1 0-2.8z" />
      <path d="M5 12h14" />
      <path d="M20 16s1.5 2 1.5 3a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3z" />
    </Icon>
  ),
  eraser: (
    <Icon>
      <path d="M7 20h12" />
      <path d="M4.5 15.5l9.8-9.8a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L12 18H7z" />
      <path d="M9.5 10.5l5 5" />
    </Icon>
  ),
  undo: (
    <Icon>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
    </Icon>
  ),
  redo: (
    <Icon>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0 0 10h3" />
    </Icon>
  ),
  clear: (
    <Icon>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </Icon>
  ),
};

const tools: Array<{ tool: Tool; label: string }> = [
  { tool: "pen", label: "Pen" },
  { tool: "fill", label: "Paint bucket" },
  { tool: "eraser", label: "Eraser" },
];

function countPoints(strokes: Stroke[]): number {
  return strokes.reduce((sum, stroke) => sum + stroke.pts.length / 3, 0);
}

export function DrawingCanvas({
  onSubmit,
  prompt,
  submitLabel = "Save drawing",
  endsAt,
  onTimeUp,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement>(null);
  const startedAtRef = useRef<number | null>(null);
  // Undo history: each entry is the whole list of strokes at that moment.
  const strokesRef = useRef<Stroke[]>([]);
  const pastRef = useRef<Stroke[][]>([]);
  const futureRef = useRef<Stroke[][]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const previousPointRef = useRef<CanvasPoint | null>(null);
  const lastRenderedPointRef = useRef<CanvasPoint | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pointCountRef = useRef(0);
  const lastTimestampRef = useRef(-1);
  const savingRef = useRef(false);
  const [phase, setPhase] = useState<DrawingPhase>("drawing");
  const [tool, setTool] = useState<Tool>("pen");
  const [penWidthIndex, setPenWidthIndex] = useState(PEN_WIDTH_INDEX);
  const [color, setColor] = useState(0);
  // What the toolbar needs from the history refs, mirrored for rendering.
  const [history, setHistory] = useState({
    canUndo: false,
    canRedo: false,
    hasDrawing: false,
  });
  const [message, setMessage] = useState<string | null>(null);

  const getContext = () =>
    canvasRef.current?.getContext("2d", { willReadFrequently: true }) ?? null;

  const repaintActiveStroke = useCallback(() => {
    const canvas = activeCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, DRAWING_SIZE, DRAWING_SIZE);
    if (activeStrokeRef.current) {
      paintStroke(context, activeStrokeRef.current);
    }
  }, []);

  const repaint = useCallback(() => {
    const context = canvasRef.current?.getContext("2d", {
      willReadFrequently: true,
    });
    if (context) {
      paintDrawing(context, strokesRef.current);
    }
    repaintActiveStroke();
  }, [repaintActiveStroke]);

  // The bucket reads pixels, so the board starts as solid white, not transparent.
  useEffect(repaint, [repaint]);

  const syncHistory = () =>
    setHistory({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
      hasDrawing: strokesRef.current.length > 0,
    });

  const commit = (next: Stroke[]) => {
    pastRef.current.push(strokesRef.current);
    strokesRef.current = next;
    futureRef.current = [];
    pointCountRef.current = countPoints(next);
    syncHistory();
  };

  const restore = (from: Stroke[][], to: Stroke[][]) => {
    const previous = from.pop();
    if (!previous || phase !== "drawing") {
      return;
    }
    to.push(strokesRef.current);
    strokesRef.current = previous;
    pointCountRef.current = countPoints(previous);
    syncHistory();
    repaint();
  };
  const undo = () => restore(pastRef.current, futureRef.current);
  const redo = () => restore(futureRef.current, pastRef.current);

  const clearBoard = () => {
    if (strokesRef.current.length === 0 || phase !== "drawing") {
      return;
    }
    commit([]);
    repaint();
  };

  // Cmd/Ctrl+Z to undo, with Shift (or Ctrl+Y) to redo; not while typing.
  const shortcutsRef = useRef({ undo, redo });
  useEffect(() => {
    shortcutsRef.current = { undo, redo };
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        !(event.metaKey || event.ctrlKey) ||
        target?.closest("input, textarea, [contenteditable]")
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          shortcutsRef.current.redo();
        } else {
          shortcutsRef.current.undo();
        }
      } else if (key === "y") {
        event.preventDefault();
        shortcutsRef.current.redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const submitDrawing = useCallback(async () => {
    if (savingRef.current || strokesRef.current.length === 0) {
      return;
    }

    savingRef.current = true;
    setPhase("saving");
    setMessage(null);

    const drawing: DrawingData = {
      v: 1,
      strokes: strokesRef.current.map((stroke) => ({
        ...stroke,
        pts: [...stroke.pts],
      })),
    };

    try {
      await onSubmit(drawing);
      setPhase("saved");
      setMessage("Drawing saved.");
    } catch (error) {
      savingRef.current = false;
      setPhase("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The drawing could not be saved. Try again.",
      );
    }
  }, [onSubmit]);

  const finishStroke = useCallback(() => {
    const stroke = activeStrokeRef.current;
    if (stroke) {
      const lastRenderedPoint = lastRenderedPointRef.current;
      const lastPoint = previousPointRef.current;
      const context = activeCanvasRef.current?.getContext("2d");
      if (lastRenderedPoint && lastPoint && context) {
        paintStrokeSegment(
          context,
          stroke,
          lastRenderedPoint,
          lastPoint,
          lastPoint,
        );
      }
      activeStrokeRef.current = null;
      previousPointRef.current = null;
      lastRenderedPointRef.current = null;
      pastRef.current.push(strokesRef.current);
      strokesRef.current = [...strokesRef.current, stroke];
      futureRef.current = [];
      syncHistory();
      repaint();
    }
    activePointerIdRef.current = null;
  }, [repaint]);

  const getNextTimestamp = () => {
    const startedAt = startedAtRef.current;
    if (startedAt === null) {
      return null;
    }

    const timestamp = Math.max(
      Math.floor(performance.now() - startedAt),
      lastTimestampRef.current + 1,
    );
    lastTimestampRef.current = timestamp;
    return timestamp;
  };

  const getCanvasPoint = (event: PointerEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          DRAWING_SIZE - 1,
          Math.round(
            ((event.clientX - bounds.left) / bounds.width) * DRAWING_SIZE,
          ),
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          DRAWING_SIZE - 1,
          Math.round(
            ((event.clientY - bounds.top) / bounds.height) * DRAWING_SIZE,
          ),
        ),
      ),
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      phase !== "drawing" ||
      activePointerIdRef.current !== null ||
      pointCountRef.current >= MAX_DRAWING_POINTS
    ) {
      return;
    }

    const point = getCanvasPoint(event);
    if (!point) {
      return;
    }
    if (startedAtRef.current === null) {
      startedAtRef.current = performance.now();
    }

    const context = getContext();
    const timestamp = getNextTimestamp();
    if (!context || timestamp === null) {
      setMessage("Your browser could not start the drawing canvas.");
      return;
    }
    setMessage(null);

    if (tool === "fill") {
      // A fill picks the area under the cursor, so a click in the margin
      // around the board would land on the edge pixel; ignore it instead.
      const bounds = canvasRef.current?.getBoundingClientRect();
      if (
        !bounds ||
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        return;
      }
      const fill: Stroke = {
        erase: false,
        fill: true,
        pts: [point.x, point.y, timestamp],
        w: PEN_WIDTH_INDEX,
        c: color,
      };
      paintFill(context, point.x, point.y, strokeColor(fill));
      commit([...strokesRef.current, fill]);
      return;
    }

    const stroke: Stroke =
      tool === "eraser"
        ? {
            erase: true,
            pts: [point.x, point.y, timestamp],
            w: ERASER_WIDTH_INDEX,
          }
        : {
            erase: false,
            pts: [point.x, point.y, timestamp],
            w: PEN_WIDTH_INDEX,
            size: PEN_WIDTHS[penWidthIndex],
            c: color,
          };

    const activeContext = activeCanvasRef.current?.getContext("2d");
    if (!activeContext) {
      setMessage("Your browser could not start the drawing canvas.");
      return;
    }

    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    activeStrokeRef.current = stroke;
    previousPointRef.current = point;
    lastRenderedPointRef.current = null;
    pointCountRef.current += 1;
    repaintActiveStroke();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (
      phase !== "drawing" ||
      activePointerIdRef.current !== event.pointerId ||
      !activeStrokeRef.current
    ) {
      return;
    }

    // The release can happen where we never hear it (outside the window), so
    // a mouse move with no button held means the stroke is already over.
    if (event.pointerType === "mouse" && event.buttons === 0) {
      finishStroke();
      return;
    }

    if (pointCountRef.current >= MAX_DRAWING_POINTS) {
      setMessage("Drawing point limit reached.");
      return;
    }

    const point = getCanvasPoint(event);
    const previousPoint = previousPointRef.current;
    const lastRenderedPoint = lastRenderedPointRef.current;
    const stroke = activeStrokeRef.current;
    const context = activeCanvasRef.current?.getContext("2d");
    if (!point || !previousPoint || !context) {
      return;
    }

    const timestamp = getNextTimestamp();
    if (timestamp === null) {
      return;
    }
    stroke.pts.push(
      point.x - previousPoint.x,
      point.y - previousPoint.y,
      timestamp,
    );

    const midpoint: CanvasPoint = {
      x: (previousPoint.x + point.x) / 2,
      y: (previousPoint.y + point.y) / 2,
    };
    paintStrokeSegment(
      context,
      stroke,
      lastRenderedPoint ?? previousPoint,
      previousPoint,
      midpoint,
    );

    lastRenderedPointRef.current = midpoint;
    previousPointRef.current = point;
    pointCountRef.current += 1;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    finishStroke();
  };

  const pickColor = (index: number) => {
    setColor(index);
    if (tool === "eraser") {
      setTool("pen");
    }
  };

  const retrySave = () => {
    void submitDrawing();
  };

  useEffect(() => {
    if (!endsAt) {
      return;
    }
    const timer = setTimeout(
      () => {
        finishStroke();
        if (strokesRef.current.length > 0) {
          void submitDrawing();
        } else {
          onTimeUp?.();
        }
      },
      Math.max(0, Date.parse(endsAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [endsAt, finishStroke, onTimeUp, submitDrawing]);

  const submitManually = () => {
    finishStroke();
    void submitDrawing();
  };

  const locked = phase !== "drawing";
  const { canUndo, canRedo, hasDrawing } = history;

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <header className="text-center">
        <p className="font-hand text-lg text-ink-muted">Draw this</p>
        <h1 className="font-hand text-4xl font-bold">
          <span className="marker">{prompt}</span>
        </h1>
      </header>

      <div
        aria-label="Drawing tools"
        className="flex flex-wrap items-center justify-between gap-2"
        role="toolbar"
      >
        <div className="sketch flex gap-1 p-1">
          {tools.map((option) => (
            <button
              aria-label={option.label}
              aria-pressed={tool === option.tool}
              className="btn btn-quiet size-10 p-0"
              disabled={locked}
              key={option.tool}
              onClick={() => setTool(option.tool)}
              title={option.label}
              type="button"
            >
              {icons[option.tool]}
            </button>
          ))}
        </div>
        <div
          aria-label="Pen width"
          className="sketch flex items-center gap-1 px-2 py-1"
          role="radiogroup"
        >
          {PEN_WIDTHS.map((width, index) => (
            <button
              aria-checked={penWidthIndex === index}
              aria-label={`${width} pixels`}
              className={`btn btn-quiet flex size-9 items-center justify-center p-0 ${
                penWidthIndex === index ? "bg-grape-wash" : ""
              }`}
              disabled={locked || tool !== "pen"}
              key={width}
              onClick={() => setPenWidthIndex(index)}
              role="radio"
              title={`${width}px`}
              type="button"
            >
              <span
                aria-hidden
                className="rounded-full bg-ink"
                style={{
                  width: `${Math.min(width, 18)}px`,
                  height: `${Math.min(width, 18)}px`,
                }}
              />
            </button>
          ))}
        </div>
        <div className="sketch flex gap-1 p-1">
          <button
            aria-label="Undo"
            className="btn btn-quiet size-10 p-0"
            disabled={locked || !canUndo}
            onClick={undo}
            title="Undo (⌘Z)"
            type="button"
          >
            {icons.undo}
          </button>
          <button
            aria-label="Redo"
            className="btn btn-quiet size-10 p-0"
            disabled={locked || !canRedo}
            onClick={redo}
            title="Redo (⇧⌘Z)"
            type="button"
          >
            {icons.redo}
          </button>
          <button
            aria-label="Clear the board"
            className="btn btn-quiet size-10 p-0"
            disabled={locked || !hasDrawing}
            onClick={clearBoard}
            title="Clear the board"
            type="button"
          >
            {icons.clear}
          </button>
        </div>
      </div>

      <div
        aria-label="Colour"
        className="grid w-full grid-cols-[repeat(17,minmax(0,1fr))] gap-1.5"
        role="radiogroup"
      >
        {DRAWING_COLOR_ORDER.map((index) => {
          const swatch = DRAWING_COLORS[index];
          return (
            <button
              aria-checked={color === index}
              aria-label={COLOR_NAMES[index]}
              className={`aspect-square w-full rounded-full border-2 transition-transform duration-150 ease-out motion-reduce:transition-none ${
                color === index
                  ? "scale-110 border-ink ring-2 ring-grape ring-offset-2 ring-offset-board"
                  : "border-ink-faint hover:scale-110"
              }`}
              disabled={locked}
              key={swatch}
              onClick={() => pickColor(index)}
              role="radio"
              style={{ backgroundColor: swatch }}
              title={COLOR_NAMES[index]}
              type="button"
            />
          );
        })}
      </div>

      {/*
        The pointer area reaches a little past the board, so a stroke can start
        just outside it and still run right up to the edge. It stays narrower
        than the gap to the swatches above, so it never steals their clicks.
      */}
      <div
        className={`-m-3 touch-none p-3 ${
          tool === "fill" ? "cursor-cell" : "cursor-crosshair"
        }`}
        onLostPointerCapture={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="sketch relative aspect-square w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            aria-label={`Drawing area. Current tool: ${
              tools.find((option) => option.tool === tool)?.label
            }, colour ${COLOR_NAMES[color]}.`}
            className="absolute inset-0 block size-full"
            height={DRAWING_SIZE}
            width={DRAWING_SIZE}
          />
          <canvas
            ref={activeCanvasRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 block size-full"
            height={DRAWING_SIZE}
            width={DRAWING_SIZE}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="font-hand text-ink-muted">No letters or words!</p>
        <p aria-live="polite" className="min-h-5 text-sm text-ink-muted">
          {phase === "saving" && "Saving drawing…"}
          {phase === "saved" && message}
          {(phase === "error" || phase === "drawing") && message}
        </p>
        {phase === "drawing" && (
          <button
            className="btn btn-primary"
            disabled={!hasDrawing}
            onClick={submitManually}
            type="button"
          >
            {submitLabel}
          </button>
        )}
        {phase === "error" && (
          <button className="btn" onClick={retrySave} type="button">
            Retry save
          </button>
        )}
      </div>
    </section>
  );
}
