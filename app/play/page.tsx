"use client";
// /play — the 2-hour test. Pick your station, see your real next train, and
// play "stop at the platform" while you wait. A cleared run counts as that
// station's level (POST /api/minigame/result).

import { useCallback, useEffect, useState } from "react";
import BrakeGame from "@/components/game/BrakeGame";
import PhotoQuest from "@/components/PhotoQuest";
import { ROUTES, STATIONS, LINES, type LineId } from "@/components/run/stations";
import type { BrakeResult } from "@/game/brake";
import type { Arrival, TeamLine } from "@/types";

type Screen = "pick" | "brake" | "results" | "photo";
const TEAM: Record<LineId, TeamLine> = { red: "Red", green: "Green" };

export default function PlayPage() {
  const [lineId, setLineId] = useState<LineId>("red");
  const [slug, setSlug] = useState("harvard");
  const [screen, setScreen] = useState<Screen>("pick");
  const [result, setResult] = useState<BrakeResult | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);

  const station = STATIONS.find((s) => s.id === slug)!;
  const line = LINES[lineId];

  // Your real wait: next trains at this station, refreshed every 15s.
  const loadArrivals = useCallback(async () => {
    const r = await fetch(`/api/predictions?stop=${slug}`).then((x) => x.json()).catch(() => null);
    if (r?.ok) {
      setArrivals(r.data);
      setFetchedAt(Date.now());
    }
  }, [slug]);
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
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const next = arrivals.find((a) => a.secondsAway - (now - fetchedAt) / 1000 > 0);
  const secs = next ? Math.max(0, Math.round(next.secondsAway - (now - fetchedAt) / 1000)) : null;

  const onFinish = useCallback(
    async (r: BrakeResult) => {
      setResult(r);
      setScreen("results");
      setSaved("saving…");
      const res = await fetch("/api/minigame/result", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stationId: slug, score: r.score, cleared: r.cleared, durationMs: r.durationMs }),
      })
        .then((x) => x.json())
        .catch(() => null);
      setSaved(
        !res?.ok
          ? `not saved (${res?.error ?? "offline"})`
          : res.data.pointsEarned
            ? `+${res.data.pointsEarned} points${res.data.chapterBossUnlocked ? " · END BOSS UNLOCKED" : ""}`
            : r.cleared
              ? "practice run (already cleared today)"
              : "not cleared: no points"
      );
    },
    [slug]
  );

  if (screen === "brake") {
    return (
      <main className="fixed inset-0 bg-[#0b0b12]">
        <BrakeGame stationName={station.name} lineColor={line.color} onFinish={onFinish} />
        <button onClick={() => setScreen("pick")} className="absolute right-3 top-24 rounded bg-black/60 px-3 py-1 font-mono text-xs text-white">
          QUIT
        </button>
      </main>
    );
  }

  if (screen === "photo") {
    return (
      <PhotoQuest
        stationName={station.name}
        line={TEAM[lineId]}
        onClose={() => setScreen("pick")}
        onComplete={({ dataUrl }) => {
          if (dataUrl) setPhoto(dataUrl);
          setScreen("pick");
        }}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-5 bg-[#0b0b12] p-4 font-mono text-white">
      <header>
        <p className="text-xs tracking-widest opacity-60">T-MINUS · PLAY TEST</p>
        <h1 className="text-2xl font-black">Stop at the platform</h1>
      </header>

      <div className="flex gap-2">
        {(Object.keys(ROUTES) as LineId[]).map((l) => (
          <button
            key={l}
            onClick={() => {
              setLineId(l);
              setSlug(ROUTES[l][0]);
            }}
            className="flex-1 border-4 px-2 py-2 text-sm font-bold"
            style={{ borderColor: LINES[l].color, background: l === lineId ? LINES[l].color : "transparent" }}
          >
            {LINES[l].name.toUpperCase()}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-xs opacity-80">
        YOU ARE AT
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="border-4 border-white/20 bg-black p-2 text-base text-white">
          {ROUTES[lineId].map((id) => (
            <option key={id} value={id}>
              {STATIONS.find((s) => s.id === id)?.name}
            </option>
          ))}
        </select>
      </label>

      {/* The real wait is the game's clock. */}
      <section className="border-4 p-3" style={{ borderColor: line.color }}>
        <p className="text-xs opacity-60">YOUR NEXT TRAIN · LIVE</p>
        {next && secs !== null ? (
          <>
            <p className="text-4xl font-black tabular-nums">
              {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
            </p>
            <p className="text-sm opacity-80">
              {next.route} → {next.headsign ?? "?"} · time for about {Math.max(1, Math.floor(secs / 40))} runs
            </p>
          </>
        ) : (
          <p className="text-lg">No train predicted right now</p>
        )}
      </section>

      {screen === "results" && result && (
        <section className="flex flex-col gap-2 border-4 border-[#f2c200] p-3">
          <p className="text-xs opacity-60">LAST RUN</p>
          <p className="text-3xl font-black">
            {result.score} <span className="text-base">/ 3000 {result.cleared ? "· CLEARED" : "· TRY AGAIN"}</span>
          </p>
          <ul className="text-sm">
            {result.rounds.map((r, i) => (
              <li key={i}>
                Stop {i + 1}: {r.label} {r.errorM === null ? "" : `(${Math.abs(r.errorM).toFixed(1)} m ${r.errorM >= 0 ? "past" : "short"})`} +{r.score}
              </li>
            ))}
          </ul>
          <p className="text-sm text-[#f2c200]">{saved}</p>
        </section>
      )}

      <button
        onClick={() => setScreen("brake")}
        className="border-4 border-black py-4 text-xl font-black text-black active:translate-y-1"
        style={{ background: "#f2c200", boxShadow: "0 6px 0 #8a6d00" }}
      >
        {screen === "results" ? "PLAY AGAIN" : "PLAY"}
      </button>
      <button
        onClick={() => setScreen("photo")}
        className="border-4 border-white/30 py-3 text-base font-bold active:translate-y-1"
      >
        PHOTO QUEST
      </button>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- camera data: URL
        <img src={photo} alt={`Your photo stamp at ${station.name}`} className="h-40 w-32 self-center border-4 border-white object-cover" />
      )}
      <p className="text-xs opacity-50">Hold anywhere to brake, or press space. Stop the front of the train on the STOP line.</p>
    </main>
  );
}
