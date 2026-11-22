"use client";
// components/PhotoQuest.tsx
// Photo quest level: "find something orange and photograph it". A full-screen
// overlay (React, not Phaser: Phaser is bad at camera input). Mount it over
// the game canvas and unmount it from onComplete.
//
//   <PhotoQuest stationName="Harvard" line="Red"
//     onComplete={({ passed, dataUrl }) => { ...dataUrl becomes the card art... }} />
//
// Camera needs HTTPS (localhost is fine; a phone hitting your laptop's IP is not).
// The shutter must be a direct tap: iOS blocks capture started from a timer or promise.

import { useEffect, useRef, useState } from "react";
import { questFor, randomQuest, type PhotoQuest as Quest } from "@/lib/photo-quests";
import type { TeamLine } from "@/types";

type Phase = "starting" | "live" | "checking" | "passed" | "failed" | "nocamera";

export interface PhotoQuestResult {
  passed: boolean;
  /** The captured photo (JPEG data URL), or null when skipped or bypassed. */
  dataUrl: string | null;
}

const LONGEST_SIDE = 768;
const JPEG_QUALITY = 0.7;
const LINE_HEX: Record<TeamLine, string> = { Red: "#DA291C", Orange: "#ED8B00", Blue: "#2B6CE8", Green: "#00B04F" };
const SHOW_DEMO_BYPASS =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_MODE === "1";

/** A short rising chime. The AudioContext is created on the shutter tap so iOS allows it. */
function chime(ctx: AudioContext | null) {
  if (!ctx) return;
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + i * 0.09);
    g.gain.exponentialRampToValueAtTime(0.15, now + i * 0.09 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start(now + i * 0.09);
    o.stop(now + i * 0.09 + 0.2);
  });
}

