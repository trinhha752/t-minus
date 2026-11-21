"use client";
// /play — one station, the way it runs in real life:
//
//   your phone's location picks the station  →  ARRIVE (check in)
//   →  brake your train into the station  →  the station greets you
//   →  its photo quest  →  reward: the station's fact on a card with your photo,
//      and your collection count toward the line's End Boss
//
// You can only play the station you're standing at. In dev, or with
// NEXT_PUBLIC_DEMO_MODE=1, a "teleport" picker lets you play any station.

import { useCallback, useEffect, useRef, useState } from "react";
import BrakeGame from "@/components/game/BrakeGame";
import PhotoQuest from "@/components/PhotoQuest";
import { ROUTES, STATIONS, LINES, primaryLine, type LineId } from "@/components/run/stations";
import { stationQuest } from "@/lib/photo-quests";
import type { BrakeResult } from "@/game/brake";
import type { Arrival, Chapter, TeamLine } from "@/types";

type Screen = "home" | "brake" | "welcome" | "photo" | "reward";
type Where =
  | { kind: "locating" }
  | { kind: "here"; slug: string; metres: number }
  | { kind: "far"; slug: string; metres: number }
  | { kind: "nolocation" };

const TEAM: Record<LineId, TeamLine> = { red: "Red", green: "Green" };
const DEMO = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_MODE === "1";

/** How T platform signs show a train: minutes, then Arriving, then Boarding. */
function signText(secs: number): string {
  if (secs <= 0) return "Boarding";
  if (secs <= 60) return "Arriving";
  return `${Math.round(secs / 60)} min`;
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json())
    .catch(() => null);

