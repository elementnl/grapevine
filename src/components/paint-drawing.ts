import {
  BRUSH_WIDTHS,
  DRAWING_COLORS,
  DRAWING_SIZE,
  FILL_TOLERANCE,
} from "@/constants/drawing";
import type { DrawingData, Stroke } from "@/types/drawing";

// Everything a drawing can show is replayed onto a canvas from its strokes,
// because a paint-bucket fill depends on the pixels drawn before it.

const BOARD_COLOR = "#ffffff";

export function strokeColor(stroke: Stroke): string {
  return stroke.erase
    ? BOARD_COLOR
    : (DRAWING_COLORS[stroke.c ?? 0] ?? DRAWING_COLORS[0]);
}

export function strokeWidth(stroke: Stroke): number {
  return stroke.size ?? BRUSH_WIDTHS[stroke.w] ?? BRUSH_WIDTHS[1];
}

// Points after the first are stored as deltas from the previous one.
export function strokePoints(pts: number[]): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let x = 0;
  let y = 0;
  for (let index = 0; index < pts.length; index += 3) {
    x = index === 0 ? (pts[index] ?? 0) : x + (pts[index] ?? 0);
    y = index === 0 ? (pts[index + 1] ?? 0) : y + (pts[index + 1] ?? 0);
    points.push([x, y]);
  }
  return points;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Scanline flood fill over RGBA pixels. Pixels within `tolerance` (summed
// channel difference) of the starting pixel count as the same area.
export function floodFillPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fill: [number, number, number],
  tolerance: number,
): void {
  const start = (startY * width + startX) * 4;
  const target = [data[start]!, data[start + 1]!, data[start + 2]!];
  if (target[0] === fill[0] && target[1] === fill[1] && target[2] === fill[2]) {
    return;
  }

  const visited = new Uint8Array(width * height);
  const matches = (pixel: number) => {
    if (visited[pixel]) {
      return false;
    }
    const offset = pixel * 4;
    return (
      Math.abs(data[offset]! - target[0]!) +
        Math.abs(data[offset + 1]! - target[1]!) +
        Math.abs(data[offset + 2]! - target[2]!) <=
      tolerance
    );
  };

  const stack = [startY * width + startX];
  while (stack.length > 0) {
    const pixel = stack.pop()!;
    const y = Math.floor(pixel / width);
    let left = pixel;
    while (left % width > 0 && matches(left - 1)) {
      left -= 1;
    }
    let spanAbove = false;
    let spanBelow = false;
    for (let current = left; current < y * width + width; current += 1) {
      if (!matches(current)) {
        break;
      }
      visited[current] = 1;
      const offset = current * 4;
      data[offset] = fill[0];
      data[offset + 1] = fill[1];
      data[offset + 2] = fill[2];
      data[offset + 3] = 255;

      const above = current - width;
      if (y > 0 && matches(above)) {
        if (!spanAbove) {
          stack.push(above);
          spanAbove = true;
        }
      } else {
        spanAbove = false;
      }
      const below = current + width;
      if (y < height - 1 && matches(below)) {
        if (!spanBelow) {
          stack.push(below);
          spanBelow = true;
        }
      } else {
        spanBelow = false;
      }
    }
  }
}

export function paintFill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  const image = context.getImageData(0, 0, DRAWING_SIZE, DRAWING_SIZE);
  floodFillPixels(
    image.data,
    DRAWING_SIZE,
    DRAWING_SIZE,
    Math.round(x),
    Math.round(y),
    hexToRgb(color),
    FILL_TOLERANCE,
  );
  context.putImageData(image, 0, 0);
}

export function paintStroke(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
): void {
  const points = strokePoints(stroke.pts);
  const [first] = points;
  if (!first) {
    return;
  }
  const color = strokeColor(stroke);

  if (stroke.fill) {
    paintFill(context, first[0], first[1], color);
    return;
  }

  const width = strokeWidth(stroke);
  if (points.length === 1) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(first[0], first[1], width / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }

  paintStrokePath(context, stroke, () => {
    context.beginPath();
    context.moveTo(first[0], first[1]);
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]!;
      const current = points[index]!;
      context.quadraticCurveTo(
        previous[0],
        previous[1],
        (previous[0] + current[0]) / 2,
        (previous[1] + current[1]) / 2,
      );
    }
    const last = points[points.length - 1]!;
    context.quadraticCurveTo(last[0], last[1], last[0], last[1]);
    context.stroke();
  });
}

export function paintStrokeSegment(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
): void {
  paintStrokePath(context, stroke, () => {
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo(control.x, control.y, end.x, end.y);
    context.stroke();
  });
}

function paintStrokePath(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  drawPath: () => void,
): void {
  const width = strokeWidth(stroke);
  const color = strokeColor(stroke);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = color;
  context.lineWidth = width;
  drawPath();
}

export function paintDrawing(
  context: CanvasRenderingContext2D,
  strokes: DrawingData["strokes"],
): void {
  context.fillStyle = BOARD_COLOR;
  context.fillRect(0, 0, DRAWING_SIZE, DRAWING_SIZE);
  for (const stroke of strokes) {
    paintStroke(context, stroke);
  }
}

// A PNG of the drawing, for places that show it as an image (the tree).
export function drawingToDataUrl(drawing: DrawingData): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = DRAWING_SIZE;
  canvas.height = DRAWING_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }
  paintDrawing(context, drawing.strokes);
  return canvas.toDataURL("image/png");
}
