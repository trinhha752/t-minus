// Owner: Characters. MOCK — call the Mastra station agent (mastra/).
import type { ChatReply, ChatRequest } from "@/types";
import { fail, ok, readJson } from "@/lib/respond";

export async function POST(request: Request) {
  const body = await readJson<ChatRequest>(request);
  if (!body || typeof body.stationId !== "string" || typeof body.message !== "string") {
    return fail("expected { stationId, message }");
  }

  const reply: ChatReply = {
    reply: `(placeholder) The keeper of ${body.stationId} hears you: "${body.message}"`,
    questGranted: null,
  };
  return ok(reply);
}
