// GET /api/trains?line=Red  (omit line, or line=all, for every subway train)
// line is an MBTA route id: Red, Orange, Blue, Green-B, Green-C, Green-D, Green-E.
import type { NextRequest } from "next/server";
import { getVehicles } from "@/lib/mbta";
import { fail, ok } from "@/lib/respond";
import { ALL_ROUTES } from "@/types";
import type { RouteId } from "@/types";

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get("line");
  const line = param && param !== "all" ? param : null;

  if (line && !(ALL_ROUTES as string[]).includes(line)) {
    return fail(`unknown line ${line}`);
  }

  try {
    return ok(await getVehicles((line as RouteId | null) ?? undefined));
  } catch (e) {
    console.error("[trains]", e);
    return fail("could not reach the MBTA", 502);
  }
}
