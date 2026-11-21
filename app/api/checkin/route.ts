// Owner: Backend. MOCK — look up the station, check distance with lib/geo.ts,
// write a checkins row, award points once per station per day.
import type { CheckinRequest, CheckinResult } from "@/types";
import { fail, ok, readJson } from "@/lib/respond";
import { POINTS } from "@/lib/scoring";

export async function POST(request: Request) {
  const body = await readJson<CheckinRequest>(request);
  if (
    !body ||
    typeof body.stationId !== "string" ||
    typeof body.lat !== "number" ||
    typeof body.lon !== "number"
  ) {
    return fail("expected { stationId, lat, lon }");
  }

  const result: CheckinResult = {
    accepted: true,
    reason: null,
    pointsEarned: POINTS.checkin,
    newBadge: null,
  };
  return ok(result);
}
