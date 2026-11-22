// POST /api/chat { stationId, message } -> ChatReply
// The Conductor, a Mastra agent on Gemini (mastra/agents/conductor.ts). It picks
// its own tools (live trains, Tiger Data delays, the Delay Boss, the rider's
// progress, station info) and remembers the conversation per rider, in Tiger Data.

import { RequestContext } from "@mastra/core/request-context";
import { fail, ok, readJson } from "@/lib/respond";
import { currentUserId } from "@/lib/session";
import { mastra } from "@/mastra";
import type { ChatReply, ChatRequest } from "@/types";

// Several tool round trips can take ~10–15 s.
export const maxDuration = 60;

const TOOL_IDS: Record<string, string> = {
  nextTrainsTool: "get-next-trains",
  lineDelaysTool: "get-line-delays",
  delayBossTool: "get-delay-boss",
  riderProgressTool: "get-rider-progress",
  stationInfoTool: "get-station-info",
};

export async function POST(request: Request) {
  const body = await readJson<ChatRequest>(request);
  if (!body || typeof body.stationId !== "string" || typeof body.message !== "string") {
    return fail("expected { stationId, message }");
  }
  const message = body.message.trim().slice(0, 500);
  if (!message) return fail("say something to the Conductor");

  const userId = await currentUserId();
  const requestContext = new RequestContext();
  requestContext.set("userId", userId);

  try {
    const res = await mastra.getAgent("conductor").generate(`[Rider is at ${body.stationId}] ${message}`, {
      requestContext,
      memory: { resource: userId, thread: `${userId}:conductor` },
      maxSteps: 6,
    });
    // Every step's tool calls and results (the top-level arrays only cover the last step).
    const calls = res.steps.flatMap((st) => st.toolCalls ?? []);
    const results = res.steps.flatMap((st) => st.toolResults ?? []);
    const toolsUsed = [...new Set(calls.map((c) => TOOL_IDS[c.payload.toolName] ?? c.payload.toolName))];
    const toolData: Record<string, unknown> = {};
    for (const r of results) toolData[TOOL_IDS[r.payload.toolName] ?? r.payload.toolName] = r.payload.result;
    const reply: ChatReply = {
      characterName: "The Conductor",
      text: res.text?.trim() || "The Conductor tips his cap but says nothing. Try again in a moment.",
      questGranted: null,
      toolsUsed,
      toolData,
    };
    return ok(reply);
  } catch (e) {
    console.error("[chat]", (e as Error).message);
    return fail("The Conductor is busy (Gemini didn't answer). Try again in a few seconds.", 503);
  }
}
