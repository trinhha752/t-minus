// lib/gemini.ts
// Photo check for photo quests, via the Gemini REST API (no SDK needed).
//
// If Gemini can't answer (no key, rate limit, timeout), the photo does NOT count:
// the player sees "checker busy" and can check again or reshoot. (It used to pass
// automatically, which let wrong photos through whenever Gemini was busy.)
// PHOTO_FAIL_OPEN=1 brings back the old auto-pass for a stage emergency.
// The image is never written to disk or logged.

/**
 * Models to try, in order. If one is overloaded (503), gone (404) or slow, the next
 * gets the remaining time. Tested 21 Nov 2026: gemini-3.8/3.7-flash timed out under
 * load, 3.6-flash answered in ~2.7s, 3.1-flash-lite in ~0.8s (and got 10/10 on real
 * photos with the strict prompt), so lite goes first; each model has its own rate limit.
 * Override with GEMINI_MODEL=model-a,model-b in .env.local.
 */
const MODELS = (process.env.GEMINI_MODEL || "gemini-3.1-flash-lite,gemini-3.6-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
/** Whole check, all models together. */
const TIMEOUT_MS = 8_000;
/** Most one model may take before we move on (the last model gets whatever is left). */
const PER_MODEL_MS = 4_500;
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export interface PhotoVerdict {
  passed: boolean;
  reason: string;
  /** false when Gemini couldn't be asked or didn't answer. */
  checked: boolean;
  /** Gemini was busy/unreachable: show "check again", not "wrong photo". */
  busy?: boolean;
}

const FAIL_OPEN = process.env.PHOTO_FAIL_OPEN === "1";

const UNCHECKED = (why: string): PhotoVerdict => {
  if (FAIL_OPEN) {
    console.warn(`[photo-quest] couldn't check, counting it (PHOTO_FAIL_OPEN): ${why}`);
    return { passed: true, reason: "couldn't check (checker busy)", checked: false };
  }
  console.warn(`[photo-quest] couldn't check: ${why}`);
  return { passed: false, reason: "the photo checker is busy", checked: false, busy: true };
};

/** Does this JPEG plausibly show `target`? */
export async function verifyPhoto(target: string, jpegBase64: string): Promise<PhotoVerdict> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return UNCHECKED("no GOOGLE_GENERATIVE_AI_API_KEY");

  // Strict but fair: the target must really be there. Failing costs the player
  // nothing (free reshoots), while a wrong pass makes the quest meaningless.
  const system =
    `You are checking a photo for a game. The player was asked to photograph: ${target}. ` +
    `Pass ONLY if ${target} is clearly visible in the photo: you could point to it. ` +
    `It may be in the background or partly cropped, and a drawing or sign of it counts. ` +
    `A photo of a person, a face, a selfie, a hand or a random object does NOT count unless ${target} is also clearly visible. ` +
    `If you are unsure, fail: the player can simply retake it. ` +
    `Answer ONLY with JSON {"passed":boolean,"reason":"<8 words max>"}.`;

  const started = Date.now();
  const reasons: string[] = [];
  for (const [i, model] of MODELS.entries()) {
    const left = TIMEOUT_MS - (Date.now() - started);
    if (left <= 300) break;
    const last = i === MODELS.length - 1;
    const result = await askModel(model, key, system, target, jpegBase64, last ? left : Math.min(PER_MODEL_MS, left));
    if (result.ok) {
      // Verdicts only, never the image.
      console.info(`[photo-quest] ${model}: ${result.verdict.passed ? "PASS" : "FAIL"} "${target}" (${result.verdict.reason})`);
      return result.verdict;
    }
    reasons.push(`${model}: ${result.why}`);
  }
  return UNCHECKED(reasons.join("; ") || "no time left");
}

type Attempt = { ok: true; verdict: PhotoVerdict } | { ok: false; why: string };

async function askModel(
  model: string,
  key: string,
  system: string,
  target: string,
  jpegBase64: string,
  timeoutMs: number
): Promise<Attempt> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT(model), {
      method: "POST",
      signal: abort.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: jpegBase64 } },
              { text: `Does this photo show: ${target}?` },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    });
    if (!res.ok) return { ok: false, why: `HTTP ${res.status}` };

    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
      passed?: unknown;
      reason?: unknown;
    };
    if (typeof json.passed !== "boolean") return { ok: false, why: "no passed field" };
    const reason = typeof json.reason === "string" ? json.reason.split(/\s+/).slice(0, 8).join(" ") : "";
    return {
      ok: true,
      verdict: { passed: json.passed, reason: reason || (json.passed ? "looks right" : "not quite"), checked: true },
    };
  } catch (e) {
    return { ok: false, why: (e as Error).name === "AbortError" ? "timeout" : "error or unparseable answer" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A text-only Gemini request that answers with JSON. Same models, order and time
 * budget as the photo check. Returns null if no model answered (caller falls back).
 */
export async function askGeminiJson(system: string, prompt: string): Promise<Record<string, unknown> | null> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return null;
  const started = Date.now();
  for (const [i, model] of MODELS.entries()) {
    const left = TIMEOUT_MS - (Date.now() - started);
    if (left <= 300) break;
    const timeoutMs = i === MODELS.length - 1 ? left : Math.min(PER_MODEL_MS, left);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    try {
      const res = await fetch(ENDPOINT(model), {
        method: "POST",
        signal: abort.signal,
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.9 },
        }),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
      if (json && typeof json === "object") {
        console.info(`[gemini] ${model} answered`);
        return json as Record<string, unknown>;
      }
    } catch {
      /* timeout or bad JSON: try the next model */
    } finally {
      clearTimeout(timer);
    }
  }
  console.warn("[gemini] no model answered");
  return null;
}
