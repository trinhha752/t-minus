// GET /api/progress -> every chapter with cleared stations, boss state, and active buffs.
import { getProgress } from "@/lib/progress";
import { currentUserId } from "@/lib/session";
import { fail, ok } from "@/lib/respond";

export async function GET() {
  try {
    return ok(await getProgress(await currentUserId()));
  } catch (e) {
    console.error("[progress]", e);
    return fail("could not read progress", 500);
  }
}
