"use client";

import { type PointerEvent, useCallback, useRef, useState } from "react";

import { DRAWING_SIZE, MAX_DRAWING_POINTS } from "@/constants/drawing";
import type { DrawingData, Stroke } from "@/types/drawing";

type DrawingCanvasProps = {
  onSubmit: (drawing: DrawingData) => Promise<void>;
  prompt: string;
  submitLabel?: string;
};

type DrawingPhase = "drawing" | "saving" | "saved" | "error";
type CanvasPoint = { x: number; y: number };

export function DrawingCanvas({
  onSubmit,
  prompt,
  submitLabel = "Save drawing",
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const previousPointRef = useRef<CanvasPoint | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pointCountRef = useRef(0);
  const lastTimestampRef = useRef(-1);
  const savingRef = useRef(false);
  const [phase, setPhase] = useState<DrawingPhase>("drawing");
  const [hasDrawing, setHasDrawing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
        c: stroke.c,
        erase: stroke.erase,
        pts: [...stroke.pts],
        w: stroke.w,
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
    if (activeStrokeRef.current) {
      strokesRef.current.push(activeStrokeRef.current);
      activeStrokeRef.current = null;
      previousPointRef.current = null;
    }
    activePointerIdRef.current = null;
  }, []);

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

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
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

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (
      phase !== "drawing" ||
      activePointerIdRef.current !== null ||
      pointCountRef.current >= MAX_DRAWING_POINTS
    ) {
      return;
    }

    const point = getCanvasPoint(event);
    const startedAt = startedAtRef.current;
    if (!point) {
      return;
    }
    if (startedAt === null) {
      startedAtRef.current = performance.now();
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      setMessage("Your browser could not start the drawing canvas.");
      return;
    }

    activePointerIdRef.current = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    const timestamp = getNextTimestamp();
    if (timestamp === null) {
      activePointerIdRef.current = null;
      setMessage("Your browser could not timestamp the drawing.");
      return;
    }

    context.fillStyle = "#000";
    context.beginPath();
    context.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
    context.fill();

    activeStrokeRef.current = {
      c: 0,
      erase: false,
      pts: [point.x, point.y, timestamp],
      w: 1,
    };
    previousPointRef.current = point;
    pointCountRef.current += 1;
    setHasDrawing(true);
    setMessage(null);
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (
      phase !== "drawing" ||
      activePointerIdRef.current !== event.pointerId ||
      !activeStrokeRef.current
    ) {
      return;
    }

    if (pointCountRef.current >= MAX_DRAWING_POINTS) {
      setMessage("Drawing point limit reached.");
      return;
    }

    const point = getCanvasPoint(event);
    const previousPoint = previousPointRef.current;
    const stroke = activeStrokeRef.current;
    if (!point || !previousPoint || !stroke) {
      return;
    }

    const context = canvasRef.current?.getContext("2d");
    if (!context) {
      setMessage("Your browser could not continue the drawing.");
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

    context.strokeStyle = "#000";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    previousPointRef.current = point;
    pointCountRef.current += 1;
  };

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    finishStroke();
  };

  const retrySave = () => {
    void submitDrawing();
  };

  const submitManually = () => {
    finishStroke();
    void submitDrawing();
  };

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <header>
        <div>
          <p className="text-sm font-medium text-neutral-500">Draw this</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {prompt}
          </h1>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <canvas
          ref={canvasRef}
          aria-label="Drawing area. Use a mouse, touch, or stylus to draw with the black pen."
          className="block aspect-square w-full cursor-crosshair touch-none"
          height={DRAWING_SIZE}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          width={DRAWING_SIZE}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-500">Black pen</p>
        <p aria-live="polite" className="min-h-5 text-sm text-neutral-600">
          {phase === "saving" && "Saving drawing…"}
          {phase === "saved" && message}
          {phase === "error" && message}
        </p>
        {phase === "drawing" && (
          <button
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-300"
            disabled={!hasDrawing}
            onClick={submitManually}
            type="button"
          >
            {submitLabel}
          </button>
        )}
        {phase === "error" && (
          <button
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
            onClick={retrySave}
            type="button"
          >
            Retry save
          </button>
        )}
      </div>
    </section>
  );
}
