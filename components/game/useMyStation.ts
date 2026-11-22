"use client";
// components/game/useMyStation.ts
// Which game station is the player standing at? Uses the phone's location and
// /api/stations/nearest. Cached for the session so moving between screens
// doesn't re-prompt or re-fetch.

import { useEffect, useState } from "react";

export interface MyStation {
  status: "locating" | "ready" | "nolocation";
  /** Nearest game station (UI slug), or null until located. */
  slug: string | null;
  metres: number | null;
  /** Within check-in range (150 m) of `slug`. */
  inRange: boolean;
  /** The closest real MBTA station of any kind, which may not be in the game. */
  nearestAny: { name: string; metres: number } | null;
  coords: { lat: number; lon: number } | null;
}

const INITIAL: MyStation = { status: "locating", slug: null, metres: null, inRange: false, nearestAny: null, coords: null };
let cached: MyStation | null = null;
let pending: Promise<MyStation> | null = null;

function locateOnce(): Promise<MyStation> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = new Promise<MyStation>((resolve) => {
    const fail = () => resolve({ ...INITIAL, status: "nolocation" });
    if (typeof navigator === "undefined" || !navigator.geolocation) return fail();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const r = await fetch(`/api/stations/nearest?lat=${lat}&lon=${lon}`).then((x) => x.json()).catch(() => null);
        if (!r?.ok) return fail();
        resolve({
          status: "ready",
          slug: r.data.slug,
          metres: r.data.metres,
          inRange: r.data.inRange,
          nearestAny: r.data.nearestAny ? { name: r.data.nearestAny.name, metres: r.data.nearestAny.metres } : null,
          coords: { lat, lon },
        });
      },
      fail,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }).then((v) => {
    cached = v;
    pending = null;
    return v;
  });
  return pending;
}

export function useMyStation(): MyStation {
  const [state, setState] = useState<MyStation>(cached ?? INITIAL);
  useEffect(() => {
    let live = true;
    void locateOnce().then((v) => live && setState(v));
    return () => {
      live = false;
    };
  }, []);
  return state;
}

/** Dev or NEXT_PUBLIC_DEMO_MODE=1: allow playing a station you're not at (the server allows teleport check-ins too). */
export const DEMO_MODE = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_MODE === "1";
