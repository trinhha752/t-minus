"use client";
// components/game/ConductorChat.tsx
// Chat with The Conductor, a Mastra agent on Gemini (POST /api/chat), and run the
// plan-ride workflow (POST /api/plan-ride). Under each answer: the tools the agent
// chose, so you can see it checked live trains and Tiger Data instead of guessing.

import { useEffect, useRef, useState } from "react";
import { Route, Send, TrainFront, X } from "lucide-react";
import { stationById } from "@/components/run/stations";
import type { ChatReply, RidePlan } from "@/types";

const PANEL = "border-[3px] border-ink bg-[#FBF3DF] shadow-[4px_4px_0_rgba(27,31,36,0.85)]";

const TOOL_LABEL: Record<string, string> = {
  "get-next-trains": "🚇 live trains",
  "get-line-delays": "📈 Tiger Data delays",
  "get-delay-boss": "👹 Delay Boss",
  "get-rider-progress": "🗺️ your progress",
  "get-station-info": "📜 station lore",
  updateWorkingMemory: "🧠 remembered",
  "plan-ride": "🧭 plan-ride workflow",
};

type Msg = { from: "you" | "conductor"; text: string; tools?: string[]; data?: Record<string, unknown>; error?: boolean };

/* eslint-disable @typescript-eslint/no-explicit-any -- tool results are loose JSON */
/** What a tool returned, in a few plain lines for the chip's panel. */
function describe(tool: string, d: any): string[] {
  if (!d) return ["(no data)"];
  if (d.error) return [String(d.error)];
  switch (tool) {
    case "get-next-trains":
      return d.trains?.length
        ? [`At ${d.station ?? "this station"}:`, ...d.trains.slice(0, 5).map((t: any) => `${t.line} → ${t.toward ?? "?"} · ${t.minutesAway ? `${t.minutesAway} min` : t.status}`)]
        : ["No trains predicted right now"];
    case "get-line-delays":
      return d.lateNowPct == null
        ? [d.note ?? "No delay data"]
        : [
            `${d.line} Line, last ${d.hours ?? 3} h: ${d.lateNowPct}% of trains 5+ min late now`,
            ...(d.averagePct != null ? [`Average ${d.averagePct}% · peak ${d.peakPct}% · ${d.trend}`] : [d.trend ? `Trend: ${d.trend}` : ""]),
            `A Delay Boss spawns at ${d.bossThresholdPct ?? 50}%`,
            ...(d.source ? [d.source] : []),
          ].filter(Boolean);
    case "get-delay-boss":
      return d.active ? [`${d.name} is up on the ${d.line ?? ""} Line`, `HP ${d.hpRemaining}${d.hpTotal ? `/${d.hpTotal}` : " left"}`] : [`No Delay Boss on the ${d.line ?? ""} Line`];
    case "get-rider-progress": {
      const lines = (d.lines ?? []).map((l: any) => `${l.line}: ${l.stamped}/${l.total} stamped${l.endBossDefeated ? " · boss beaten" : l.endBossUnlocked ? " · boss unlocked" : ""}`);
      const stops = (d.next?.stops ?? []).map((n: any) => `Next: ${n.station} (${n.stopsAway} stop${n.stopsAway > 1 ? "s" : ""}, toward ${n.toward})`);
      const sw = d.next?.switchLines ? [`Switch to the ${d.next.switchLines.to} at ${d.next.switchLines.at} (${d.next.switchLines.stationsLeft} left)`] : [];
      return [...lines, ...stops, ...sw].length ? [...lines, ...stops, ...sw] : ["No progress yet"];
    }
    case "get-station-info":
      return [`${d.station} · ${(d.lines ?? []).join(", ")}`, d.story, `Mini-game: ${d.miniGame}`, `Photo quest: ${d.photoQuest}`].filter(Boolean);
    case "updateWorkingMemory":
      return ["Saved what you told me, so I'll remember it next time."];
    case "plan-ride":
      return d.reasons ?? ["(no plan)"];
    default:
      return [typeof d === "string" ? d : JSON.stringify(d).slice(0, 200)];
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function ConductorChat({ stationId, onClose }: { stationId: string; onClose: () => void }) {
  const station = stationById(stationId);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "conductor", text: `All aboard at ${station.name}! Ask me about trains, delays, bosses, or where to ride next.` },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  /** Which chip's data panel is open: "<message index>:<tool>". */
  const [openChip, setOpenChip] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy]);

  // Bring a chip's data panel into view when it opens (it can open below the fold).
  useEffect(() => {
    if (openChip) document.getElementById("conductor-chip-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [openChip]);

  const ask = async (message: string) => {
    if (!message.trim() || busy) return;
    setMsgs((m) => [...m, { from: "you", text: message }]);
    setText("");
    setBusy("Checking the tracks…");
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stationId, message }),
    })
      .then((x) => x.json())
      .catch(() => null);
    setBusy(null);
    if (r?.ok) {
      const reply = r.data as ChatReply;
      setMsgs((m) => [...m, { from: "conductor", text: reply.text, tools: reply.toolsUsed, data: reply.toolData }]);
    } else {
      setMsgs((m) => [...m, { from: "conductor", text: r?.error ?? "The line is down. Try again.", error: true }]);
    }
  };

  const planRide = async () => {
    if (busy) return;
    setMsgs((m) => [...m, { from: "you", text: "Plan my ride." }]);
    setBusy("Planning your ride…");
    const r = await fetch("/api/plan-ride", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stationId }),
    })
      .then((x) => x.json())
      .catch(() => null);
    setBusy(null);
    if (r?.ok) {
      const plan = r.data as RidePlan;
      setMsgs((m) => [
        ...m,
        {
          from: "conductor",
          text: plan.narration,
          tools: ["plan-ride", "get-next-trains", "get-line-delays", "get-delay-boss", "get-rider-progress"],
          // The workflow's gathered facts, shaped like each tool's own result.
          data: {
            "plan-ride": { reasons: plan.reasons },
            "get-next-trains": { station: plan.facts.station, trains: plan.facts.trains },
            "get-line-delays": { line: plan.facts.line, lateNowPct: plan.facts.lateNowPct, trend: plan.facts.trend },
            "get-delay-boss": { line: plan.facts.line, ...(plan.facts.boss as object) },
            "get-rider-progress": {
              lines: [],
              next: { stops: plan.facts.nextStops, switchLines: plan.facts.switchLines },
            },
          },
        },
      ]);
    } else {
      setMsgs((m) => [...m, { from: "conductor", text: r?.error ?? "Couldn't plan that one.", error: true }]);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[rgba(15,19,24,0.55)] px-3 pb-8 pt-14">
      <div className={`flex min-h-0 flex-1 flex-col ${PANEL}`}>
        {/* Header */}
        <div className="flex items-center gap-2 border-b-[3px] border-ink px-3 py-2">
          <span className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-[#1B1F24] text-[#FFD23F]">
            <TrainFront size={20} strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[17px] font-bold leading-tight">The Conductor</p>
            <p className="truncate font-pixel text-[11px] text-muted">AI guide · live trains, delays, your progress</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center border-2 border-ink bg-[#F1E7CF]">
            <X size={18} strokeWidth={2.6} />
          </button>
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {msgs.map((m, i) => (
            <div key={i} className={m.from === "you" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] border-2 border-ink px-2.5 py-1.5 font-pixel text-[14px] leading-snug ${
                  m.from === "you" ? "bg-[#1B1F24] text-white" : m.error ? "bg-[#FDECEA]" : "bg-white"
                }`}
              >
                {m.text}
                {m.tools && m.tools.length > 0 && (
                  <>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.tools.map((t) => {
                        const key = `${i}:${t}`;
                        const open = openChip === key;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setOpenChip(open ? null : key)}
                            aria-expanded={open}
                            className={`border px-1 py-px text-[10px] active:translate-y-px ${
                              open ? "border-ink bg-[#1B1F24] text-[#FFD23F]" : "border-ink/40 bg-[#F1E7CF] text-ink-soft hover:border-ink"
                            }`}
                          >
                            {TOOL_LABEL[t] ?? t} {open ? "▴" : "▾"}
                          </button>
                        );
                      })}
                    </div>
                    {openChip?.startsWith(`${i}:`) && (
                      <div
                        id="conductor-chip-panel"
                        className="mt-1.5 border-l-4 border-[#FFD23F] bg-[#F7F1E3] px-2 py-1 text-[12px] leading-snug text-ink-soft"
                      >
                        {describe(openChip.slice(String(i).length + 1), m.data?.[openChip.slice(String(i).length + 1)]).map((line, k) => (
                          <p key={k}>{line}</p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {busy && <p className="font-pixel text-[13px] italic text-muted">{busy}</p>}
          <div ref={endRef} />
        </div>

        {/* Quick asks */}
        <div className="flex gap-1.5 overflow-x-auto border-t-2 border-ink/20 px-3 py-2">
          <button type="button" onClick={() => void planRide()} disabled={!!busy} className="flex shrink-0 items-center gap-1 border-2 border-ink bg-[#FFE7A3] px-2 py-1 font-pixel text-[12px] font-bold disabled:opacity-50">
            <Route size={13} /> Plan my ride
          </button>
          {["When's my next train?", "Is my line running late?", "Where should I go next?", "Tell me about this station"].map((q) => (
            <button key={q} type="button" onClick={() => void ask(q)} disabled={!!busy} className="shrink-0 border-2 border-ink bg-[#F1E7CF] px-2 py-1 font-pixel text-[12px] disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          className="flex gap-2 border-t-[3px] border-ink p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(text);
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask the Conductor…"
            maxLength={500}
            className="min-w-0 flex-1 border-2 border-ink bg-white px-2 py-2 font-pixel text-[14px] outline-none"
          />
          <button type="submit" disabled={!!busy || !text.trim()} aria-label="Send" className="flex w-11 items-center justify-center border-2 border-ink bg-[#1B1F24] text-white disabled:opacity-40">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
