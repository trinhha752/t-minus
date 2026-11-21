// Owner: Backend. Distance check for check-ins.

export const CHECKIN_RADIUS_M = 150;

/** Great-circle distance in metres between two lat/lon points (haversine). */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function withinCheckinRange(
  riderLat: number,
  riderLon: number,
  stationLat: number,
  stationLon: number,
): boolean {
  return distanceMeters(riderLat, riderLon, stationLat, stationLon) <= CHECKIN_RADIUS_M;
}
