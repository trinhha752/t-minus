// lib/geo.ts
// Distance for check-ins. Nothing clever, but get the radius right:
// too tight and nobody can check in, too loose and you can play from a cafe.

export const CHECKIN_RADIUS_M = 150;

/** Great-circle distance in metres. */
export function metresBetween(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function withinCheckinRange(
  userLat: number,
  userLon: number,
  stationLat: number,
  stationLon: number
): { ok: boolean; metres: number } {
  const metres = metresBetween(userLat, userLon, stationLat, stationLon);
  return { ok: metres <= CHECKIN_RADIUS_M, metres };
}
