"use client";
// /play — the station flow, end to end, as it will run inside the game:
//
//   PLAY → brake into the station (1 stop) → photo quest → results
//
// The station is cleared when the photo quest passes; the braking score is a
// bonus. Results post to /api/minigame/result. Your real next trains show at
// the top, one per direction, the way platform signs show them.

import { useCallback, useEffect, useRef, useState } from "react";
import BrakeGame from "@/components/game/BrakeGame";
import PhotoQuest from "@/components/PhotoQuest";
import { ROUTES, STATIONS, LINES, type LineId } from "@/components/run/stations";
import type { BrakeResult } from "@/game/brake";
import type { Arrival, TeamLine } from "@/types";

type Screen = "pick" | "brake" | "photo" | "results";
const TEAM: Record<LineId, TeamLine> = { red: "Red", green: "Green" };

/** How T platform signs show a train: minutes, then Arriving, then Boarding. */
function signText(secs: number): string {
  if (secs <= 0) return "Boarding";
  if (secs <= 60) return "Arriving";
  return `${Math.round(secs / 60)} min`;
}

export default function PlayPage() {
  const [lineId, setLineId] = useState<LineId>("red");
  const [slug, setSlug] = useState("harvard");
  const [screen, setScreen] = useState<Screen>("pick");
  const [brake, setBrake] = useState<BrakeResult | null>(null);
  const [photo, setPhoto] = useState<{ passed: boolean; dataUrl: string | null } | null>(null);
  const [saved, setSaved] = useState("");
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [now, setNow] = useState(0);
  const startedAt = useRef(0);

  const station = STATIONS.find((s) => s.id === slug)!;
  const line = LINES[lineId];

  const loadArrivals = useCallback(async () => {
    const r = await fetch(`/api/predictions?stop=${slug}&limit=8`).then((x) => x.json()).catch(() => null);
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

  // One row per direction: the soonest train that hasn't left yet.
  const elapsed = fetchedAt && now ? (now - fetchedAt) / 1000 : 0;
  const byDirection = [0, 1]
    .map((dir) => arrivals.find((a) => a.directionId === dir && a.secondsAway - elapsed > -90))
    .filter((a): a is Arrival => !!a);

  const start = () => {
    startedAt.current = Date.now();
    setBrake(null);
    setPhoto(null);
    setSaved("");
    setScreen("brake");
  };

  const save = useCallback(
    async (b: BrakeResult, p: { passed: boolean; dataUrl: string | null }) => {
      setScreen("results");
      setSaved("saving…");
      const res = await fetch("/api/minigame/result", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stationId: slug,
          score: b.score,
          cleared: p.passed,
          durationMs: Math.max(3000, Date.now() - startedAt.current),
        }),
      })
        .then((x) => x.json())
        .catch(() => null);
      setSaved(
        !res?.ok
          ? `not saved (${res?.error ?? "offline"})`
          : res.data.pointsEarned
            ? `${station.name} stamped! +${res.data.pointsEarned} points${res.data.chapterBossUnlocked ? " · END BOSS UNLOCKED" : ""}`
            : p.passed
              ? "Already stamped today: practice run"
              : "Not stamped: finish the photo quest"
      );
    },
    [slug, station.name]
  );

  if (screen === "brake") {
    return (
      <main className="fixed inset-0 bg-[#0b0b12]">
        <BrakeGame
          stationName={station.name}
          lineColor={line.color}
          stops={1}
          onFinish={(r) => {
            setBrake(r);
            setScreen("photo");
          }}
        />
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
        onComplete={(p) => {
          setPhoto(p);
          if (brake) void save(brake, p);
        }}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-5 bg-[#0b0b12] p-4 font-mono text-white">
      <header>
        <p className="text-xs tracking-widest opacity-60">T-MINUS · STATION TEST</p>
        <h1 className="text-2xl font-black">Arrive and explore</h1>
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

      {/* Like the platform sign: one row per direction. */}
      <section className="border-4 p-3" style={{ borderColor: line.color }}>
        <p className="mb-2 text-xs opacity-60">NEXT TRAINS · LIVE FROM THE MBTA</p>
        {byDirection.length ? (
          byDirection.map((a) => {
            const secs = Math.round(a.secondsAway - elapsed);
            return (
              <div key={a.id} className="flex items-baseline justify-between py-1">
                <span className="text-base">{a.headsign ?? a.route}</span>
                <span className="text-2xl font-black tabular-nums">{signText(secs)}</span>
              </div>
            );
          })
        ) : (
          <p className="text-lg">No trains predicted right now</p>
        )}
      </section>

      {screen === "results" && brake && photo && (
        <section className="flex flex-col gap-2 border-4 border-[#f2c200] p-3">
          <p className="text-xs opacity-60">{station.name.toUpperCase()}</p>
          <p className="text-sm">
            🚇 Arrival: <b>{brake.rounds[0]?.label}</b>{" "}
            {brake.rounds[0]?.errorM == null ? "" : `(${Math.abs(brake.rounds[0].errorM).toFixed(1)} m ${brake.rounds[0].errorM >= 0 ? "past" : "short"})`} +{brake.score}
          </p>
          <p className="text-sm">📸 Photo quest: <b>{photo.passed ? "CLEARED" : "not done"}</b></p>
          <p className="text-sm text-[#f2c200]">{saved}</p>
          {photo.dataUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- camera data: URL
            <img src={photo.dataUrl} alt={`Your ${station.name} card`} className="mt-1 h-40 w-32 self-center border-4 border-white object-cover" />
          )}
        </section>
      )}

      <button
        onClick={start}
        className="border-4 border-black py-4 text-xl font-black text-black active:translate-y-1"
        style={{ background: "#f2c200", boxShadow: "0 6px 0 #8a6d00" }}
      >
        {screen === "results" ? "PLAY AGAIN" : `ARRIVE AT ${station.name.toUpperCase()}`}
      </button>
      <ol className="list-decimal pl-5 text-xs opacity-60">
        <li>Bring your train in: hold anywhere to brake, stop on the STOP line.</li>
        <li>Photo quest: find what it asks for on the platform and snap it.</li>
        <li>Your photo becomes this station&apos;s card, and the station gets stamped.</li>
      </ol>
    </main>
  );
}
