import "server-only";

import {
  BRUSH_WIDTHS,
  DRAWING_COLORS,
  DRAWING_SIZE,
  MAX_BRUSH_WIDTH,
  MAX_DRAWING_POINTS,
  MIN_BRUSH_WIDTH,
} from "@/constants/drawing";
import type { Json } from "@/types/database";
import type { DrawingData } from "@/types/drawing";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

export function isDrawingData(value: unknown): value is DrawingData {
  if (!isRecord(value) || value.v !== 1 || !Array.isArray(value.strokes)) {
    return false;
  }

  let totalPoints = 0;
  let previousTimestamp = -1;

  for (const stroke of value.strokes) {
    if (
      !isRecord(stroke) ||
      !isIntegerInRange(stroke.w, 0, BRUSH_WIDTHS.length - 1) ||
      typeof stroke.erase !== "boolean" ||
      (stroke.size !== undefined && (stroke.erase || stroke.fill === true)) ||
      (stroke.size !== undefined &&
        (typeof stroke.size !== "number" ||
          !Number.isFinite(stroke.size) ||
          stroke.size < MIN_BRUSH_WIDTH ||
          stroke.size > MAX_BRUSH_WIDTH)) ||
      (stroke.c !== undefined &&
        !isIntegerInRange(stroke.c, 0, DRAWING_COLORS.length - 1)) ||
      !Array.isArray(stroke.pts) ||
      stroke.pts.length === 0 ||
      stroke.pts.length % 3 !== 0 ||
      (stroke.fill !== undefined &&
        (stroke.fill !== true || stroke.erase || stroke.pts.length !== 3))
    ) {
      return false;
    }

    totalPoints += stroke.pts.length / 3;
    if (totalPoints > MAX_DRAWING_POINTS) {
      return false;
    }

    let x = 0;
    let y = 0;

    for (let index = 0; index < stroke.pts.length; index += 3) {
      const xValue = stroke.pts[index];
      const yValue = stroke.pts[index + 1];
      const timestamp = stroke.pts[index + 2];

      if (
        typeof xValue !== "number" ||
        typeof yValue !== "number" ||
        typeof timestamp !== "number" ||
        !Number.isFinite(xValue) ||
        !Number.isFinite(yValue) ||
        !Number.isFinite(timestamp)
      ) {
        return false;
      }

      if (index === 0) {
        x = xValue;
        y = yValue;
      } else {
        x += xValue;
        y += yValue;
      }

      if (
        x < 0 ||
        x >= DRAWING_SIZE ||
        y < 0 ||
        y >= DRAWING_SIZE ||
        timestamp <= previousTimestamp
      ) {
        return false;
      }

      previousTimestamp = timestamp;
    }
  }

  return value.strokes.length > 0;
}

// Copies only the known fields, so extra keys in a request never reach the database.
export function drawingToJson(drawing: DrawingData): Json {
  return {
    v: 1,
    strokes: drawing.strokes.map(({ erase, pts, w, c, fill, size }) => ({
      erase,
      pts,
      w,
      ...(c === undefined ? {} : { c }),
      ...(fill ? { fill } : {}),
      ...(size === undefined ? {} : { size }),
    })),
  };
}
