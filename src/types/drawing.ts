export type Stroke = {
  c: number;
  erase: boolean;
  pts: number[];
  w: number;
};

export type DrawingData = {
  v: 1;
  strokes: Stroke[];
};
