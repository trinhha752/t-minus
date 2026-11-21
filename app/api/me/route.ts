// Owner: Backend. MOCK — read the signed-in user from users + badges.
import type { Me } from "@/types";
import { ok } from "@/lib/respond";

const MOCK: Me = {
  name: "Demo Rider",
  teamLine: "Green",
  level: 3,
  points: 240,
  streak: 2,
  co2SavedKg: 1.8,
  badges: [{ type: "first-stamp", label: "First Stamp", earnedAt: "2026-11-21T14:30:00Z" }],
};

export async function GET() {
  return ok(MOCK);
}
