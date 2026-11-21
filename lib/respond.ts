import type { ApiResult } from "@/types";

/** Success response: { ok: true, data }. */
export function ok<T>(data: T): Response {
  const body: ApiResult<T> = { ok: true, data };
  return Response.json(body);
}

/** Error response: { ok: false, error }. */
export function fail(error: string, status = 400): Response {
  const body: ApiResult<never> = { ok: false, error };
  return Response.json(body, { status });
}

/** Parses a JSON request body; returns null if it is missing or malformed. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
