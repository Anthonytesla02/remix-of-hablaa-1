import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Coffee,
  UtensilsCrossed,
  PartyPopper,
  TrainFront,
  Plane,
  ShoppingBasket,
  Car,
  BedDouble,
  Mic,
  Keyboard,
  Loader2,
  Volume2,
  VolumeX,
  Send,
  LogOut,
} from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { Glossed } from "@/components/Glossed";
import { Redaction } from "@/components/Redaction";
import { PlayButton, useSpeaker } from "@/components/Audio";
import { AMBIENCE_LABELS, Ambience, type AmbienceId } from "@/lib/ambience";
import { simulateTurn, type SimReply } from "@/lib/simulate.functions";
import { bcp47, langById } from "@/lib/content";
import { listenOnce, stopSpeaking, sttSupported } from "@/lib/speech";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/simulate")({
  head: () => ({
    meta: [
      { title: "Simulation Deck — Operation Lingua" },
      {
        name: "description",
        content:
          "Live role-play simulations with ambient soundscapes: cafés, stations, airports and parties. Speak, listen and hold a real conversation in your target language.",
      },
      { property: "og:title", content: "Simulation Deck — Operation Lingua" },
      {
        property: "og:description",
        content: "Immersive AI role-play with matching background noise for each setting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Hydrated>
      <SimulatePage />
    </Hydrated>
  ),
});

type Scene = {
  id: AmbienceId;
  label: string;
  character: string;
  setting: string;
  goals: string[];
  minExchanges: number;
  icon: typeof Coffee;
};

const SCENES: Scene[] = [
  {
    id: "cafe",
    label: "Café",
    character: "barista behind the counter",
    setting: "a busy neighbourhood café at mid-morning; the learner is ordering",
    goals: [
      "greeting and how the learner's day is going",
      "asking what the learner wants, size and milk",
      "recommending the pastry of the day and taking that order",
      "a small complication: the card machine is slow or a drink has run out",
      "name for the cup, paying, and a warm goodbye",
    ],
    minExchanges: 10,
    icon: Coffee,
  },
  {
    id: "restaurant",
    label: "Restaurant",
    character: "waiter taking an order",
    setting: "a small family restaurant at dinner service; the learner is being seated and ordering",
    goals: [
      "greeting, how many people, choosing a table",
      "drinks and today's specials",
      "starters and mains, with a recommendation",
      "an allergy or substitution question",
      "dessert or coffee, then the bill and goodbye",
    ],
    minExchanges: 12,
    icon: UtensilsCrossed,
  },
  {
    id: "party",
    label: "Party",
    character: "friendly stranger at a house party",
    setting: "a crowded house party with music; small talk and introductions",
    goals: [
      "introductions and how each of you knows the host",
      "where you're both from and what you do",
      "hobbies, music and the weekend",
      "an invitation or plan for later",
      "swapping contacts and a goodbye",
    ],
    minExchanges: 12,
    icon: PartyPopper,
  },
  {
    id: "station",
    label: "Train station",
    character: "ticket office clerk",
    setting: "a main railway station; the learner needs a ticket and platform information",
    goals: [
      "greeting and destination",
      "date, time and one-way or return",
      "class, seat and price",
      "a complication: that train is full or delayed, so pick another",
      "platform, transfers and goodbye",
    ],
    minExchanges: 10,
    icon: TrainFront,
  },
  {
    id: "airport",
    label: "Airport",
    character: "check-in and border agent",
    setting: "an international airport terminal; check-in, baggage and arrival questions",
    goals: [
      "greeting, destination and documents",
      "baggage: how many bags, weight, carry-on",
      "seat preference and boarding details",
      "border questions: purpose of trip, length of stay, where you're staying",
      "final instructions and goodbye",
    ],
    minExchanges: 12,
    icon: Plane,
  },
  {
    id: "market",
    label: "Market",
    character: "market stall vendor",
    setting: "an open-air food market; buying produce, asking prices and quantities",
    goals: [
      "greeting and what's fresh today",
      "prices and quantities",
      "asking what to cook with it",
      "haggling or asking for a little extra",
      "paying, change and goodbye",
    ],
    minExchanges: 10,
    icon: ShoppingBasket,
  },
  {
    id: "taxi",
    label: "Taxi",
    character: "taxi driver",
    setting: "the back seat of a taxi in traffic; giving a destination and chatting",
    goals: [
      "destination and rough fare",
      "route choice and traffic",
      "small talk: where you're from, how long you're staying",
      "the driver's tips about the city",
      "arriving, paying and goodbye",
    ],
    minExchanges: 10,
    icon: Car,
  },
  {
    id: "hotel",
    label: "Hotel",
    character: "hotel receptionist",
    setting: "a quiet hotel lobby; checking in, asking about the room and the area",
    goals: [
      "greeting, name and reservation",
      "documents, nights and room type",
      "breakfast times, wifi and facilities",
      "a small problem with the room or a request",
      "directions in the neighbourhood, then goodbye",
    ],
    minExchanges: 12,
    icon: BedDouble,
  },
];


type Msg = {
  role: "user" | "character";
  text: string;
  translation?: string;
  feedback?: SimReply["feedback"];
};

function SimulatePage() {
  const profile = useApp((s) => s.profile);
  const addXp = useApp((s) => s.addXp);
  const [scene, setScene] = useState<Scene | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [stage, setStage] = useState("");
  const [suggestions, setSuggestions] = useState<{ target: string; translation: string }[]>([]);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [typed, setTyped] = useState("");
  const [useText, setUseText] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [turns, setTurns] = useState(0);

  const ambienceRef = useRef<Ambience | null>(null);
  const stopListenRef = useRef<() => void>(() => {});
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const locale = bcp47(profile?.langId ?? "spanish");
  const language = langById(profile?.langId ?? "spanish")?.label ?? "Spanish";
  const say = useSpeaker(locale);

  useEffect(() => {
    if (!sttSupported()) setUseText(true);
    return () => {
      ambienceRef.current?.stop();
      stopListenRef.current();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, thinking]);

  const history = useMemo(() => msgs.map((m) => ({ role: m.role, text: m.text })), [msgs]);

  async function speakCharacter(text: string) {
    if (muted) return;
    ambienceRef.current?.duck(true);
    await say(text);
    ambienceRef.current?.duck(false);
  }

  async function advance(userText: string, currentHistory: Msg[]) {
    if (!scene) return;
    setThinking(true);
    setSuggestions([]);
    try {
      const reply = await simulateTurn({
        data: {
          language,
          setting: scene.setting,
          character: scene.character,
          level: "beginner",
          history: currentHistory.map((m) => ({ role: m.role, text: m.text })),
          userText,
        },
      });
      setStage(reply.stage_direction);
      setSuggestions(reply.suggestions);
      setMsgs((m) => {
        const next = [...m];
        if (reply.feedback && next.length > 0) {
          const lastIdx = next.length - 1;
          next[lastIdx] = { ...next[lastIdx]!, feedback: reply.feedback };
        }
        next.push({
          role: "character",
          text: reply.reply,
          translation: reply.reply_translation,
        });
        return next;
      });
      setTurns((t) => t + 1);
      if (reply.ended) setEnded(true);
      void speakCharacter(reply.reply);
    } finally {
      setThinking(false);
    }
  }

  async function begin(s: Scene) {
    setScene(s);
    setMsgs([]);
    setEnded(false);
    setTurns(0);
    setStage("");
    const amb = new Ambience();
    ambienceRef.current = amb;
    if (!muted) await amb.start(s.id);
    setThinking(true);
    try {
      const reply = await simulateTurn({
        data: {
          language,
          setting: s.setting,
          character: s.character,
          level: "beginner",
          history: [],
          userText: "",
        },
      });
      setStage(reply.stage_direction);
      setSuggestions(reply.suggestions);
      setMsgs([{ role: "character", text: reply.reply, translation: reply.reply_translation }]);
      void speakCharacter(reply.reply);
    } finally {
      setThinking(false);
    }
  }

  function sendText(text: string) {
    const clean = text.trim();
    if (!clean || thinking) return;
    const next: Msg[] = [...msgs, { role: "user", text: clean }];
    setMsgs(next);
    setTyped("");
    void advance(clean, msgs);
  }

  function record() {
    setListening(true);
    stopListenRef.current = listenOnce(
      locale,
      (t) => {
        setListening(false);
        sendText(t.split(" | ")[0] ?? t);
      },
      () => {
        setListening(false);
        setUseText(true);
      },
    );
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (next) {
      ambienceRef.current?.stop();
      stopSpeaking();
    } else if (scene) {
      const amb = new Ambience();
      ambienceRef.current = amb;
      void amb.start(scene.id);
    }
  }

  function leave(award: boolean) {
    ambienceRef.current?.stop();
    stopListenRef.current();
    stopSpeaking();
    if (award) {
      const userTurns = msgs.filter((m) => m.role === "user").length;
      addXp(Math.min(120, userTurns * 12));
    }
    setScene(null);
    setMsgs([]);
    setSuggestions([]);
    setEnded(false);
  }

  /* ── Scene picker ───────────────────────────────────────────────────── */
  if (!scene) {
    return (
      <AppFrame>
        <h1 className="hud text-xl">SIMULATION DECK</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a location. Ambient sound comes up, a local starts talking, and you hold the
          conversation — speak or type, and ask your own questions too.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {SCENES.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => void begin(s)}
                className="rounded-sm border border-border bg-card p-3 text-left transition-colors hover:border-primary"
              >
                <Icon className="h-5 w-5 text-primary" />
                <p className="hud mt-2 text-[11px]">{s.label}</p>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  {AMBIENCE_LABELS[s.id]}
                </p>
              </button>
            );
          })}
        </div>
        <p className="hud mt-5 text-[9px] text-muted-foreground">
          HEADPHONES RECOMMENDED · TARGET LANGUAGE: {language.toUpperCase()}
        </p>
      </AppFrame>
    );
  }

  /* ── Live simulation ────────────────────────────────────────────────── */
  return (
    <AppFrame tabs={false}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="hud truncate text-[11px] text-secondary">
            LIVE · {scene.label.toUpperCase()}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{scene.character}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute ambience" : "Mute ambience"}
            className="rounded-sm border border-border p-2 text-muted-foreground"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => leave(true)}
            aria-label="Leave simulation"
            className="rounded-sm border border-border p-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {stage && <p className="mt-3 text-[11px] italic text-muted-foreground">{stage}</p>}

      <div className="mt-3 space-y-3">
        {msgs.map((m, i) =>
          m.role === "character" ? (
            <div key={i} className="paper-card p-3">
              <p className="hud text-[9px] text-destructive">{scene.label.toUpperCase()}</p>
              <p className="mt-1 text-base">
                <Glossed text={m.text} locale={locale} />
              </p>
              {m.translation && (
                <div className="mt-2">
                  <Redaction text={m.translation} />
                </div>
              )}
              <div className="mt-2">
                <PlayButton text={m.text} locale={locale} label="REPLAY" />
              </div>
            </div>
          ) : (
            <div key={i} className="ml-6 rounded-sm border border-secondary/50 bg-secondary/10 p-3">
              <p className="hud text-[9px] text-secondary">YOU</p>
              <p className="mt-1 text-base">{m.text}</p>
              {m.feedback && (
                <p
                  className={`mt-2 text-[11px] ${
                    m.feedback.verdict === "good"
                      ? "text-primary"
                      : m.feedback.verdict === "understandable"
                        ? "text-foreground"
                        : "text-destructive"
                  }`}
                >
                  {m.feedback.note}
                </p>
              )}
            </div>
          ),
        )}
        {thinking && (
          <p className="hud flex items-center gap-2 text-[10px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> THEY’RE RESPONDING…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {ended ? (
        <div className="mt-5 space-y-2">
          <p className="hud text-center text-[11px] text-primary">SCENE CLOSED · {turns} EXCHANGES</p>
          <button
            onClick={() => leave(true)}
            className="hud w-full rounded-sm bg-primary py-3.5 text-xs text-primary-foreground"
          >
            BANK THE XP
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {suggestions.length > 0 && (
            <div className="rounded-sm border border-secondary/40 bg-secondary/5 p-2.5">
              <p className="hud text-[9px] text-secondary">YOU COULD SAY</p>
              <div className="mt-1.5 space-y-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.target}
                    onClick={() => sendText(s.target)}
                    disabled={thinking}
                    className="block w-full rounded-sm border border-border bg-card px-2.5 py-2 text-left disabled:opacity-50"
                  >
                    <span className="text-sm">{s.target}</span>
                    <span className="block text-[10px] text-muted-foreground">{s.translation}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {useText ? (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <textarea
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  rows={2}
                  placeholder={`Reply in ${language}`}
                  className="w-full rounded-sm border border-input bg-card px-3 py-2 text-base outline-none focus:border-secondary"
                />
                <button
                  onClick={() => sendText(typed)}
                  disabled={!typed.trim() || thinking}
                  aria-label="Send reply"
                  className="rounded-sm bg-primary p-3 text-primary-foreground disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {sttSupported() && (
                <button
                  onClick={() => setUseText(false)}
                  className="hud w-full rounded-sm border border-border py-2.5 text-[10px] text-muted-foreground"
                >
                  <Mic className="mr-1 inline h-3 w-3" /> USE MICROPHONE
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={record}
                disabled={listening || thinking}
                className={`flex w-full flex-col items-center gap-2 rounded-sm border py-6 ${
                  listening
                    ? "mic-live border-secondary bg-secondary/10 text-secondary"
                    : "border-border bg-card text-foreground"
                }`}
              >
                <Mic className="h-7 w-7" />
                <span className="hud text-[10px]">
                  {listening ? "LISTENING…" : "TAP AND SPEAK"}
                </span>
              </button>
              <button
                onClick={() => setUseText(true)}
                className="hud w-full rounded-sm border border-border py-2.5 text-[10px] text-muted-foreground"
              >
                <Keyboard className="mr-1 inline h-3 w-3" /> TYPE INSTEAD
              </button>
            </div>
          )}
        </div>
      )}
    </AppFrame>
  );
}
