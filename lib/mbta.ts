// lib/mbta.ts
// The only place in the app that talks to the MBTA. Server-side only:
// the API key must never reach a browser.
//
// Three things live here:
//   1. a fetch with a short cache, so polling does not burn the rate limit
//   2. a seed fallback, so the demo survives dead wifi
//   3. normalisers that turn JSON:API into our flat types

import fs from "node:fs";
import path from "node:path";
import type { Arrival, RouteId, Station, Vehicle } from "../types";
import { ALL_ROUTES } from "../types";

const BASE = "https://api-v3.mbta.com";
const CACHE_MS = 10_000;
const USE_SEED = process.env.USE_SEED === "1";

type CacheEntry = { at: number; body: unknown };
const cache = new Map<string, CacheEntry>();

/* ---------- JSON:API shapes (only the bits we read) ---------- */

interface JsonApiResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data?: { id: string; type: string } | null }>;
}
interface JsonApiDoc {
  data: JsonApiResource[];
  included?: JsonApiResource[];
}

/* ---------- core fetch ---------- */

function seedPath(file: string) {
  return path.join(process.cwd(), "public", "seed", file);
}

/** Saved real responses, used when USE_SEED=1 or the network fails. */
function readSeed(key: string): JsonApiDoc | null {
  try {
    const raw = fs.readFileSync(seedPath("mbta-fallback.json"), "utf8");
    const all = JSON.parse(raw) as Record<string, JsonApiDoc>;
    return all[key] ?? null;
  } catch {
    return null;
  }
}

/**
 * GET from the MBTA with a 10s cache.
 * `key` is also the lookup into the seed file, so keep it stable.
 */
