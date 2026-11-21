// Response helpers for route handlers. Every /api/* route returns
// { ok: true, data } or { ok: false, error } — the envelope from types.ts.
import { err, ok as okBody } from "../types";

/** Success response: { ok: true, data }. */
export function ok<T>(data: T): Response {
  return Response.json(okBody(data));
}

/** Error response: { ok: false, error }. */
export function fail(error: string, status = 400): Response {
  return Response.json(err(error), { status });
}

/** Parses a JSON request body; returns null if it is missing or malformed. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
