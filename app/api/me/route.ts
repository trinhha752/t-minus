// MOCK — read the signed-in user from users + badges.
import type { Me } from "@/types";
import { ok } from "@/lib/respond";

const MOCK: Me = {
  id: "demo_mock",
  name: "Demo Rider",
  team: "Green",
  level: 3,
  points: 240,
  streak: 2,
  co2SavedKg: 1.8,
  stampedStationIds: ["place-pktrm"],
  badges: [{ type: "station", label: "Park Street", earnedAt: "2026-11-21T14:30:00Z" }],
};

export async function GET() {
  return ok(MOCK);
}
