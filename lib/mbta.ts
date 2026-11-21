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
export interface JsonApiDoc {
  data: JsonApiResource[];
  included?: JsonApiResource[];
}

/** One MBTA request: endpoint, query params, and its key in the seed file. */
export interface MbtaRequest {
  endpoint: string;
  params: Record<string, string>;
  key: string;
}

/* ---------- core fetch ---------- */

export const SEED_FILE = path.join(process.cwd(), "public", "seed", "mbta-fallback.json");

/** The seed file: verbatim MBTA responses by key, plus when they were saved. */
export type SeedFile = { _savedAt?: string } & Record<string, JsonApiDoc | string | undefined>;

const TIME_FIELDS = ["arrival_time", "departure_time", "updated_at"];

/**
 * Saved real responses, used when USE_SEED=1 or the network fails.
 *
 * Every timestamp is moved forward by (now - savedAt), so a train that was
 * 4 minutes out when the file was saved is still 4 minutes out on stage.
 * Without the shift, every saved arrival would be in the past and filtered out.
 */
function readSeed(key: string): JsonApiDoc | null {
  try {
    const all = JSON.parse(fs.readFileSync(SEED_FILE, "utf8")) as SeedFile;
    const doc = all[key];
    if (!doc || typeof doc === "string") return null;

    const savedAt = all._savedAt ? Date.parse(all._savedAt) : NaN;
    if (Number.isNaN(savedAt)) return doc;
    const shift = Date.now() - savedAt;

    const move = (r: JsonApiResource): JsonApiResource => {
      const attributes = { ...r.attributes };
      for (const f of TIME_FIELDS) {
        const v = attributes[f];
        if (typeof v === "string") attributes[f] = new Date(Date.parse(v) + shift).toISOString();
      }
      return { ...r, attributes };
    };
    return { data: doc.data.map(move), included: doc.included?.map(move) };
  } catch {
    return null;
  }
}

/** One live request, no cache and no fallback. Used directly to save the seed file. */
export async function mbtaFetchLive({ endpoint, params }: MbtaRequest): Promise<JsonApiDoc> {
  const qs = new URLSearchParams(params).toString();
  const headers: Record<string, string> = { Accept: "application/vnd.api+json" };
  if (process.env.MBTA_API_KEY) headers["x-api-key"] = process.env.MBTA_API_KEY;

  const res = await fetch(`${BASE}${endpoint}?${qs}`, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`MBTA ${res.status} for ${endpoint}`);
  return (await res.json()) as JsonApiDoc;
}

/**
 * GET from the MBTA with a 10s cache.
 * `key` is also the lookup into the seed file, so keep it stable.
 */
