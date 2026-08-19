/**
 * Procedural UI sound effects (Web Audio). No assets, no network — every sound
 * is synthesised so clicks, transitions, loading loops and completions stay
 * instant and tiny. Respects a persisted mute flag.
 */

export type SfxName =
  | "click"
  | "tap"
  | "transition"
  | "correct"
  | "wrong"
  | "complete"
  | "levelup"
  | "record"
  | "stop";

const MUTE_KEY = "ol.sfx.muted";

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let muted = false;
let loadingStop: (() => void) | null = null;

if (typeof window !== "undefined") {
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    /* noop */
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    bus = ctx.createGain();
    bus.gain.value = 0.5;
    bus.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

export function sfxMuted() {
  return muted;
}

export function setSfxMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* noop */
  }
  if (next) stopLoading();
}

type ToneOpts = {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

function tone({ freq, to, dur = 0.12, type = "sine", gain = 0.2, delay = 0 }: ToneOpts) {
  const c = audio();
  if (!c || !bus) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur = 0.16, gain = 0.12, freq = 1800) {
  const c = audio();
  if (!c || !bus) return;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(bus);
  src.start();
}

/** Play a one-shot UI sound. Safe to call from anywhere, including SSR. */
export function sfx(name: SfxName) {
  if (muted || typeof window === "undefined") return;
  switch (name) {
    case "click":
      tone({ freq: 880, to: 620, dur: 0.06, type: "square", gain: 0.06 });
      break;
    case "tap":
      tone({ freq: 460, to: 380, dur: 0.05, type: "triangle", gain: 0.07 });
      break;
    case "transition":
      tone({ freq: 320, to: 760, dur: 0.22, type: "sine", gain: 0.09 });
      noise(0.18, 0.05, 2600);
      break;
    case "correct":
      tone({ freq: 660, dur: 0.1, type: "sine", gain: 0.14 });
      tone({ freq: 880, dur: 0.16, type: "sine", gain: 0.13, delay: 0.09 });
      break;
    case "wrong":
      tone({ freq: 220, to: 130, dur: 0.28, type: "sawtooth", gain: 0.1 });
      break;
    case "complete":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, dur: 0.4, type: "triangle", gain: 0.13, delay: i * 0.1 }),
      );
      noise(0.5, 0.05, 3200);
      break;
    case "levelup":
      [392, 523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        tone({ freq: f, dur: 0.5, type: "sine", gain: 0.12, delay: i * 0.08 }),
      );
      break;
    case "record":
      tone({ freq: 520, to: 900, dur: 0.12, type: "sine", gain: 0.1 });
      break;
    case "stop":
      tone({ freq: 900, to: 500, dur: 0.12, type: "sine", gain: 0.1 });
      break;
  }
}

/** Soft repeating pulse while something is loading. Returns a stop function. */
export function startLoading(): () => void {
  stopLoading();
  if (muted || typeof window === "undefined") return () => {};
  const iv = setInterval(() => tone({ freq: 700, dur: 0.05, type: "sine", gain: 0.035 }), 620);
  loadingStop = () => clearInterval(iv);
  return stopLoading;
}

export function stopLoading() {
  if (loadingStop) {
    loadingStop();
    loadingStop = null;
  }
}

let wired = false;

/** Global click/tap feedback for buttons and links. Idempotent. */
export function initSfx() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  window.addEventListener(
    "pointerdown",
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest(
        "button, a, [role='button'], input[type='checkbox'], label",
      );
      if (!el) return;
      sfx(el.tagName === "A" ? "tap" : "click");
    },
    { capture: true },
  );
}
