import { describe, expect, it } from "vitest";

import { floodFillPixels, strokePoints } from "@/components/paint-drawing";

const WHITE = [255, 255, 255, 255];
const BLACK = [0, 0, 0, 255];

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
