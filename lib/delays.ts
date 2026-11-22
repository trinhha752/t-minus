// lib/delays.ts
// Delay history for the charts, read from Tiger Data.
//
// Reads two continuous aggregates (schema.sql) that TimescaleDB keeps up to
// date in the background: delay_5m (AVG/MAX delay) and late_share_5m (how many
// predictions ran 5+ minutes late). A 3-hour chart is ~36 pre-computed rows
// instead of a scan over the ~1,300 raw predictions written every 15 seconds.

import { q } from "./db";
import type { TeamLine } from "../types";

export interface DelayPoint {
  /** Bucket start, ISO. */
  t: string;
  /** Average delay in the bucket, seconds, never negative (early trains count as on time). */
  avgDelaySeconds: number;
  /** Worst delay seen in the bucket, seconds. */
  maxDelaySeconds: number;
  /** Share of predictions 5+ minutes late, 0..100. The Delay Boss spawns around 50. */
  latePct: number;
}

/** A line's delay over the last `hours`, one point per 5 minutes. Green merges its four branches. */
export async function delayHistory(line: TeamLine, hours = 3): Promise<DelayPoint[]> {
  const rows = await q<{ t: Date; avg: string | null; max: string | null; late_pct: string | null }>(
    `WITH d AS (
       SELECT bucket,
              GREATEST(AVG(avg_delay_seconds), 0) AS avg,
              GREATEST(MAX(max_delay_seconds), 0) AS max
         FROM delay_5m
        WHERE bucket > now() - make_interval(hours => $2)
          AND CASE WHEN route LIKE 'Green%' THEN 'Green' ELSE route END = $1
        GROUP BY bucket
     ), l AS (
       SELECT bucket, 100.0 * SUM(late) / NULLIF(SUM(samples), 0) AS late_pct
         FROM late_share_5m
        WHERE bucket > now() - make_interval(hours => $2)
          AND CASE WHEN route LIKE 'Green%' THEN 'Green' ELSE route END = $1
        GROUP BY bucket
     )
     SELECT COALESCE(d.bucket, l.bucket) AS t, d.avg, d.max, l.late_pct
       FROM d FULL JOIN l ON l.bucket = d.bucket
      ORDER BY 1`,
    [line, hours]
  );
  return rows.map((r) => ({
    t: r.t.toISOString(),
    avgDelaySeconds: Math.round(Number(r.avg ?? 0)),
    maxDelaySeconds: Math.round(Number(r.max ?? 0)),
    latePct: Math.round(Number(r.late_pct ?? 0)),
  }));
}

export interface TigerStats {
  /** Raw prediction rows stored (TimescaleDB's fast estimate). */
  snapshotRows: number;
  /** Space saved by columnstore compression on the snapshots, percent. */
  compressionSavedPct: number | null;
}

/** Headline numbers for the chart caption and the pitch. Cached for a minute. */
let cached: { at: number; stats: TigerStats } | null = null;
export async function tigerStats(): Promise<TigerStats> {
  if (cached && Date.now() - cached.at < 60_000) return cached.stats;
  const [count] = await q<{ n: string }>(`SELECT approximate_row_count('prediction_snapshots') AS n`);
  let saved: number | null = null;
  try {
    const [c] = await q<{ pct: string | null }>(
      `SELECT round(100 - 100.0 * after_compression_total_bytes / NULLIF(before_compression_total_bytes, 0), 1) AS pct
         FROM hypertable_columnstore_stats('prediction_snapshots')`
    );
    saved = c?.pct == null ? null : Number(c.pct);
  } catch {
    saved = null; // older TimescaleDB names this hypertable_compression_stats; the chart doesn't need it
  }
  const stats = { snapshotRows: Number(count?.n ?? 0), compressionSavedPct: saved };
  cached = { at: Date.now(), stats };
  return stats;
}
