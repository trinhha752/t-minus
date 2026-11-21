// GET /api/boss -> state of all four lines. Poll this every 10s from the map.
import { connection } from "next/server";
import { readBossStates } from "@/lib/boss";
import { fail, ok } from "@/lib/respond";

export async function GET() {
  // No request data is read here, so tell Next this must run per request.
  await connection();
  try {
    return ok(await readBossStates());
  } catch (e) {
    console.error("[boss]", e);
    return fail("could not read boss state", 500);
  }
}
