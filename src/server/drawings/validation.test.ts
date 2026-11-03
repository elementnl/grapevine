import { describe, expect, it } from "vitest";

import { isDrawingData } from "@/server/drawings/validation";

const validDrawing = {
  v: 1,
  strokes: [{ w: 1, erase: false, pts: [12, 14, 0, 3, 5, 10] }],
};

describe("drawing validation", () => {
  it("accepts stroke vectors using the documented format", () => {
    expect(isDrawingData(validDrawing)).toBe(true);
  });

  it("rejects points outside the 512 by 512 canvas", () => {
    expect(
      isDrawingData({
        v: 1,
        strokes: [{ w: 1, erase: false, pts: [512, 14, 0] }],
      }),
    ).toBe(false);
  });

  it("rejects invalid pen sizes and non-increasing timestamps", () => {
    expect(
      isDrawingData({
        v: 1,
        strokes: [{ w: 3, erase: false, pts: [12, 14, 0] }],
      }),
    ).toBe(false);
    expect(
      isDrawingData({
        v: 1,
        strokes: [{ w: 1, erase: false, pts: [12, 14, 0, 1, 1, 0] }],
      }),
    ).toBe(false);
  });

  it("accepts drawings longer than the old time limit", () => {
    expect(
      isDrawingData({
        v: 1,
        strokes: [{ w: 1, erase: false, pts: [12, 14, 0, 1, 1, 90_001] }],
      }),
    ).toBe(true);
  });

  it("accepts palette colours and single-point fills", () => {
    expect(
      isDrawingData({
        v: 1,
        strokes: [
          { w: 1, erase: false, c: 4, pts: [12, 14, 0, 3, 5, 10] },
          { w: 1, erase: false, c: 24, fill: true, pts: [100, 100, 20] },
        ],
      }),
    ).toBe(true);
  });

  it("rejects unknown colours and malformed fills", () => {
    expect(
      isDrawingData({
        v: 1,
        strokes: [{ w: 1, erase: false, c: 25, pts: [12, 14, 0] }],
      }),
    ).toBe(false);
    expect(
      isDrawingData({
        v: 1,
        strokes: [
          { w: 1, erase: false, fill: true, pts: [12, 14, 0, 1, 1, 5] },
        ],
      }),
    ).toBe(false);
    expect(
      isDrawingData({
        v: 1,
        strokes: [{ w: 1, erase: false, fill: true }],
      }),
    ).toBe(false);
  });
});
