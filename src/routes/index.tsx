import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import {
  authoredLanguages,
  languages,
  onboarding,
  projectedClearance,
} from "@/lib/content";
import { charactersFor } from "@/lib/companions";
import { useApp } from "@/lib/store";
import { sfx } from "@/lib/sfx";
import { supabase } from "@/integrations/supabase/client";
import { syncToCloud } from "@/lib/cloud-sync";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Habla — Learn a Language by Talking" },
      {
        name: "description",
        content:
          "Pick your language, choose the tutor who teaches you, set your daily goal, and start speaking from day one.",
      },
      { property: "og:title", content: "Habla — Learn a Language by Talking" },
      {
        property: "og:description",
        content: "Speech-first language learning with a tutor who has a real personality.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Hydrated>
      <IntakePage />
    </Hydrated>
  ),
});

const STEPS = [
  "Your name",
  "Language",
  "Your tutor",
  "Why you're learning",
  "Your timeline",
  "Daily goal",
  "All set!",
];

function IntakePage() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const setCompanion = useApp((s) => s.setCompanion);

  const [step, setStep] = useState(0);
  const [callsign, setCallsign] = useState("");
  const [langId, setLangId] = useState("spanish");
  const [tutorId, setTutorId] = useState("sofia");
  const [personaId, setPersonaId] = useState("undercover_traveler");
  const [timelineId, setTimelineId] = useState("standard_90");
  const [tierId, setTierId] = useState("field_op_30");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setAuthChecked(true);
      if (!data.session) {
        void navigate({ to: "/auth" });
        return;
      }
      if (profile) void navigate({ to: "/dashboard" });
    })();
  }, [navigate, profile]);

  const roster = charactersFor(langId);
  const tutor = roster.find((c) => c.id === tutorId) ?? roster[0]!;
  const projection = projectedClearance(langId, timelineId, tierId);

  async function next() {
    sfx("click");
    if (step < STEPS.length - 1) return setStep(step + 1);
    setProfile({
      callsign: callsign.trim() || "Friend",
      langId,
      timelineId,
      tierId,
      personaId,
      startedAt: Date.now(),
    });
    setCompanion({
      characterId: tutor.id,
      personalityId: tutor.personalityId,
      slang: 1,
      roast: 1,
      localMode: true,
      noTranslate: false,
    });
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id) void syncToCloud(data.session.user.id);
    void navigate({ to: "/dashboard" });
  }

  const canAdvance = step !== 0 || callsign.trim().length > 0;

  if (!authChecked) {
    return (
      <div className="topo flex min-h-[100dvh] items-center justify-center">
        <p className="bounce-soft text-sm font-extrabold text-muted-foreground">Getting things ready…</p>
      </div>
    );
  }

  return (
    <AppFrame tabs={false}>
      <div className="flex min-h-[100dvh] flex-col pb-8">
        <div className="flex items-center justify-between pt-4">
          {step > 0 ? (
            <button
              onClick={() => {
                sfx("tap");
                setStep(step - 1);
              }}
              className="text-muted-foreground"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="h-5 w-5" />
          )}
          <p className="text-[11px] font-extrabold text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-secondary transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-extrabold text-secondary">Habla</p>
          <h1 className="mt-1 text-2xl font-extrabold text-foreground">{STEPS[step]}</h1>
        </div>

        <div className="mt-6 flex-1 space-y-3">
          {step === 0 && (
            <div className="paper-card p-4">
              <p className="text-sm">
                Hey! What should we call you? It stays on this device.
              </p>
              <input
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="Your name"
                maxLength={20}
                className="mt-4 w-full rounded-2xl border-2 border-paper-foreground/20 bg-transparent px-3 py-2.5 text-sm font-bold text-paper-foreground outline-none focus:border-paper-foreground/60"
              />
            </div>
          )}

          {step === 1 &&
            languages.map((l) => {
              const authored = authoredLanguages.includes(l.id);
              return (
                <button
                  key={l.id}
                  disabled={!authored}
                  onClick={() => {
                    sfx("tap");
                    setLangId(l.id);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left ${
                    langId === l.id ? "border-primary bg-primary/10" : "border-border bg-card"
                  } ${authored ? "" : "opacity-40"}`}
                >
                  <span className="text-xl">{l.flag_emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold">{l.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {authored ? "Ready to learn" : "Coming soon"}
                    </span>
                  </span>
                </button>
              );
            })}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Your tutor talks to you every day. Their personality decides how they teach you —
                and their face is the one you'll see around the app.
              </p>
              {roster.map((c) => {
                const active = c.id === tutorId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      sfx("tap");
                      setTutorId(c.id);
                    }}
                    className={`flex w-full items-start gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-transform ${
                      active ? "border-primary bg-primary/10 scale-[1.01]" : "border-border bg-card"
                    }`}
                  >
                    <img
                      src={c.avatar}
                      alt={c.name}
                      width={512}
                      height={512}
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-full border-2 border-border bg-muted object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-extrabold">
                        {c.flag} {c.name} · {c.age}
                        {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-bold text-secondary">
                        {c.region}
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{c.bio}</span>
                      <span className="mt-1 block text-[11px] font-bold">{c.teaches}</span>
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {step === 3 &&
            onboarding.operational_personas.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  sfx("tap");
                  setPersonaId(p.id);
                }}
                className={`block w-full rounded-2xl border-2 px-3 py-3 text-left ${
                  personaId === p.id ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <span className="block text-sm font-extrabold">{p.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{p.description}</span>
              </button>
            ))}

          {step === 4 &&
            onboarding.goal_timelines.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  sfx("tap");
                  setTimelineId(t.id);
                }}
                className={`block w-full rounded-2xl border-2 px-3 py-3 text-left ${
                  timelineId === t.id ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <span className="block text-sm font-extrabold">{t.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t.days} days · ~{Math.round(t.days * t.new_content_day_ratio)} new lessons,{" "}
                  {t.days - Math.round(t.days * t.new_content_day_ratio)} review days
                </span>
              </button>
            ))}

          {step === 5 &&
            onboarding.daily_commitment_tiers.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  sfx("tap");
                  setTierId(t.id);
                }}
                className={`block w-full rounded-2xl border-2 px-3 py-3 text-left ${
                  tierId === t.id ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <span className="block text-sm font-extrabold">
                  {t.label} · {t.minutes} min a day
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  ~{t.approx_new_items_per_session} new words · drills, review, speaking
                  {t.session_composition['sts_min'] ? ", live chat" : ""}
                </span>
              </button>
            ))}

          {step === 6 && (
            <div className="paper-card space-y-3 p-4">
              <div className="flex items-center gap-3">
                <img
                  src={tutor.avatar}
                  alt={tutor.name}
                  width={512}
                  height={512}
                  className="h-14 w-14 rounded-full border-2 border-primary object-cover"
                />
                <p className="text-sm">
                  <strong>{tutor.name}</strong> will be teaching you. Ready when you are,{" "}
                  {callsign.trim() || "friend"}!
                </p>
              </div>
              <p className="text-sm">
                At this pace you should reach <strong>{projection.codename}</strong> (
                {projection.cefr_approx}).
              </p>
              <p className="text-sm">{projection.can_do_summary}</p>
              <div className="space-y-0.5 border-t-2 border-paper-foreground/15 pt-3 text-[11px] font-bold">
                <p>Language: {languages.find((l) => l.id === langId)?.label}</p>
                <p>
                  Focus: {onboarding.operational_personas.find((p) => p.id === personaId)?.label}
                </p>
                <p>
                  Plan: {onboarding.goal_timelines.find((t) => t.id === timelineId)?.label} ·{" "}
                  {onboarding.daily_commitment_tiers.find((t) => t.id === tierId)?.label}
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={next}
          disabled={!canAdvance}
          className="btn-3d mt-6 w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground disabled:opacity-40"
        >
          {step === STEPS.length - 1 ? "Let's go!" : "Continue"}
        </button>
      </div>
    </AppFrame>
  );
}
