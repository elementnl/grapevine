export type Stroke = {
  erase: boolean;
  pts: number[];
  w: number;
};

export type DrawingData = {
  v: 1;
  strokes: Stroke[];
};
