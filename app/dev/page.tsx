"use client";
// /dev — backend console. Owner: Backend.
// Not the game UI: a plain page that drives every live route so you can see
// the backend working before the real screens exist. Safe to delete later.

import { useCallback, useEffect, useState } from "react";
import type { Arrival, BossState, FinalBossFight, Progress } from "@/types";

type Api<T> = { ok: true; data: T } | { ok: false; error: string };

async function api<T>(path: string, body?: unknown): Promise<Api<T>> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res.json();
}

const LINE_COLOR: Record<string, string> = {
  Red: "#da291c",
  Orange: "#ed8b00",
  Blue: "#003da5",
  Green: "#00843d",
};

const STATIONS = [
  { id: "place-pktrm", name: "Park Street" },
  { id: "place-harsq", name: "Harvard" },
  { id: "place-kencl", name: "Kenmore" },
  { id: "place-dwnxg", name: "Downtown Crossing" },
];

export default function DevConsole() {
  const [bosses, setBosses] = useState<BossState[]>([]);
  const [stop, setStop] = useState(STATIONS[0].id);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [fight, setFight] = useState<FinalBossFight | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [shake, setShake] = useState(false);

  const say = (line: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l].slice(0, 12));

  const loadBoss = useCallback(async () => {
    const r = await api<BossState[]>("/api/boss");
    if (r.ok) setBosses(r.data);
  }, []);

  const loadArrivals = useCallback(async () => {
    const r = await api<Arrival[]>(`/api/predictions?stop=${stop}`);
    if (r.ok) {
      setArrivals(r.data);
      setFetchedAt(Date.now());
    }
  }, [stop]);

  const loadProgress = useCallback(async () => {
    const r = await api<Progress>("/api/progress");
    if (r.ok) setProgress(r.data);
  }, []);

  useEffect(() => {
    const first = setTimeout(() => {
      loadBoss();
      loadProgress();
    }, 0);
    const id = setInterval(loadBoss, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [loadBoss, loadProgress]);

  useEffect(() => {
    const first = setTimeout(loadArrivals, 0);
    const id = setInterval(loadArrivals, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [loadArrivals]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function clearStation(stationId: string, gameId: string) {
    const r = await api<{ pointsEarned: number; chapterBossUnlocked: string | null }>(
      "/api/minigame/result",
      { stationId, gameId, score: 500, cleared: true, durationMs: 30_000 }
    );
    if (!r.ok) return say(`✗ ${r.error}`);
    say(`cleared ${gameId}: +${r.data.pointsEarned} pts`);
    if (r.data.chapterBossUnlocked) say(`🔓 final boss unlocked: ${r.data.chapterBossUnlocked}`);
    loadProgress();
  }

  async function startFight(chapterId: string) {
    const r = await api<FinalBossFight>("/api/final-boss/start", { chapterId });
    if (!r.ok) return say(`✗ ${r.error}`);
    setFight(r.data);
    say(`⚔ ${r.data.bossName} appears (${r.data.hpTotal} HP, x${r.data.damageMultiplier} damage)`);
  }

  async function hit() {
    if (!fight) return;
    const r = await api<{ damage: number; hpRemaining: number; defeated: boolean; pointsEarned: number }>(
      "/api/final-boss/hit",
      { fightId: fight.id }
    );
    if (!r.ok) return say(`✗ ${r.error}`);
    setShake(true);
    setTimeout(() => setShake(false), 250);
    setFight({ ...fight, hpRemaining: r.data.hpRemaining, defeated: r.data.defeated });
    say(`hit for ${r.data.damage}${r.data.defeated ? ` — DEFEATED, +${r.data.pointsEarned} pts` : ""}`);
    if (r.data.defeated) loadProgress();
  }

  const age = fetchedAt && now ? Math.floor((now - fetchedAt) / 1000) : 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold">T-Minus backend console</h1>
        <p className="text-sm opacity-60">
          Every number here is live from the API. Not the game UI.
        </p>
      </header>

      {/* Delay bosses */}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Delay bosses · refreshes every 15s</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {bosses.map((b) => (
            <div
              key={b.line}
              className="rounded-lg border p-3"
              style={{ borderColor: LINE_COLOR[b.line], borderWidth: b.active ? 3 : 1 }}
            >
              <div className="font-bold" style={{ color: LINE_COLOR[b.line] }}>
                {b.line}
              </div>
              <div className="text-sm">{b.active ? "👹 BOSS UP" : "clean"}</div>
              {b.active && (
                <div className="mt-2 h-2 w-full rounded bg-black/10">
                  <div
                    className="h-2 rounded transition-all duration-500"
                    style={{
                      width: `${(100 * b.hpRemaining) / Math.max(1, b.hpTotal)}%`,
                      background: LINE_COLOR[b.line],
                    }}
                  />
                </div>
              )}
              <div className="mt-1 text-xs opacity-60">
                {b.lateTrains} late trains · avg {Math.round(b.avgDelaySeconds / 60)} min
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Arrivals */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">Next trains at</h2>
          <select
            className="rounded border bg-transparent px-2 py-1"
            value={stop}
            onChange={(e) => setStop(e.target.value)}
          >
            {STATIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <ul className="flex flex-col gap-2">
          {arrivals.map((a) => {
            const secs = a.secondsAway - age;
            return (
              <li key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>
                  <b>{a.route}</b> → {a.headsign ?? "?"}
                </span>
                <span className="font-mono text-lg tabular-nums">
                  {secs <= 0 ? "BOARDING" : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`}
                </span>
              </li>
            );
          })}
          {!arrivals.length && <li className="opacity-60">No trains right now.</li>}
        </ul>
      </section>

      {/* Progression */}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Chapters · you are a cookie rider</h2>
        {progress?.chapters.map((c) => (
          <div key={c.id} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b>{c.name}</b>
              <span className="text-sm">
                {c.bossDefeated ? "🏆 boss defeated" : c.bossUnlocked ? "🔓 boss unlocked" : "🔒 boss locked"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.stations.map((s) => (
                <button
                  key={s.stationId}
                  onClick={() => clearStation(s.stationId, s.gameId)}
                  className="rounded border px-2 py-1 text-sm hover:bg-black/5 active:scale-95"
                >
                  {s.cleared ? "✅" : "⬜"} {s.gameId}
                </button>
              ))}
            </div>
            <button
              disabled={!c.bossUnlocked}
              onClick={() => startFight(c.id)}
              className="self-start rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-30 dark:bg-white dark:text-black"
            >
              Fight {c.bossName}
            </button>
          </div>
        ))}
        {progress && progress.buffs.length > 0 && (
          <p className="text-sm">
            ✨ {progress.buffs.length} buff(s) ready from beating a delay boss
          </p>
        )}
      </section>

      {/* Final boss */}
      {fight && (
        <section
          className={`flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-transform ${
            shake ? "translate-x-1" : ""
          }`}
        >
          <div className="text-xl font-bold">{fight.bossName}</div>
          <div className="h-4 w-full rounded bg-black/10">
            <div
              className="h-4 rounded bg-red-600 transition-all duration-300"
              style={{ width: `${(100 * fight.hpRemaining) / fight.hpTotal}%` }}
            />
          </div>
          <div className="font-mono">
            {fight.hpRemaining} / {fight.hpTotal} HP · x{fight.damageMultiplier}
          </div>
          <button
            onClick={hit}
            disabled={fight.defeated}
            className="rounded-lg bg-red-600 px-6 py-3 text-lg font-bold text-white active:scale-95 disabled:opacity-40"
          >
            {fight.defeated ? "Defeated 🏆" : "HIT (1 per 1.5s)"}
          </button>
        </section>
      )}

      {/* Log */}
      <section className="flex flex-col gap-1">
        <h2 className="font-semibold">Log</h2>
        <pre className="min-h-24 overflow-x-auto rounded-lg bg-black/5 p-3 text-xs">
          {log.join("\n") || "Click something."}
        </pre>
      </section>
    </main>
  );
}
