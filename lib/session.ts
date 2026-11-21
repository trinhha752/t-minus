// lib/session.ts
// Deliberate stub so every route works before login is wired.
// Swap the body of currentUserId() for your real auth and nothing else changes.

import { cookies } from "next/headers";
import { q, one } from "./db";
import type { TeamLine } from "../types";

const DEMO_COOKIE = "et_uid";

/** The signed-in user's id, creating a throwaway demo user if there is none. */
export async function currentUserId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(DEMO_COOKIE)?.value;
  if (existing) {
    const found = await one(`SELECT id FROM users WHERE id = $1`, [existing]);
    if (found) return existing;
  }

  const id = `demo_${Math.random().toString(36).slice(2, 10)}`;
  await q(
    `INSERT INTO users (id, name, team_line) VALUES ($1, $2, $3)`,
    [id, "Rider", "Green" satisfies TeamLine]
  );

  // Route handlers can set cookies; a Server Component cannot. If this throws
  // in a component context, just let it: the id still works for this request.
  try {
    jar.set(DEMO_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  } catch {
    /* read-only cookie store */
  }

  return id;
}
