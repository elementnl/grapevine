export const DRAWING_SIZE = 512;
export const MAX_DRAWING_POINTS = 20_000;

// Strokes store a palette index, so existing colours must never be reordered.
export const DRAWING_COLORS = [
  "#2a2532", // ink
  "#6b6570",
  "#b5b0ba",
  "#ffffff",
  "#e03131",
  "#f76707",
  "#f59f00",
  "#ffd43b",
  "#94d82d",
  "#2f9e44",
  "#0b7a5a",
  "#12b886",
  "#22b8cf",
  "#4dabf7",
  "#1c7ed6",
  "#1b2a6b",
  "#5f3dc4",
  "#7b3fbf",
  "#cc5de8",
  "#f06595",
  "#c2255c",
  "#8b5a2b",
  "#d9a066",
  "#f1c9a5",
  "#a86b4c",
  "#ff6b6b",
  "#f08c00",
  "#ffe066",
  "#c0eb75",
  "#69db7c",
  "#63e6be",
  "#66d9e8",
  "#748ffc",
  "#b197fc",
] as const;

// Order the unchanged palette indexes into a hue progression for the toolbar.
export const DRAWING_COLOR_ORDER = [
  0, 1, 2, 3, 4, 25, 20, 19, 17, 33, 18, 16, 15, 32, 14, 13, 31, 12, 11, 30, 10,
  9, 29, 8, 28, 7, 27, 6, 5, 26, 24, 23, 21, 22,
] as const;

// w remains the legacy preset index; custom sizes are stored explicitly.
export const BRUSH_WIDTHS = [1.5, 3, 24] as const;
export const PEN_WIDTHS = [1.5, 3, 6, 12, 24] as const;
export const PEN_WIDTH_INDEX = 1;
export const ERASER_WIDTH_INDEX = 2;
export const MIN_BRUSH_WIDTH = 1;
export const MAX_BRUSH_WIDTH = 24;
export const DEFAULT_BRUSH_WIDTH = 3;
// How different a neighbouring pixel may be and still count as the same area
// for the paint bucket, so fills reach into anti-aliased line edges.
export const FILL_TOLERANCE = 96;
