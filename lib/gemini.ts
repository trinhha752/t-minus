// lib/gemini.ts
// Photo check for photo quests, via the Gemini REST API (no SDK needed).
//
// FAILS OPEN: no key, an error, a timeout over 6s, or an answer we can't
// parse all count as a pass. A verifier that blocks a judge's photo on stage
// is worse than no verifier. The image is never written to disk or logged.

/**
 * Models to try, in order. If one is overloaded (503), gone (404) or slow, the next
 * gets the remaining time. Tested 21 Nov 2026: gemini-3.8/3.7-flash timed out under
 * load, 3.6-flash answered in ~2.7s, 3.1-flash-lite in ~0.8s.
 * Override with GEMINI_MODEL=model-a,model-b in .env.local.
 */
const MODELS = (process.env.GEMINI_MODEL || "gemini-3.6-flash,gemini-3.1-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
/** Whole check, all models together. */
const TIMEOUT_MS = 6_000;
/** Most one model may take before we move on (the last model gets whatever is left). */
const PER_MODEL_MS = 3_500;
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export interface PhotoVerdict {
  passed: boolean;
  reason: string;
  /** false when we passed it without asking Gemini (fail-open). */
  checked: boolean;
}

const OPEN = (why: string): PhotoVerdict => {
  console.warn(`[photo-quest] failing open: ${why}`);
  return { passed: true, reason: "verified", checked: false };
};

/** Does this JPEG plausibly show `target`? */
export async function verifyPhoto(target: string, jpegBase64: string): Promise<PhotoVerdict> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return OPEN("no GOOGLE_GENERATIVE_AI_API_KEY");

  const system =
    `You are checking a photo for a game. The player was asked to photograph: ${target}. ` +
    `Answer ONLY with JSON {"passed":boolean,"reason":"<8 words max>"}. ` +
    `Be generous — if it plausibly shows the target, pass. ` +
    `Only fail if clearly unrelated or nothing is visible.`;

  const started = Date.now();
  const reasons: string[] = [];
  for (const [i, model] of MODELS.entries()) {
    const left = TIMEOUT_MS - (Date.now() - started);
    if (left <= 300) break;
    const last = i === MODELS.length - 1;
    const result = await askModel(model, key, system, target, jpegBase64, last ? left : Math.min(PER_MODEL_MS, left));
    if (result.ok) return result.verdict;
    reasons.push(`${model}: ${result.why}`);
  }
  return OPEN(reasons.join("; ") || "no time left");
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
