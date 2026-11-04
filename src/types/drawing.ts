// One brush, eraser or bucket action, replayed in order to rebuild a drawing.
// Older drawings have no `c` (black ink) and no fills.
export type Stroke = {
  erase: boolean;
  pts: number[];
  w: number;
  // Optional brush settings keep existing v1 drawings readable.
  brush?: "watercolor";
  size?: number;
  // Index into DRAWING_COLORS.
  c?: number;
  // A paint-bucket fill from the single point in `pts`.
  fill?: true;
};

export type DrawingData = {
  v: 1;
  strokes: Stroke[];
};