export async function mbtaGet(
  endpoint: string,
  params: Record<string, string>,
  key: string
): Promise<JsonApiDoc> {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${endpoint}?${qs}`;

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.body as JsonApiDoc;

  if (USE_SEED) {
    const seeded = readSeed(key);
    if (seeded) return seeded;
  }

  try {
    const headers: Record<string, string> = { Accept: "application/vnd.api+json" };
    if (process.env.MBTA_API_KEY) headers["x-api-key"] = process.env.MBTA_API_KEY;

    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) throw new Error(`MBTA ${res.status}`);

    const body = (await res.json()) as JsonApiDoc;
    cache.set(url, { at: Date.now(), body });
    return body;
  } catch (e) {
    // Live call failed. Fall back rather than blanking the screen mid-demo.
    const seeded = readSeed(key);
    if (seeded) {
      console.warn(`[mbta] live call failed, served seed for ${key}:`, e);
      return seeded;
    }
    throw e;
  }
}

/* ---------- helpers ---------- */

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

function relId(r: JsonApiResource, name: string): string | null {
  return r.relationships?.[name]?.data?.id ?? null;
}

function isRoute(v: string | null): v is RouteId {
  return !!v && (ALL_ROUTES as string[]).includes(v);
}

/* ---------- predictions ---------- */

/**
 * Next arrivals at a station, soonest first.
 *
 * MBTA rules that matter here:
 *  - arrival_time is null at a route's first stop, departure_time is null at
 *    its last stop, and a prediction with BOTH null means the train will not
 *    make the stop. Those get dropped.
 *  - we score the guess game against arrival_time when it exists, because
 *    that is the moment a rider actually sees the train.
 */
export async function getPredictions(stopId: string, limit = 5): Promise<Arrival[]> {
  const doc = await mbtaGet(
    "/predictions",
    {
      "filter[stop]": stopId,
      sort: "time",
      "page[limit]": String(limit * 3), // over-fetch, we drop a lot below
      include: "trip",
    },
    `predictions:${stopId}`
  );

  const headsigns = new Map<string, string>();
  for (const inc of doc.included ?? []) {
    if (inc.type === "trip") {
      const h = str(inc.attributes.headsign);
      if (h) headsigns.set(inc.id, h);
    }
  }

  const now = Date.now();

  return doc.data
    .map((r): Arrival | null => {
      const arrival = str(r.attributes.arrival_time);
      const departure = str(r.attributes.departure_time);
      const time = arrival ?? departure;
      if (!time) return null; // train is skipping this stop

      const route = relId(r, "route");
      if (!isRoute(route)) return null; // bus, ferry, commuter rail: not our game

      const tripId = relId(r, "trip");

      return {
        id: r.id,
        stopId,
        route,
        directionId: (num(r.attributes.direction_id) ?? 0) as 0 | 1,
        headsign: tripId ? headsigns.get(tripId) ?? null : null,
        time,
        secondsAway: Math.round((Date.parse(time) - now) / 1000),
        status: str(r.attributes.status),
      };
    })
    .filter((a): a is Arrival => a !== null && a.secondsAway > -60)
    .sort((a, b) => a.secondsAway - b.secondsAway)
    .slice(0, limit);
}

/* ---------- vehicles ---------- */

/** Live train positions. Pass no route to get every subway line. */
export async function getVehicles(route?: RouteId): Promise<Vehicle[]> {
  const routes = route ? [route] : ALL_ROUTES;
  const doc = await mbtaGet(
    "/vehicles",
    { "filter[route]": routes.join(",") },
    `vehicles:${routes.join(",")}`
  );

  return doc.data
    .map((r): Vehicle | null => {
      const lat = num(r.attributes.latitude);
      const lon = num(r.attributes.longitude);
      const rt = relId(r, "route");
      if (lat === null || lon === null || !isRoute(rt)) return null;

      return {
        id: r.id,
        route: rt,
        lat,
        lon,
        bearing: num(r.attributes.bearing),
        currentStatus: str(r.attributes.current_status),
        stopId: relId(r, "stop"),
      };
    })
    .filter((v): v is Vehicle => v !== null);
}

/* ---------- schedules, for the delay calculation ---------- */

/** Scheduled times at a stop, keyed by trip id, so we can diff against predictions. */
export async function getScheduleByTrip(
  stopId: string
): Promise<Map<string, string>> {
  const doc = await mbtaGet(
    "/schedules",
    { "filter[stop]": stopId, sort: "time", "page[limit]": "60" },
    `schedules:${stopId}`
  );

  const out = new Map<string, string>();
  for (const r of doc.data) {
    const tripId = relId(r, "trip");
    const t = str(r.attributes.arrival_time) ?? str(r.attributes.departure_time);
    if (tripId && t) out.set(tripId, t);
  }
  return out;
}

/* ---------- alerts: the cheap boss trigger ---------- */

/** Active delay alerts per route. Use this if the schedule diff gets fiddly. */
export async function getDelayAlerts(): Promise<Set<RouteId>> {
  const doc = await mbtaGet(
    "/alerts",
    {
      "filter[route]": ALL_ROUTES.join(","),
      "filter[datetime]": "NOW",
      "filter[severity]": "3,4,5,6,7,8,9,10",
    },
    "alerts:all"
  );

  const hit = new Set<RouteId>();
  for (const r of doc.data) {
    const effect = str(r.attributes.effect);
    if (effect !== "DELAY" && effect !== "SERVICE_CHANGE") continue;
    // informed_entity lives on attributes for alerts, not relationships
    const entities = r.attributes.informed_entity;
    if (!Array.isArray(entities)) continue;
    for (const e of entities) {
      const rt = (e as Record<string, unknown>)?.route;
      if (typeof rt === "string" && isRoute(rt)) hit.add(rt);
    }
  }
  return hit;
}

/* ---------- stops, for the one-time seed ---------- */

/**
 * Every station on the subway. Used once by scripts/seed-stations.ts.
 *
 * NOTE: for subway routes the API returns platform-level stops whose parent
 * is the "place-" station we actually want. We follow parent_station when it
 * is there. Check the first run's output before trusting it.
 */
export async function getStationsForRoute(route: RouteId): Promise<Station[]> {
  const doc = await mbtaGet(
    "/stops",
    { "filter[route]": route, include: "parent_station" },
    `stops:${route}`
  );

  const parents = new Map<string, JsonApiResource>();
  for (const inc of doc.included ?? []) {
    if (inc.type === "stop") parents.set(inc.id, inc);
  }

  const byId = new Map<string, Station>();
  for (const r of doc.data) {
    const parentId = relId(r, "parent_station");
    const src = parentId ? parents.get(parentId) ?? r : r;
    const id = parentId ?? r.id;

    const lat = num(src.attributes.latitude);
    const lon = num(src.attributes.longitude);
    const name = str(src.attributes.name);
    if (lat === null || lon === null || !name) continue;

    const existing = byId.get(id);
    if (existing) {
      if (!existing.routes.includes(route)) existing.routes.push(route);
    } else {
      byId.set(id, { id, name, routes: [route], lat, lon });
    }
  }
  return [...byId.values()];
}
