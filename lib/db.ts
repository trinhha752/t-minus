// lib/db.ts
// One pool for the whole app. Tiger Data is Postgres, so `pg` is all you need.

import { Pool } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

/**
 * Tiger Data's connection string says sslmode=require, and its certificate
 * chain ends in a self-signed root. `pg` reads "require" as full verification
 * and rejects that chain, so ask for libpq's meaning instead: encrypt the
 * connection without verifying the chain.
 */
function connectionString(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  const url = new URL(raw);
  if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
  if (!url.searchParams.has("uselibpqcompat")) url.searchParams.set("uselibpqcompat", "true");
  return url.toString();
}

// Next.js hot-reloads modules in dev, which would otherwise open a new pool
// on every save until the database refuses connections.
export const pool =
  global.__pgPool ??
  new Pool({
    connectionString: connectionString(),
    max: 8,
  });

if (process.env.NODE_ENV !== "production") global.__pgPool = pool;

export async function q<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function one<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

/** Run several statements atomically. Used for boss damage. */
export async function tx<T>(fn: (c: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
