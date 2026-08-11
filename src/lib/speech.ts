/** Browser TTS / STT helpers. All calls are feature-detected and safe on the server. */

export function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let voicesCache: SpeechSynthesisVoice[] = [];

function pickVoice(locale: string) {
  if (!ttsSupported()) return undefined;
  if (voicesCache.length === 0) voicesCache = window.speechSynthesis.getVoices();
  const base = locale.split("-")[0] ?? locale;
  return (
    voicesCache.find((v) => v.lang.replace("_", "-") === locale) ??
    voicesCache.find((v) => v.lang.replace("_", "-").startsWith(base))
  );
}

export function speak(text: string, locale: string, rate = 1): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported() || !text) return resolve();
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = locale;
      u.rate = rate;
      const v = pickVoice(locale);
      if (v) u.voice = v;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
      // Safety net: some browsers never fire onend.
      setTimeout(resolve, Math.max(2500, text.length * 110));
    } catch {
      resolve();
    }
  });
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

type SR = any;

export function sttSupported() {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function listenOnce(
  locale: string,
  onResult: (transcript: string) => void,
  onError: (reason: string) => void,
): () => void {
  if (!sttSupported()) {
    onError("unsupported");
    return () => {};
  }
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const rec: SR = new Ctor();
  rec.lang = locale;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.continuous = false;
  let done = false;
  rec.onresult = (e: any) => {
    done = true;
    const alts: string[] = [];
    for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
    onResult(alts.join(" | "));
  };
  rec.onerror = (e: any) => {
    done = true;
    onError(e?.error ?? "error");
  };
  rec.onend = () => {
    if (!done) onError("no-speech");
  };
  try {
    rec.start();
  } catch {
    onError("error");
  }
  return () => {
    try {
      rec.stop();
    } catch {
      /* noop */
    }
  };
}

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Rubric-based evaluation of a spoken/typed reply (spec 7.3): did they attempt
 * the target language, did they hit the core pattern, does it answer the prompt.
 */
export function evaluateResponse(
  transcript: string,
  expected: string[],
  corePattern: string,
): { pass: boolean; hitPattern: boolean; attempted: boolean } {
  const said = normalize(transcript);
  const attempted = said.length > 1;
  const pattern = normalize(corePattern.replace(/uses?|'/g, ""));
  const patternWords = pattern.split(" ").filter((w) => w.length > 1);
  const hitPattern =
    patternWords.length > 0 && patternWords.every((w) => said.includes(w));

  let overlap = 0;
  for (const e of expected) {
    const words = normalize(e.replace(/\[.*?\]/g, "")).split(" ").filter((w) => w.length > 2);
    if (words.length === 0) continue;
    const hits = words.filter((w) => said.includes(w)).length / words.length;
    overlap = Math.max(overlap, hits);
  }
  return { pass: attempted && (hitPattern || overlap >= 0.6), hitPattern, attempted };
}
