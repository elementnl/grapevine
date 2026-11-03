export const DRAWING_SIZE = 512;
export const MAX_DRAWING_POINTS = 20_000;

// The 25-colour palette; strokes store an index into it, so order is fixed forever.
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
] as const;

// Line width in pixels for each `w`; pens draw with 1, the eraser with 2.
export const BRUSH_WIDTHS = [1.5, 3, 24] as const;
export const PEN_WIDTH_INDEX = 1;
export const ERASER_WIDTH_INDEX = 2;
// How different a neighbouring pixel may be and still count as the same area
// for the paint bucket, so fills reach into anti-aliased line edges.
export const FILL_TOLERANCE = 96;
