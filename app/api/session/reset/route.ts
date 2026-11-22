// POST /api/session/reset — start over as a brand-new rider (demo only).
// Drops the rider cookie; the next request creates a fresh rider with no
// stamps or points. The old rider's data stays in the database.

import { cookies } from "next/headers";
import { fail, ok } from "@/lib/respond";

export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEMO_MODE !== "1") {
    return fail("only available in demo mode", 403);
  }
  (await cookies()).delete("et_uid");
  return ok({ reset: true });
}
