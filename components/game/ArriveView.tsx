"use client";
// components/game/ArriveView.tsx
// /station/[id]/arrive: the real-life part of a station visit, in the game's
// pixel style, over the city map:
//
//   check in (you have to be there; demo mode can teleport)
//   → brake your train into the station
//   → the station's photo quest
//   → stamped (saved to the server) → on to the station's game
//
// Hands off to /station/[id]/play (the team's game) at the end.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Camera, MapPin, TrainFront } from "lucide-react";
import BrakeGame from "@/components/game/BrakeGame";
import PhotoQuest, { type PhotoQuestResult } from "@/components/PhotoQuest";
import { MapScreen } from "@/components/run/MapScreen";
import { useRun } from "@/components/run/RunProvider";
import { LINES, stationById } from "@/components/run/stations";
import { stationQuest } from "@/lib/photo-quests";
import { DEMO_MODE, useMyStation } from "@/components/game/useMyStation";
import type { BrakeResult } from "@/game/brake";
import type { Arrival, TeamLine } from "@/types";

type Step = "arrive" | "brake" | "welcome" | "quest" | "stamped";

const PANEL = "border-[3px] border-ink bg-[#FBF3DF] shadow-[4px_4px_0_rgba(27,31,36,0.85)]";
const BTN =
  "flex h-12 items-center justify-center gap-1.5 border-[3px] border-ink px-4 font-pixel text-[17px] font-bold shadow-[3px_3px_0_#1B1F24] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-40";
const TEAM: Record<string, TeamLine> = { red: "Red", green: "Green", orange: "Orange" };

/** How T platform signs show a train: minutes, then Arriving, then Boarding. */
const signText = (secs: number) => (secs <= 0 ? "Boarding" : secs <= 60 ? "Arriving" : `${Math.round(secs / 60)} min`);

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json())
    .catch(() => null);

