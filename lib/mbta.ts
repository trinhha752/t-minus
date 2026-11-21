// Owner: Transit. Server-side only — the API key must never reach the browser.
// TODO: wrap /vehicles, /predictions, /schedules, /alerts with a ~10s cache,
// falling back to public/seed/mbta-fallback.json when the API is unreachable.

export const MBTA_BASE_URL = "https://api-v3.mbta.com";

/** Fetches one MBTA V3 endpoint, e.g. mbtaFetch("/vehicles?filter[route]=Red"). */
export async function mbtaFetch(path: string): Promise<unknown> {
  const headers: HeadersInit = {};
  if (process.env.MBTA_API_KEY) headers["x-api-key"] = process.env.MBTA_API_KEY;
  const res = await fetch(`${MBTA_BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`MBTA ${res.status} for ${path}`);
  return res.json();
}
