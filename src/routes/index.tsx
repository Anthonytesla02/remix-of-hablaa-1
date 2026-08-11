import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import {
  authoredLanguages,
  languages,
  onboarding,
  projectedClearance,
} from "@/lib/content";
import { useApp } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { syncToCloud } from "@/lib/cloud-sync";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Operation Lingua — Intake Briefing" },
      {
        name: "description",
        content:
          "Set your target language, cover persona, deployment timeline and daily commitment, then start speech-first language training.",
      },
      { property: "og:title", content: "Operation Lingua — Intake Briefing" },
      {
        property: "og:description",
        content: "FSI/DLI-inspired immersive language training. Zero English. Speech first.",
      },
    ],
  }),
  component: () => (
    <Hydrated>
      <IntakePage />
    </Hydrated>
  ),
});

const STEPS = ["CALLSIGN", "TARGET LANGUAGE", "COVER PERSONA", "DEPLOYMENT WINDOW", "DAILY COMMITMENT", "BRIEFING"];

function IntakePage() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);

  const [step, setStep] = useState(0);
  const [callsign, setCallsign] = useState("");
  const [langId, setLangId] = useState("spanish");
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

  const projection = projectedClearance(langId, timelineId, tierId);

  function next() {
    if (step < STEPS.length - 1) return setStep(step + 1);
    setProfile({
      callsign: callsign.trim() || "OPERATIVE",
      langId,
      timelineId,
      tierId,
      personaId,
      startedAt: Date.now(),
    });
    void navigate({ to: "/dashboard" });
  }

  const canAdvance = step !== 0 || callsign.trim().length > 0;

  return (
    <AppFrame tabs={false}>
      <div className="flex min-h-[100dvh] flex-col pb-8">
        <div className="flex items-center justify-between pt-4">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="text-muted-foreground">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="h-5 w-5" />
          )}
          <p className="hud text-[10px] text-muted-foreground">
            INTAKE {step + 1}/{STEPS.length}
          </p>
        </div>

        <div className="mt-6">
          <p className="hud text-[10px] text-secondary">OPERATION LINGUA</p>
          <h1 className="hud mt-1 text-xl text-foreground">{STEPS[step]}</h1>
        </div>

        <div className="mt-6 flex-1 space-y-3">
          {step === 0 && (
            <div className="paper-card p-4">
              <p className="text-sm">
                This is ECHO, your handler. Before deployment I need a name for the file — it never
                leaves this device.
              </p>
              <input
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="Callsign"
                maxLength={20}
                className="hud mt-4 w-full rounded-sm border-2 border-paper-foreground/20 bg-transparent px-3 py-2.5 text-sm text-paper-foreground outline-none focus:border-paper-foreground/60"
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
                  onClick={() => setLangId(l.id)}
                  className={`flex w-full items-center gap-3 rounded-sm border px-3 py-3 text-left ${
                    langId === l.id ? "border-primary bg-primary/10" : "border-border bg-card"
                  } ${authored ? "" : "opacity-40"}`}
                >
                  <span className="text-xl">{l.flag_emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{l.label}</span>
                    <span className="hud block text-[9px] text-muted-foreground">
                      DLI CAT {l.dli_category} · ×{l.category_multiplier}
                      {authored ? "" : " · DOSSIER PENDING"}
                    </span>
                  </span>
                </button>
              );
            })}

          {step === 2 &&
            onboarding.operational_personas.map((p) => (
              <button
                key={p.id}
                onClick={() => setPersonaId(p.id)}
                className={`block w-full rounded-sm border px-3 py-3 text-left ${
                  personaId === p.id ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <span className="hud block text-[11px]">{p.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{p.description}</span>
              </button>
            ))}

          {step === 3 &&
            onboarding.goal_timelines.map((t) => (
              <button
                key={t.id}
                onClick={() => setTimelineId(t.id)}
                className={`block w-full rounded-sm border px-3 py-3 text-left ${
                  timelineId === t.id ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <span className="hud block text-[11px]">{t.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t.days} days · ~{Math.round(t.days * t.new_content_day_ratio)} mission days,{" "}
                  {t.days - Math.round(t.days * t.new_content_day_ratio)} checkpoint days
                </span>
              </button>
            ))}

          {step === 4 &&
            onboarding.daily_commitment_tiers.map((t) => (
              <button
                key={t.id}
                onClick={() => setTierId(t.id)}
                className={`block w-full rounded-sm border px-3 py-3 text-left ${
                  tierId === t.id ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <span className="hud block text-[11px]">
                  {t.label} · {t.minutes} MIN
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  ~{t.approx_new_items_per_session} new items · drills, review, shadowing
                  {t.session_composition['sts_min'] ? ", live speech" : ""}
                </span>
              </button>
            ))}

          {step === 5 && (
            <div className="paper-card space-y-3 p-4">
              <p className="hud text-[10px] text-destructive">MISSION PROJECTION</p>
              <p className="text-sm">
                At this pace you should reach{" "}
                <strong>
                  {projection.codename} (ILR {projection.ilr_equivalent} / {projection.cefr_approx})
                </strong>
                .
              </p>
              <p className="text-sm">{projection.can_do_summary}</p>
              <p className="text-xs opacity-70">
                Estimates follow FSI/DLI hour benchmarks adjusted for language category. Individual
                results vary with aptitude and consistency.
              </p>
              <div className="hud border-t border-paper-foreground/20 pt-3 text-[10px]">
                <p>OPERATIVE: {callsign.trim() || "OPERATIVE"}</p>
                <p>LANGUAGE: {languages.find((l) => l.id === langId)?.label}</p>
                <p>
                  PERSONA:{" "}
                  {onboarding.operational_personas.find((p) => p.id === personaId)?.label}
                </p>
                <p>
                  WINDOW: {onboarding.goal_timelines.find((t) => t.id === timelineId)?.label} ·{" "}
                  {onboarding.daily_commitment_tiers.find((t) => t.id === tierId)?.label}
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={next}
          disabled={!canAdvance}
          className="hud mt-6 w-full rounded-sm bg-primary py-3.5 text-xs text-primary-foreground disabled:opacity-40"
        >
          {step === STEPS.length - 1 ? "BEGIN DEPLOYMENT" : "CONTINUE"}
        </button>
      </div>
    </AppFrame>
  );
}
