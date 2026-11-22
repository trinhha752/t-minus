"use client";
// components/game/DelayChart.tsx
// "The delay that summoned it": a line's share of late trains over the last
// few hours, from Tiger Data's late_share_5m continuous aggregate
// (GET /api/delays). Bars over the dashed 50% line are boss territory.

import { useEffect, useState } from "react";
import type { TeamLine } from "@/types";

type Point = { t: string; latePct: number };
type Stats = { snapshotRows: number; compressionSavedPct: number | null };

const LINE_COLOR: Record<TeamLine, string> = { Red: "#DA291C", Orange: "#ED8B00", Blue: "#2B6CE8", Green: "#00B04F" };
const BOSS_PCT = 50; // lib/scoring.ts BOSS_SPAWN_LATE_SHARE

const millions = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}k`);

export function DelayChart({ line, hours = 3 }: { line: TeamLine; hours?: number }) {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/delays?line=${line}&hours=${hours}`)
      .then((r) => r.json())
      .then((r) => {
        if (!alive || !r?.ok) return;
        setPoints(r.data.points);
        setStats(r.data.stats);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [line, hours]);

  const color = LINE_COLOR[line];
  const W = 300;
  const H = 64;
  const n = points?.length ?? 0;
  const bar = n ? W / n : 0;
  const now = points?.length ? points[points.length - 1].latePct : null;
  const y = (pct: number) => H - (Math.min(100, pct) / 100) * H;

  return (
    <div className="w-full max-w-[320px] rounded-[12px] border border-[#C99A3B]/70 bg-black/55 px-3 pb-2 pt-2 text-[#F3E3BF] shadow-[0_6px_14px_rgba(0,0,0,0.45)]">
      <div className="flex items-baseline justify-between">
        <p className="whitespace-nowrap font-fantasy text-[11px] font-black tracking-[0.1em] text-[#FFD98A]">THE REAL DELAY</p>
        {now !== null && (
          <p className="text-[11px] font-bold tabular-nums" style={{ color: now >= BOSS_PCT ? "#FF8A7A" : "#C9E8D2" }}>
            {now}% late now
          </p>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H + 12}`} className="mt-1 h-[76px] w-full" role="img" aria-label={`${line} Line: share of trains 5 or more minutes late over the last ${hours} hours`}>
        {points?.map((p, i) => (
          <rect
            key={p.t}
            x={i * bar + 0.5}
            y={y(p.latePct)}
            width={Math.max(1, bar - 1)}
            height={H - y(p.latePct)}
            fill={p.latePct >= BOSS_PCT ? color : `${color}66`}
            shapeRendering="crispEdges"
          />
        ))}
        {/* boss threshold, drawn over the bars so it shows even when every bar is above it */}
        <line x1="0" x2={W} y1={y(BOSS_PCT)} y2={y(BOSS_PCT)} stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="5 3" />
        <text x={W - 2} y={y(BOSS_PCT) - 3} textAnchor="end" fontSize="9" fontWeight="bold" fill="#FFFFFF" stroke="#000" strokeWidth="2" paintOrder="stroke">
          boss spawns at {BOSS_PCT}%
        </text>
        <line x1="0" x2={W} y1={H} y2={H} stroke="#C99A3B" strokeWidth="1" />
        <text x="0" y={H + 10} fontSize="8" fill="#C9B28A">
          {hours}h ago
        </text>
        <text x={W} y={H + 10} textAnchor="end" fontSize="8" fill="#C9B28A">
          now
        </text>
        {points && !points.length && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="10" fill="#C9B28A">
            no data yet
          </text>
        )}
      </svg>
      <p className="text-[10px] leading-tight text-[#C9B28A]">
        {line} Line trains 5+ min late, live from Tiger Data
        {stats && ` · ${millions(stats.snapshotRows)} predictions${stats.compressionSavedPct ? ` · ${Math.round(stats.compressionSavedPct)}% compressed` : ""}`}
      </p>
    </div>
  );
}
