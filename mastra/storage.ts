// mastra/storage.ts
// Mastra's storage (agent memory, workflow snapshots) lives in Tiger Data, in its
// own `mastra` schema, reusing the app's pg pool (which already handles Tiger's SSL).

import { PostgresStore } from "@mastra/pg";
import { pool } from "@/lib/db";

// Mastra's Gemini model strings read GOOGLE_API_KEY; the app's key is GOOGLE_GENERATIVE_AI_API_KEY.
process.env.GOOGLE_API_KEY ??= process.env.GOOGLE_GENERATIVE_AI_API_KEY;

export const storage = new PostgresStore({ id: "tminus-mastra", pool, schemaName: "mastra" });
