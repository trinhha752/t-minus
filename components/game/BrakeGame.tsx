"use client";
// components/game/BrakeGame.tsx
// React wrapper for the Phaser "stop at the platform" level (game/brake.ts).
// Phaser is loaded only in the browser, on mount.

import { useEffect, useRef } from "react";
import type { BrakeResult } from "@/game/brake";

export default function BrakeGame({
  stationName,
  lineColor,
  stops = 3,
  onFinish,
}: {
  stationName: string;
  lineColor: string;
  /** 1 = just arriving at this station; 3 = the full practice run. */
  stops?: number;
  onFinish: (r: BrakeResult) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const finish = useRef(onFinish);
  useEffect(() => {
    finish.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    let game: { destroy: (removeCanvas: boolean) => void } | null = null;
    let cancelled = false;
    void import("@/game/brake").then(({ createBrakeGame }) => {
      if (cancelled || !host.current) return;
      game = createBrakeGame(host.current, {
        stationName,
        lineColor,
        stops,
        onFinish: (r) => finish.current(r),
      });
    });
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, [stationName, lineColor, stops]);

  // touch-action none: holding to brake must not scroll or zoom the page.
  return <div ref={host} className="h-full w-full select-none" style={{ touchAction: "none" }} />;
}
