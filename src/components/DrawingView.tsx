"use client";

import { useMemo, useSyncExternalStore } from "react";

import { drawingToDataUrl } from "@/components/paint-drawing";
import type { DrawingData } from "@/types/drawing";

const subscribe = () => () => {};

// Drawings are painted in the browser (fills need real pixels), so the server
// renders an empty frame and the image appears once the page hydrates.
export function useDrawingImage(drawing: DrawingData): string | null {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return useMemo(
    () => (isClient ? drawingToDataUrl(drawing) : null),
    [drawing, isClient],
  );
}

type DrawingViewProps = {
  drawing: DrawingData;
  label: string;
};

export function DrawingView({ drawing, label }: DrawingViewProps) {
  const src = useDrawingImage(drawing);
  return (
    <div className="sketch aspect-square w-full overflow-hidden">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, nothing to optimise
        <img alt={label} className="block size-full" src={src} />
      )}
    </div>
  );
}