export function ArriveView({ id }: { id: string }) {
  const router = useRouter();
  const { played, streak, gold, startGame } = useRun();
  const here = useMyStation();
  const station = stationById(id);
  const lineId = station.lines[0];
  const line = LINES[lineId];
  const quest = stationQuest(id, TEAM[lineId]);

  const [step, setStep] = useState<Step>("arrive");
  const [error, setError] = useState("");
  const [brake, setBrake] = useState<BrakeResult | null>(null);
  const [photo, setPhoto] = useState<PhotoQuestResult | null>(null);
  const [saved, setSaved] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);

  const atThisStation = here.slug === id && here.inRange;
  const teleport = !atThisStation && DEMO_MODE;
  const canArrive = atThisStation || teleport;

  // Your real next trains here, one per direction.
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch(`/api/predictions?stop=${id}&limit=8`)
        .then((x) => x.json())
        .then((r) => live && r?.ok && setArrivals(r.data))
        .catch(() => {});
    const first = setTimeout(load, 0);
    const t = setInterval(load, 15_000);
    return () => {
      live = false;
      clearTimeout(first);
      clearInterval(t);
    };
  }, [id]);
  const byDirection = [0, 1]
    .map((d) => arrivals.find((a) => a.directionId === d && a.secondsAway > -90))
    .filter((a): a is Arrival => !!a);

  const arrive = async () => {
    setError("");
    const r = await post("/api/checkin", {
      stationId: id,
      lat: here.coords?.lat ?? 0,
      lon: here.coords?.lon ?? 0,
      teleport,
    });
    if (!r?.ok) return setError(r?.error ?? "Couldn't reach the server");
    if (!r.data.accepted && r.data.reason !== "already_today") {
      return setError(r.data.reason === "too_far" ? `You're ${r.data.metresAway} m away. Get closer to check in.` : r.data.reason);
    }
    setStartedAt(Date.now());
    setStep("brake");
  };

  const finishQuest = async (p: PhotoQuestResult) => {
    setPhoto(p);
    setStep("stamped");
    setSaved("Saving…");
    const r = await post("/api/minigame/result", {
      stationId: id,
      score: brake?.score ?? 0,
      cleared: p.passed,
      durationMs: Math.max(3000, Date.now() - startedAt),
    });
    setSaved(
      !r?.ok
        ? `Not saved: ${r?.error ?? "offline"}`
        : r.data.pointsEarned
          ? `+${r.data.pointsEarned} points${r.data.chapterBossUnlocked ? " · End Boss unlocked!" : ""}`
          : p.passed
            ? "Already stamped today"
            : "Not stamped"
    );
  };

  const playGame = () => {
    startGame();
    router.push(`/station/${id}/play`);
  };

  if (step === "brake") {
    return (
      <div className="absolute inset-0 bg-[#0b0b12]">
        <BrakeGame
          stationName={station.name}
          lineColor={line.color}
          stops={1}
          onFinish={(r) => {
            setBrake(r);
            setStep("welcome");
          }}
        />
      </div>
    );
  }

  if (step === "quest") {
    return (
      <PhotoQuest contained stationName={station.name} line={TEAM[lineId]} quest={quest} onClose={() => setStep("welcome")} onComplete={finishQuest} />
    );
  }

  const round = brake?.rounds[0];

  return (
    <>
      {/* The city map stays behind every step. */}
      <MapScreen played={played} streak={streak} gold={gold} onSelect={() => {}} chrome={false} currentId={id} />
      <div className="absolute inset-0 bg-[rgba(27,31,36,0.35)]" />

      <div className="absolute inset-x-4 bottom-10 top-[64px] z-20 flex flex-col justify-end gap-3">
        {/* Station header */}
        <div className={`p-3 ${PANEL}`}>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 border-2 border-ink" style={{ backgroundColor: line.color }} />
            <p className="font-pixel text-[13px] text-muted">
              {line.name} · {line.realm}
            </p>
          </div>
          <p className="mt-1 font-pixel text-[28px] font-bold leading-none">{station.name}</p>

          {step === "arrive" && (
            <>
              <div className="mt-3 border-2 border-ink bg-[#1B1F24] px-3 py-2 font-pixel text-[#FFD23F]">
                {byDirection.length ? (
                  byDirection.map((a) => (
                    <div key={a.id} className="flex justify-between text-[17px] leading-7">
                      <span className="truncate">{a.headsign ?? a.route}</span>
                      <span className="tabular-nums">{signText(a.secondsAway)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[15px]">No trains predicted</p>
                )}
              </div>
              <p className="mt-3 flex items-start gap-1.5 font-pixel text-[15px]">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                {here.status === "locating"
                  ? "Finding you…"
                  : atThisStation
                    ? `You're here (${here.metres} m). Check in!`
                    : teleport
                      ? `Demo teleport${here.nearestAny ? ` (you're near ${here.nearestAny.name})` : ""}`
                      : `Go to ${station.name} to play${here.metres != null && here.slug === id ? ` (${(here.metres / 1000).toFixed(1)} km away)` : ""}.`}
              </p>
            </>
          )}

          {step === "welcome" && round && (
            <>
              <p className="mt-3 font-pixel text-[15px]">
                🚇 {round.label}
                {round.errorM == null ? "" : ` · ${Math.abs(round.errorM).toFixed(1)} m ${round.errorM >= 0 ? "past" : "short"}`} · +{round.score}
              </p>
              <p className="mt-2 border-l-4 pl-3 font-pixel text-[17px] leading-snug" style={{ borderColor: line.color }}>
                {quest.prompt}
              </p>
            </>
          )}

          {step === "stamped" && (
            <div className="mt-3 flex gap-3">
              <div className="h-28 w-20 shrink-0 overflow-hidden border-[3px] border-ink" style={{ backgroundColor: line.color }}>
                {photo?.dataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- camera data: URL
                  <img src={photo.dataUrl} alt={`Your photo at ${station.name}`} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-pixel text-[13px] text-muted">Fact {station.fact.no} · {station.fact.title}</p>
                <p className="font-pixel text-[15px] leading-snug">{station.story}</p>
                <p className="mt-1 font-pixel text-[15px] font-bold" style={{ color: line.dark }}>
                  {photo?.passed ? `${station.name} stamped! ` : ""}
                  {saved}
                </p>
              </div>
            </div>
          )}
        </div>

        {error && <p className={`p-2 font-pixel text-[15px] text-line-red-dark ${PANEL}`}>{error}</p>}

        {/* Actions */}
        {step === "arrive" && (
          <div className="flex gap-2">
            <button className={`${BTN} bg-[#F1E7CF] text-ink`} onClick={() => router.push(`/station/${id}`)}>
              Back
            </button>
            <button className={`${BTN} flex-1 text-white`} style={{ backgroundColor: line.color }} disabled={!canArrive} onClick={arrive}>
              <TrainFront size={18} strokeWidth={2.6} />
              {teleport ? "Arrive (demo)" : "Arrive"}
            </button>
          </div>
        )}
        {step === "welcome" && (
          <div className="flex gap-2">
            <button className={`${BTN} bg-[#F1E7CF] text-ink`} onClick={playGame}>
              Skip
            </button>
            <button className={`${BTN} flex-1 text-white`} style={{ backgroundColor: line.color }} onClick={() => setStep("quest")}>
              <Camera size={18} strokeWidth={2.6} />
              Photo quest
            </button>
          </div>
        )}
        {step === "stamped" && (
          <div className="flex gap-2">
            <button className={`${BTN} bg-[#F1E7CF] text-ink`} onClick={() => router.push("/")}>
              Map
            </button>
            <button className={`${BTN} flex-1 text-white`} style={{ backgroundColor: line.color }} onClick={playGame}>
              Play the station
              <ChevronRight size={18} strokeWidth={2.6} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
