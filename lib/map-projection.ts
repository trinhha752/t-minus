// lib/map-projection.ts
// Turns lat/lon into map coordinates (a 1000 x 1000 box, north up).
// Pure and dependency-free, so the browser can use it too: the map projects
// live train positions with the same numbers the stations were laid out with.
//
//   import layout from "@/data/map-layout.json";
//   const { x, y } = project(layout.projection, train.lat, train.lon);

export interface MapProjection {
  /** Centre of the spread: Park Street. */
  lat0: number;
  lon0: number;
  /** Distance is raised to this power. 1 = true geography; lower spreads downtown out. */
  exponent: number;
  /** Fit into the box: x = offsetX + rawX * scale. */
  scale: number;
  offsetX: number;
  offsetY: number;
}

const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LON_AT_EQUATOR = 111_320;

/** Metres east/north of the centre, after the radial spread. Before fitting. */
export function rawProject(
  p: Pick<MapProjection, "lat0" | "lon0" | "exponent">,
  lat: number,
  lon: number
): { x: number; y: number } {
  // Equirectangular, corrected for latitude so Boston isn't squashed sideways.
  const east = (lon - p.lon0) * M_PER_DEG_LON_AT_EQUATOR * Math.cos((p.lat0 * Math.PI) / 180);
  const north = (lat - p.lat0) * M_PER_DEG_LAT;

  // Radial spread: keep each station's direction from Park Street, but shrink
  // long distances more than short ones. Downtown gets room to tap; the
  // ends of the lines pull in. Still automatic, no hand placement.
  const r = Math.hypot(east, north);
  const k = r > 0 ? r ** p.exponent / r : 0;
  return { x: east * k, y: -north * k }; // y flipped: north is up
}

export function project(p: MapProjection, lat: number, lon: number): { x: number; y: number } {
  const raw = rawProject(p, lat, lon);
  return {
    x: Math.round((p.offsetX + raw.x * p.scale) * 10) / 10,
    y: Math.round((p.offsetY + raw.y * p.scale) * 10) / 10,
  };
}