export async function mbtaGet(req: MbtaRequest): Promise<JsonApiDoc> {
  const cacheKey = `${req.endpoint}?${new URLSearchParams(req.params)}`;

  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.body as JsonApiDoc;

  if (USE_SEED) {
    const seeded = readSeed(req.key);
    if (seeded) return seeded;
  }

  try {
    const body = await mbtaFetchLive(req);
    cache.set(cacheKey, { at: Date.now(), body });
    return body;
  } catch (e) {
    // Live call failed. Fall back rather than blanking the screen mid-demo.
    const seeded = readSeed(req.key);
    if (seeded) {
      console.warn(`[mbta] live call failed, served seed for ${req.key}:`, (e as Error).message);
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

/** Trips the MBTA has dropped. They come back with both times null. */
const NOT_STOPPING = new Set(["CANCELLED", "SKIPPED"]);

/** Every prediction at one stop. No page limit: see getPredictions. */
export function predictionsRequest(stopId: string): MbtaRequest {
  return {
    endpoint: "/predictions",
    params: { "filter[stop]": stopId, sort: "time", include: "trip" },
    key: `predictions:${stopId}`,
  };
}

/**
 * Next arrivals at a station, soonest first.
 *
 * MBTA rules that matter here:
 *  - arrival_time is null at a route's first stop, departure_time is null at
 *    its last stop, and a prediction with BOTH null means the train will not
 *    make the stop (schedule_relationship CANCELLED or SKIPPED). Those get dropped.
 *  - the API sorts those null-time rows FIRST whatever the sort key, so a
 *    page limit can return nothing but cancellations. A station only has
 *    ~50 predictions, so we fetch them all and trim here instead.
 *  - we score the guess game against arrival_time when it exists, because
 *    that is the moment a rider actually sees the train. A train still at the
 *    platform (arrived, not yet departed) stays in the list with a negative
 *    secondsAway; once it has departed it is dropped.
 */
export async function getPredictions(stopId: string, limit = 5): Promise<Arrival[]> {
  const doc = await mbtaGet(predictionsRequest(stopId));

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
      if (NOT_STOPPING.has(str(r.attributes.schedule_relationship) ?? "")) return null;

      const arrival = str(r.attributes.arrival_time);
      const departure = str(r.attributes.departure_time);
      const time = arrival ?? departure;
      if (!time) return null; // train is skipping this stop

      const route = relId(r, "route");
      if (!isRoute(route)) return null; // bus, ferry, commuter rail: not our game

      // Gone once it has left: departure_time when there is one, else arrival.
      if (Date.parse(departure ?? time) < now) return null;

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
    .filter((a): a is Arrival => a !== null)
    .sort((a, b) => a.secondsAway - b.secondsAway)
    .slice(0, limit);
}

/* ---------- vehicles ---------- */

/**
 * Every subway vehicle in one call. /api/trains?line=X filters this list
 * rather than making a call per line: one cached request serves every map,
 * and the single seed entry covers every line offline.
 */
export function vehiclesRequest(): MbtaRequest {
  const routes = ALL_ROUTES.join(",");
  return {
    endpoint: "/vehicles",
    params: { "filter[route]": routes },
    key: `vehicles:${routes}`,
  };
}

/** Live train positions. Pass no route to get every subway line. */
export async function getVehicles(route?: RouteId): Promise<Vehicle[]> {
  const doc = await mbtaGet(vehiclesRequest());

  return doc.data
    .map((r): Vehicle | null => {
      const lat = num(r.attributes.latitude);
      const lon = num(r.attributes.longitude);
      const rt = relId(r, "route");
      if (lat === null || lon === null || !isRoute(rt)) return null;
      if (route && rt !== route) return null;

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
  const doc = await mbtaGet({
    endpoint: "/schedules",
    params: { "filter[stop]": stopId, sort: "time", "page[limit]": "60" },
    key: `schedules:${stopId}`,
  });

  const out = new Map<string, string>();
  for (const r of doc.data) {
    const tripId = relId(r, "trip");
    const t = str(r.attributes.arrival_time) ?? str(r.attributes.departure_time);
    if (tripId && t) out.set(tripId, t);
  }
  return out;
}

/* ---------- alerts: the cheap boss trigger ---------- */

/** Routes with an active official delay alert. The poller spawns a boss on these too. */
export async function getDelayAlerts(): Promise<Set<RouteId>> {
  const doc = await mbtaGet({
    endpoint: "/alerts",
    params: {
      "filter[route]": ALL_ROUTES.join(","),
      "filter[datetime]": "NOW",
      "filter[severity]": "3,4,5,6,7,8,9,10",
    },
    key: "alerts:all",
  });

  const hit = new Set<RouteId>();
  for (const r of doc.data) {
    const effect = str(r.attributes.effect);
    // DELAY only. SERVICE_CHANGE, SHUTTLE and closures are planned work,
    // listed for weeks at a time, and would keep a boss up permanently.
    if (effect !== "DELAY") continue;
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
  const doc = await mbtaGet({
    endpoint: "/stops",
    params: { "filter[route]": route, include: "parent_station" },
    key: `stops:${route}`,
  });

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
