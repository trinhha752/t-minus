// POST /api/photo-quest/verify { questId, imageBase64, line? }
//   -> { ok: true, data: { passed, reason } }
// imageBase64 is a JPEG, raw base64 or a data: URL. The client resizes to
// 768px first, so anything over ~1.5 MB is refused rather than sent on.
// Fails open (see lib/gemini.ts). The image is never stored or logged.

import { fail, ok, readJson } from "@/lib/respond";
import { verifyPhoto } from "@/lib/gemini";
import { questFor } from "@/lib/photo-quests";
import type { TeamLine } from "@/types";
import { ALL_TEAMS } from "@/types";

const MAX_BASE64 = 1_500_000;

export async function POST(request: Request) {
  const body = await readJson<{ questId?: string; imageBase64?: string; line?: TeamLine }>(request);
  if (!body || typeof body.questId !== "string" || typeof body.imageBase64 !== "string") {
    return fail("expected { questId, imageBase64 }");
  }
  const line: TeamLine = body.line && ALL_TEAMS.includes(body.line) ? body.line : "Red";
  const quest = questFor(body.questId, line);
  if (!quest) return fail("unknown quest", 404);

  const base64 = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
  if (base64.length > MAX_BASE64) return fail("photo too large: resize to 768px first", 413);
  if (!/^[A-Za-z0-9+/=]+$/.test(base64.slice(0, 200))) return fail("imageBase64 is not base64");

  const verdict = await verifyPhoto(quest.target, base64);
  // checked=false: Gemini couldn't be reached, so it counted without a check.
  return ok({ passed: verdict.passed, reason: verdict.reason, checked: verdict.checked });
}
