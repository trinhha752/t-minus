// Owner: Transit. MOCK — replace with lib/mbta.ts (/vehicles, 10s cache).
import type { NextRequest } from "next/server";
import type { Line, TrainsResponse } from "@/types";
import { ok } from "@/lib/respond";

const MOCK: TrainsResponse = [
  { id: "R-1", line: "Red", lat: 42.3564, lon: -71.0624, status: "STOPPED_AT" },
  { id: "G-1", line: "Green", lat: 42.3496, lon: -71.1058, status: "IN_TRANSIT_TO" },
  { id: "O-1", line: "Orange", lat: 42.3525, lon: -71.0627, status: "INCOMING_AT" },
  { id: "B-1", line: "Blue", lat: 42.3597, lon: -71.0517, status: "IN_TRANSIT_TO" },
];

export async function GET(request: NextRequest) {
  const line = request.nextUrl.searchParams.get("line") ?? "all";
  const trains =
    line === "all" ? MOCK : MOCK.filter((t) => t.line === (line as Line));
  return ok(trains);
}
