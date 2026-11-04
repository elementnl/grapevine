import { describe, expect, it } from "vitest";

import {
  floodFillPixels,
  strokePoints,
  strokeWidth,
} from "@/components/paint-drawing";
import {
  DRAWING_COLOR_ORDER,
  DRAWING_COLORS,
  PEN_WIDTHS,
} from "@/constants/drawing";

const WHITE = [255, 255, 255, 255];
const BLACK = [0, 0, 0, 255];

describe("drawing palette and pen widths", () => {
  it("offers 34 colour swatches in two full rows", () => {
    expect(DRAWING_COLORS).toHaveLength(34);
    expect(DRAWING_COLOR_ORDER).toHaveLength(34);
    expect([...DRAWING_COLOR_ORDER].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 34 }, (_, index) => index),
    );
  });

  it("offers five pen widths while retaining legacy stroke widths", () => {
    expect(PEN_WIDTHS).toEqual([1.5, 3, 6, 12, 24]);
    expect(strokeWidth({ erase: false, pts: [10, 20, 0], w: 2 })).toBe(24);
  });
});

// A 5×5 white board with a black vertical wall at x = 2.
function boardWithWall(): Uint8ClampedArray {
  const data = new Uint8ClampedArray(5 * 5 * 4);
  for (let pixel = 0; pixel < 25; pixel += 1) {
    data.set(pixel % 5 === 2 ? BLACK : WHITE, pixel * 4);
  }
  return data;
}

function pixelAt(data: Uint8ClampedArray, x: number, y: number) {
  return [...data.slice((y * 5 + x) * 4, (y * 5 + x) * 4 + 3)];
}

describe("floodFillPixels", () => {
  it("fills the enclosed area and stops at lines", () => {
    const data = boardWithWall();
    floodFillPixels(data, 5, 5, 0, 0, [255, 0, 0], 96);

    expect(pixelAt(data, 0, 0)).toEqual([255, 0, 0]);
    expect(pixelAt(data, 1, 4)).toEqual([255, 0, 0]);
    expect(pixelAt(data, 2, 2)).toEqual([0, 0, 0]);
    expect(pixelAt(data, 4, 4)).toEqual([255, 255, 255]);
  });

  it("does nothing when the area is already that colour", () => {
    const data = boardWithWall();
    floodFillPixels(data, 5, 5, 0, 0, [255, 255, 255], 96);
    expect(data).toEqual(boardWithWall());
  });
});

describe("strokePoints", () => {
  it("turns stored deltas back into absolute points", () => {
    expect(strokePoints([10, 20, 0, 5, -3, 4, 1, 1, 8])).toEqual([
      [10, 20],
      [15, 17],
      [16, 18],
    ]);
  });
});

describe("strokeWidth", () => {
  it("uses a custom width when present and retains legacy widths", () => {
    expect(
      strokeWidth({
        erase: false,
        pts: [10, 20, 0],
        w: 1,
        size: 8.5,
      }),
    ).toBe(8.5);
    expect(strokeWidth({ erase: false, pts: [10, 20, 0], w: 1 })).toBe(3);
  });
});
