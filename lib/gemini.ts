// lib/gemini.ts
// Photo check for photo quests, via the Gemini REST API (no SDK needed).
//
// FAILS OPEN: no key, an error, a timeout over 6s, or an answer we can't
// parse all count as a pass. A verifier that blocks a judge's photo on stage
// is worse than no verifier. The image is never written to disk or logged.

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const TIMEOUT_MS = 6_000;
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

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT(MODEL), {
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
    if (!res.ok) return OPEN(`Gemini ${res.status}`);

    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
      passed?: unknown;
      reason?: unknown;
    };
    if (typeof json.passed !== "boolean") return OPEN("no passed field");
    const reason = typeof json.reason === "string" ? json.reason.split(/\s+/).slice(0, 8).join(" ") : "";
    return { passed: json.passed, reason: reason || (json.passed ? "looks right" : "not quite"), checked: true };
  } catch (e) {
    return OPEN((e as Error).name === "AbortError" ? "timeout" : "error or unparseable answer");
  } finally {
    clearTimeout(timer);
  }
}
