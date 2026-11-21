// Owner: Backend. MOCK — resolve once the target arrival has happened.
// The client polls this every 10 seconds until resolved is true.
import type { NextRequest } from "next/server";
import type { GuessStatus } from "@/types";
import { ok } from "@/lib/respond";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const status: GuessStatus = {
    guessId: id,
    resolved: false,
    actualMinutes: null,
    pointsEarned: null,
  };
  return ok(status);
}