export default function PlayPage() {
  const [where, setWhere] = useState<Where>({ kind: "locating" });
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [teleport, setTeleport] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [error, setError] = useState("");
  const [brake, setBrake] = useState<BrakeResult | null>(null);
  const [photo, setPhoto] = useState<{ passed: boolean; dataUrl: string | null } | null>(null);
  const [saved, setSaved] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [fetchedAt, setFetchedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const startedAt = useRef(0);

  // The station you're playing: where you are, or the demo teleport.
  const slug = teleport ?? (where.kind === "here" ? where.slug : null);
  const station = slug ? STATIONS.find((s) => s.id === slug) ?? null : null;
  const lineId: LineId = station ? primaryLine(station) : "red";
  const line = LINES[lineId];

  /* ---------- where am I? ---------- */
  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setWhere({ kind: "nolocation" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setCoords({ lat, lon });
        const r = await fetch(`/api/stations/nearest?lat=${lat}&lon=${lon}`).then((x) => x.json()).catch(() => null);
        if (!r?.ok) return setWhere({ kind: "nolocation" });
        setWhere({ kind: r.data.inRange ? "here" : "far", slug: r.data.slug, metres: r.data.metres });
      },
      () => setWhere({ kind: "nolocation" }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  }, []);
  useEffect(() => {
    const t = setTimeout(locate, 0);
    return () => clearTimeout(t);
  }, [locate]);

  /* ---------- live trains at this station ---------- */
  const loadArrivals = useCallback(async () => {
    if (!slug) return;
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
  const elapsed = fetchedAt && now ? (now - fetchedAt) / 1000 : 0;
  const byDirection = [0, 1]
    .map((dir) => arrivals.find((a) => a.directionId === dir && a.secondsAway - elapsed > -90))
    .filter((a): a is Arrival => !!a);

  /* ---------- collection progress for this line ---------- */
  const loadChapter = useCallback(async () => {
    const r = await fetch("/api/progress").then((x) => x.json()).catch(() => null);
    if (r?.ok) setChapters(r.data.chapters as Chapter[]);
  }, []);
  useEffect(() => {
    const t = setTimeout(loadChapter, 0);
    return () => clearTimeout(t);
  }, [loadChapter]);

  /* ---------- the run ---------- */
  const arrive = async () => {
    if (!slug) return;
    setError("");
    const r = await post("/api/checkin", {
      stationId: slug,
      lat: coords?.lat ?? 0,
      lon: coords?.lon ?? 0,
      teleport: !!teleport,
    });
    if (!r?.ok) return setError(r?.error ?? "offline");
    if (!r.data.accepted && r.data.reason !== "already_today") {
      return setError(r.data.reason === "too_far" ? `You're ${r.data.metresAway} m from the station` : r.data.reason);
    }
    startedAt.current = Date.now();
    setBrake(null);
    setPhoto(null);
    setSaved("");
    setFlipped(false);
    setScreen("brake");
  };

  const finish = async (b: BrakeResult, p: { passed: boolean; dataUrl: string | null }) => {
    setScreen("reward");
    setSaved("saving…");
    const r = await post("/api/minigame/result", {
      stationId: slug,
      score: b.score,
      cleared: p.passed,
      durationMs: Math.max(3000, Date.now() - startedAt.current),
    });
    setSaved(
      !r?.ok
        ? `Not saved: ${r?.error ?? "offline"}`
        : r.data.pointsEarned
          ? `+${r.data.pointsEarned} points${r.data.chapterBossUnlocked ? " · END BOSS UNLOCKED!" : ""}`
          : p.passed
            ? "Already stamped today"
            : "Not stamped: finish the photo quest"
    );
    await loadChapter();
    setTimeout(() => setFlipped(true), 400);
  };

  /* ---------- screens ---------- */

  if (screen === "brake" && station) {
    return (
      <main className="fixed inset-0 bg-[#0b0b12]">
        <BrakeGame
          stationName={station.name}
          lineColor={line.color}
          stops={1}
          onFinish={(r) => {
            setBrake(r);
            setScreen("welcome");
          }}
        />
        <button onClick={() => setScreen("home")} className="absolute right-3 top-24 rounded bg-black/60 px-3 py-1 font-mono text-xs text-white">
          QUIT
        </button>
      </main>
    );
  }

  if (screen === "photo" && station) {
    return (
      <PhotoQuest
        stationName={station.name}
        line={TEAM[lineId]}
        quest={stationQuest(station.id, TEAM[lineId])}
        onClose={() => setScreen("home")}
        onComplete={(p) => {
          setPhoto(p);
          if (brake) void finish(brake, p);
        }}
      />
    );
  }

  const chapter = chapters.find((c) => c.id === lineId) ?? null;
  const cleared = chapter?.stations.filter((s) => s.cleared).length ?? 0;
  const total = chapter?.stations.length ?? 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-5 bg-[#0b0b12] p-4 font-mono text-white">
      <header>
        <p className="text-xs tracking-widest opacity-60">T-MINUS · {line.realm.toUpperCase()}</p>
        <h1 className="text-2xl font-black">{station ? station.name : "Where are you?"}</h1>
      </header>

      {/* Welcome: the station greets you after you pull in. */}
      {screen === "welcome" && station && brake && (
        <section className="flex flex-col gap-3 border-4 p-4" style={{ borderColor: line.color }}>
          <p className="text-sm">
            🚇 {brake.rounds[0]?.label}{" "}
            {brake.rounds[0]?.errorM == null ? "" : `(${Math.abs(brake.rounds[0].errorM).toFixed(1)} m ${brake.rounds[0].errorM >= 0 ? "past" : "short"})`} · +{brake.score}
          </p>
          <p className="text-xl font-black">Welcome to {station.name}</p>
          <p className="text-sm opacity-80">
            {line.realm} · station {ROUTES[lineId].indexOf(station.id) + 1} of {ROUTES[lineId].length}
          </p>
          <p className="border-l-4 pl-3 text-base" style={{ borderColor: line.color }}>
            {stationQuest(station.id, TEAM[lineId]).prompt}
          </p>
          <button onClick={() => setScreen("photo")} className="border-4 border-black py-3 text-lg font-black text-black" style={{ background: "#f2c200", boxShadow: "0 6px 0 #8a6d00" }}>
            📸 START QUEST
          </button>
        </section>
      )}

      {/* Reward: the station's fact, on a card with your photo. */}
      {screen === "reward" && station && (
        <section className="flex flex-col items-center gap-3">
          <div className="relative h-80 w-56 transition-transform duration-700" style={{ perspective: 1000, transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}>
            <div className="absolute inset-0 grid place-items-center border-4 bg-black text-4xl" style={{ borderColor: line.color, backfaceVisibility: "hidden" }}>
              ?
            </div>
            <div className="absolute inset-0 flex flex-col border-4 bg-[#f4efe3] text-black" style={{ borderColor: line.color, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              {photo?.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- camera data: URL
                <img src={photo.dataUrl} alt={`Your photo at ${station.name}`} className="h-36 w-full object-cover" />
              ) : (
                <div className="grid h-36 place-items-center text-white" style={{ background: line.color }}>
                  {station.name}
                </div>
              )}
              <div className="flex flex-1 flex-col gap-1 p-2">
                <p className="text-[10px] opacity-60">
                  FACT {station.fact.no} · {line.realm.toUpperCase()}
                </p>
                <p className="text-sm font-black leading-tight">{station.fact.title}</p>
                <p className="text-xs leading-snug">{station.story}</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-[#f2c200]">{photo?.passed ? `${station.name} stamped! ` : ""}{saved}</p>
        </section>
      )}

      {/* Collection: the reason to ride somewhere new. */}
      {chapter && (
        <section className="border-4 border-white/20 p-3">
          <div className="flex justify-between text-xs">
            <span>{line.name.toUpperCase()} COLLECTION</span>
            <span>
              {cleared}/{total}
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {chapter.stations.map((s) => (
              <div key={s.slug} title={s.name} className="h-3 flex-1" style={{ background: s.cleared ? line.color : "#333", outline: s.slug === slug ? "2px solid #fff" : "none" }} />
            ))}
          </div>
          <p className="mt-2 text-xs opacity-70">
            {chapter.bossDefeated
              ? `${chapter.bossName} defeated!`
              : chapter.bossUnlocked
                ? `${chapter.bossName} awaits at the end of the line!`
                : `${total - cleared} more to unlock ${chapter.bossName}. Ride somewhere new!`}
          </p>
        </section>
      )}

      {/* Where you are */}
      {screen === "home" && (
        <section className="border-4 p-3" style={{ borderColor: station ? line.color : "#555" }}>
          {where.kind === "locating" && <p>📍 Finding your station…</p>}
          {where.kind === "here" && !teleport && <p>📍 You&apos;re at {station?.name} ({where.metres} m)</p>}
          {where.kind === "far" && !teleport && (
            <p>
              📍 Not at a T-Minus station. Nearest is <b>{STATIONS.find((s) => s.id === where.slug)?.name}</b>, {(where.metres / 1000).toFixed(1)} km away. Go there to play!
            </p>
          )}
          {where.kind === "nolocation" && !teleport && <p>📍 Location is off. Allow location to find your station.</p>}
          {teleport && <p>🛸 Demo teleport: {station?.name}</p>}
          {DEMO && (
            <label className="mt-2 flex flex-col gap-1 text-xs opacity-70">
              DEMO TELEPORT
              <select
                value={teleport ?? ""}
                onChange={(e) => setTeleport(e.target.value || null)}
                className="border-2 border-white/20 bg-black p-1 text-sm text-white"
              >
                <option value="">(use my real location)</option>
                {(Object.keys(ROUTES) as LineId[]).map((l) => (
                  <optgroup key={l} label={LINES[l].name}>
                    {ROUTES[l].map((id) => (
                      <option key={`${l}-${id}`} value={id}>
                        {STATIONS.find((s) => s.id === id)?.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}
        </section>
      )}

      {/* Your real wait */}
      {station && screen !== "welcome" && (
        <section className="border-4 border-white/20 p-3">
          <p className="mb-1 text-xs opacity-60">NEXT TRAINS · LIVE</p>
          {byDirection.length ? (
            byDirection.map((a) => (
              <div key={a.id} className="flex items-baseline justify-between">
                <span>{a.headsign ?? a.route}</span>
                <span className="text-xl font-black tabular-nums">{signText(Math.round(a.secondsAway - elapsed))}</span>
              </div>
            ))
          ) : (
            <p>No trains predicted right now</p>
          )}
        </section>
      )}

      {error && <p className="text-sm text-[#ff6b5e]">{error}</p>}

      {(screen === "home" || screen === "reward") && (
        <button
          onClick={arrive}
          disabled={!station}
          className="border-4 border-black py-4 text-xl font-black text-black active:translate-y-1 disabled:opacity-30"
          style={{ background: "#f2c200", boxShadow: "0 6px 0 #8a6d00" }}
        >
          {screen === "reward" ? "PLAY AGAIN" : station ? `ARRIVE AT ${station.name.toUpperCase()}` : "GO TO A STATION"}
        </button>
      )}
      {screen === "reward" && (
        <button onClick={() => setScreen("home")} className="border-4 border-white/30 py-2 text-sm font-bold">
          DONE
        </button>
      )}
    </main>
  );
}