export default function PhotoQuest({
  stationName,
  line = "Red",
  questId,
  quest: givenQuest,
  contained = false,
  onComplete,
  onClose,
}: {
  stationName: string;
  line?: TeamLine;
  /** A specific quest from data/photo-quests.json; random if omitted. */
  questId?: string;
  /** A ready-made quest, e.g. stationQuest("harvard") with the station's themed text. Wins over questId. */
  quest?: Quest;
  onComplete: (result: PhotoQuestResult) => void;
  /** Optional close button. */
  onClose?: () => void;
  /** Fill the nearest positioned parent (e.g. the game's phone frame) instead of the whole window. */
  contained?: boolean;
}) {
  const [quest] = useState<Quest>(() => givenQuest ?? ((questId && questFor(questId, line)) || randomQuest(line)));
  const [phase, setPhase] = useState<Phase>("starting");
  const [photo, setPhoto] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [flipped, setFlipped] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const color = LINE_HEX[line];

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCamera = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("nocamera");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => {});
        }
        setPhase("live");
      })
      .catch(() => setPhase("nocamera"));
  };

  useEffect(() => {
    const t = setTimeout(startCamera, 0);
    return () => {
      clearTimeout(t);
      stopCamera();
    };
  }, []);

  /** Runs synchronously inside the tap, which is what iOS Safari requires. */
  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    try {
      audioRef.current ??= new AudioContext();
    } catch {
      /* no audio, no problem */
    }

    const scale = Math.min(1, LONGEST_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    setPhoto(dataUrl);
    setPhase("checking");
    stopCamera();
    void verify(dataUrl);
  };

  const verify = async (dataUrl: string) => {
    let passed = true;
    let why = "verified";
    try {
      const res = await fetch("/api/photo-quest/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questId: quest.id, imageBase64: dataUrl, line }),
      });
      const body = await res.json();
      if (body.ok) {
        passed = body.data.passed;
        why = body.data.reason;
      }
      // Any non-ok response fails open, same as the server.
    } catch {
      /* offline: fail open */
    }
    setReason(why);
    if (passed) {
      setPhase("passed");
      chime(audioRef.current);
      setTimeout(() => setFlipped(true), 350);
    } else {
      setPhase("failed");
    }
  };

  const reshoot = () => {
    setPhoto(null);
    setReason("");
    setPhase("starting");
    startCamera();
  };

  const finish = (result: PhotoQuestResult) => {
    stopCamera();
    onComplete(result);
  };

  return (
    <div
      className={`${contained ? "absolute font-pixel" : "fixed"} inset-0 z-50 flex flex-col bg-black text-white`}
      role="dialog"
      aria-label="Photo quest"
    >
      <style>{`
        @keyframes pq-scan { 0% { top: 0% } 50% { top: 100% } 100% { top: 0% } }
        @keyframes pq-fly { 0% { opacity: 0; transform: translateY(20px) scale(.8) } 20% { opacity: 1; transform: translateY(0) scale(1.1) } 100% { opacity: 0; transform: translateY(-80px) scale(1) } }
        @keyframes pq-shake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-8px) } 75% { transform: translateX(8px) } }
      `}</style>

      {/* Quest prompt */}
      <header className="flex items-start gap-3 p-4" style={{ borderBottom: `4px solid ${color}` }}>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest opacity-70">Photo quest · {stationName}</p>
          <p className="mt-1 text-xl font-bold leading-tight">{quest.prompt}</p>
          <p className="mt-0.5 text-xs opacity-70">Anywhere in this station counts.</p>
        </div>
        {onClose && (
          <button onClick={() => finish({ passed: false, dataUrl: null })} className="px-2 text-2xl leading-none" aria-label="Close">
            ×
          </button>
        )}
      </header>

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 h-full w-full object-cover ${phase === "live" || phase === "starting" ? "" : "hidden"}`}
        />

        {photo && phase !== "passed" && (
          // eslint-disable-next-line @next/next/no-img-element -- a data: URL from the camera
          <img
            src={photo}
            alt="Your photo"
            className="absolute inset-0 h-full w-full object-cover"
            style={phase === "failed" ? { animation: "pq-shake .3s" } : undefined}
          />
        )}

        {phase === "checking" && (
          <>
            <div className="absolute inset-x-0 h-1" style={{ background: color, boxShadow: `0 0 24px 6px ${color}`, animation: "pq-scan 1.6s ease-in-out infinite" }} />
            <p className="absolute inset-x-0 bottom-6 text-center text-lg font-semibold drop-shadow">Let me look…</p>
          </>
        )}

        {phase === "starting" && <p className="absolute inset-0 grid place-items-center opacity-70">Opening camera…</p>}

        {phase === "failed" && (
          <p className="absolute inset-x-0 bottom-6 text-center text-lg font-semibold drop-shadow">
            {reason ? `${reason}. ` : ""}Try another angle!
          </p>
        )}

        {phase === "nocamera" && (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            <div>
              <p className="text-lg font-semibold">No camera available</p>
              <p className="mt-2 text-sm opacity-70">Camera access was blocked, or this page isn&apos;t on HTTPS.</p>
            </div>
          </div>
        )}

        {/* Success: the photo flips into the station card */}
        {phase === "passed" && photo && (
          <div className="absolute inset-0 grid place-items-center" style={{ perspective: 1000 }}>
            <p className="pointer-events-none absolute top-[18%] text-3xl font-black" style={{ color, animation: "pq-fly 1.4s ease-out forwards", textShadow: "0 2px 0 #000" }}>
              Quest cleared!
            </p>
            <div
              className="relative h-[60%] w-[70%] max-w-xs transition-transform duration-700"
              style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL from the camera */}
              <img src={photo} alt="" className="absolute inset-0 h-full w-full rounded-lg object-cover" style={{ backfaceVisibility: "hidden" }} />
              <div
                className="absolute inset-0 flex flex-col overflow-hidden rounded-lg bg-white text-black"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", border: `6px solid ${color}` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL from the camera */}
                <img src={photo} alt={`Your photo at ${stationName}`} className="h-3/4 w-full object-cover" />
                <div className="flex flex-1 flex-col justify-center px-3">
                  <p className="text-lg font-bold">{stationName}</p>
                  <p className="text-xs opacity-60">Photo stamp · {reason}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <footer className="flex flex-col items-center gap-3 p-6">
        {phase === "live" && (
          <button
            onClick={shoot}
            aria-label="Take photo"
            className="h-20 w-20 rounded-full border-[6px] bg-white active:scale-90"
            style={{ borderColor: color }}
          />
        )}
        {phase === "failed" && (
          <button onClick={reshoot} className="rounded-lg px-6 py-3 text-lg font-bold" style={{ background: color }}>
            Reshoot
          </button>
        )}
        {phase === "passed" && (
          <button onClick={() => finish({ passed: true, dataUrl: photo })} className="rounded-lg px-6 py-3 text-lg font-bold" style={{ background: color }}>
            Continue
          </button>
        )}
        {phase === "nocamera" && (
          <button onClick={() => finish({ passed: true, dataUrl: null })} className="rounded-lg px-6 py-3 text-lg font-bold" style={{ background: color }}>
            Skip
          </button>
        )}
        {SHOW_DEMO_BYPASS && phase !== "passed" && (
          <button onClick={() => finish({ passed: true, dataUrl: null })} className="text-xs underline opacity-50">
            Demo: pass without camera
          </button>
        )}
      </footer>
    </div>
  );
}
