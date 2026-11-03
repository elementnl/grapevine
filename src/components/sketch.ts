// Excalidraw-style rough strokes as SVG path data. Seeded, so the server and
// the browser draw the same wobble and a node keeps its shape between renders.

type Random = () => number;

// mulberry32: tiny, fast and good enough for jitter.
export function seededRandom(seed: string): Random {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) {
    state = Math.imul(state ^ seed.charCodeAt(index), 2654435761);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function jitter(random: Random, amount: number): number {
  return (random() * 2 - 1) * amount;
}

const round = (value: number) => Math.round(value * 10) / 10;

// A pen line bows a little and overshoots its ends.
function roughSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  random: Random,
  roughness: number,
): string {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const bow = Math.min(length * 0.02, 3) * roughness;
  const normalX = length === 0 ? 0 : -(y2 - y1) / length;
  const normalY = length === 0 ? 0 : (x2 - x1) / length;
  const offset = jitter(random, bow);
  const start = [
    x1 + jitter(random, roughness),
    y1 + jitter(random, roughness),
  ];
  const end = [x2 + jitter(random, roughness), y2 + jitter(random, roughness)];
  const c1 = [
    x1 + (x2 - x1) * 0.3 + normalX * offset,
    y1 + (y2 - y1) * 0.3 + normalY * offset,
  ];
  const c2 = [
    x1 + (x2 - x1) * 0.7 + normalX * offset * 0.6,
    y1 + (y2 - y1) * 0.7 + normalY * offset * 0.6,
  ];
  return `M${round(start[0]!)} ${round(start[1]!)} C${round(c1[0]!)} ${round(
    c1[1]!,
  )} ${round(c2[0]!)} ${round(c2[1]!)} ${round(end[0]!)} ${round(end[1]!)}`;
}

// Two loose passes around the box, the way Excalidraw double-strokes shapes.
export function roughRect(
  x: number,
  y: number,
  width: number,
  height: number,
  seed: string,
  roughness = 1.2,
): string {
  const random = seededRandom(seed);
  const corners: Array<[number, number]> = [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
  const parts: string[] = [];
  for (let pass = 0; pass < 2; pass += 1) {
    for (let side = 0; side < 4; side += 1) {
      const [x1, y1] = corners[side]!;
      const [x2, y2] = corners[(side + 1) % 4]!;
      parts.push(roughSegment(x1, y1, x2, y2, random, roughness));
    }
  }
  return parts.join(" ");
}

// A slightly curved shaft with an open two-stroke head at the end.
export function roughArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seed: string,
): string {
  const random = seededRandom(seed);
  const shaft = roughSegment(x1, y1, x2, y2, random, 1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = 14;
  const spread = Math.PI / 7;
  const wings = [angle + Math.PI - spread, angle + Math.PI + spread].map(
    (wing) =>
      roughSegment(
        x2,
        y2,
        x2 + Math.cos(wing) * headLength,
        y2 + Math.sin(wing) * headLength,
        random,
        0.5,
      ),
  );
  return [shaft, ...wings].join(" ");
}
