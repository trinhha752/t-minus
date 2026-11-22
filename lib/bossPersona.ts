// lib/bossPersona.ts
// Gemini names each real Delay Boss from the actual delay, once, and stores it on
// the boss (boss_events.name/taunt) so everyone on the line fights the same boss.
// If Gemini is busy, the UI keeps its own boss names (nothing is stored, so the
// next request tries again).

import { one, q } from "./db";
import { askGeminiJson } from "./gemini";
import type { TeamLine } from "../types";

export interface BossPersona {
  name: string;
  taunt: string;
  /** "gemini": written for this delay. */
  source: "gemini";
}

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

/** The persona of the live Delay Boss on this line, writing it with Gemini the first time. null if no boss or Gemini is busy. */
export async function bossPersona(line: TeamLine): Promise<BossPersona | null> {
  const boss = await one<{ id: number; name: string | null; taunt: string | null; source: string }>(
    `SELECT id, name, taunt, source FROM boss_events WHERE line = $1 AND ended_at IS NULL`,
    [line]
  );
  if (!boss) return null;
  if (boss.name && boss.taunt) return { name: boss.name, taunt: boss.taunt, source: "gemini" };

  // The real numbers behind this boss.
  const status = await one<{ late_trains: number; trains_sampled: number; worst_delay_seconds: number; delay_alert: boolean }>(
    `SELECT late_trains, trains_sampled, worst_delay_seconds, delay_alert FROM line_status WHERE line = $1`,
    [line]
  );
  const [share] = await q<{ pct: string | null }>(
    `SELECT round(100.0 * SUM(late) / NULLIF(SUM(samples), 0)) AS pct
       FROM late_share_5m
      WHERE bucket > now() - interval '30 minutes'
        AND CASE WHEN route LIKE 'Green%' THEN 'Green' ELSE route END = $1`,
    [line]
  );
  const late = status?.late_trains ?? 0;
  const sampled = status?.trains_sampled ?? 0;
  const worstMin = Math.round((status?.worst_delay_seconds ?? 0) / 60);
  const pct = share?.pct == null ? null : Number(share.pct);

  const facts = [
    `Line: the MBTA ${line} Line in Boston.`,
    sampled ? `${late} of ${sampled} trains are running 5+ minutes late right now.` : null,
    pct != null ? `${pct}% of predictions in the last 30 minutes were 5+ minutes late.` : null,
    worstMin ? `The worst train is about ${worstMin} minutes behind.` : null,
    status?.delay_alert ? "The MBTA has posted an official delay alert." : null,
    boss.source === "manual" ? "(This is a demo boss; the numbers are still real.)" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const answer = await askGeminiJson(
    "You name villains for a pixel-art RPG about the Boston subway. A real train delay just summoned a boss. " +
      'Answer ONLY with JSON {"name": string, "taunt": string}. ' +
      "name: 2 to 5 words, a fantasy villain title with a transit pun (signals, switches, rails, platforms, doors, the line's color). " +
      "taunt: one short line the boss says to riders, under 14 words, in quotes-free plain text, that mentions one of the real numbers. " +
      "Playful, never mean about real people or the MBTA staff.",
    facts
  );
  const name = clean(answer?.name, 60);
  const taunt = clean(answer?.taunt, 120).replace(/^["“]|["”]$/g, "");
  if (!name || !taunt) return null;

  // First writer wins, so two riders opening the boss at once see the same one.
  const [saved] = await q<{ name: string; taunt: string }>(
    `UPDATE boss_events SET name = COALESCE(name, $2), taunt = COALESCE(taunt, $3)
      WHERE id = $1 RETURNING name, taunt`,
    [boss.id, name, taunt]
  );
  return saved ? { name: saved.name, taunt: saved.taunt, source: "gemini" } : null;
}
