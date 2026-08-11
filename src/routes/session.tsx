import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { X, ShieldAlert } from "lucide-react";
import { Hydrated } from "@/components/AppFrame";
import { StepRenderer, type StepResult } from "@/components/steps";
import { bcp47, gamification, missionDays, onboarding } from "@/lib/content";
import { buildSession, stepLabel, type Step } from "@/lib/session";
import { stopSpeaking } from "@/lib/speech";
import { useApp } from "@/lib/store";
import { dueCards } from "@/lib/srs";

type Mode = "mission" | "review" | "checkpoint";

export const Route = createFileRoute("/session")({
  validateSearch: (s: Record<string, unknown>): { day: string; mode: Mode } => ({
    day: String(s['day'] ?? ""),
    mode: (["mission", "review", "checkpoint"].includes(String(s['mode'])) ? s['mode'] : "mission") as Mode,
  }),
  head: () => ({
    meta: [
      { title: "Mission Session — Operation Lingua" },
      {
        name: "description",
        content: "Run drills, shadowing, dictation and spoken field interrogations in your target language.",
      },
      { property: "og:title", content: "Mission Session — Operation Lingua" },
      { property: "og:description", content: "Zero-English drills, shadowing and spoken roleplay." },
    ],
  }),
  component: () => (
    <Hydrated>
      <SessionPage />
    </Hydrated>
  ),
});

function SessionPage() {
  const { day: dayKey, mode } = Route.useSearch();
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const cards = useApp((s) => s.cards);
  const seedCards = useApp((s) => s.seedCards);
  const reviewCard = useApp((s) => s.reviewCard);
  const completeSession = useApp((s) => s.completeSession);

  const [index, setIndex] = useState(0);
  const [xp, setXp] = useState(0);
  const [right, setRight] = useState(0);
  const [graded, setGraded] = useState(0);
  const [cover, setCover] = useState(gamification.cover_integrity.starting_points_per_session as number);
  const [stsWins, setStsWins] = useState(0);
  const [mcqPerfect, setMcqPerfect] = useState(true);
  const [shadowReps, setShadowReps] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  const days = profile ? missionDays(profile.langId) : [];
  const entry = days.find((d) => d.key === dayKey) ?? days[0];
  const dueAtStart = useMemo(
    () => (profile ? dueCards(cards, profile.langId, 999).length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.langId],
  );

  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (!profile || !entry) return;
    if (mode === "review") {
      const reviews = dueCards(cards, profile.langId, 40).map((c) => ({ kind: "review", data: c }) as Step);
      setSteps(reviews);
    } else {
      setSteps(
        buildSession({
          day: entry.day,
          tierId: profile.tierId,
          cards,
          lang: profile.langId,
          checkpoint: mode === "checkpoint",
        }),
      );
    }
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, mode, profile?.langId]);

  useEffect(() => {
    if (!profile) void navigate({ to: "/" });
  }, [profile, navigate]);

  if (!profile || !entry) return null;

  const locale = bcp47(profile.langId);
  const tier = onboarding.daily_commitment_tiers.find((t) => t.id === profile.tierId);
  const step = steps[index];
  const total = steps.length;

  function handleDone(r: StepResult) {
    const s = steps[index]!;
    if (s.kind === "review") reviewCard(s.data.id, r.correct);
    if (s.kind === "shadow") setShadowReps((n) => n + s.data.recommended_reps);
    if (s.kind === "sts" && r.correct) setStsWins((n) => n + 1);
    if (s.kind === "mcq" && !r.correct) setMcqPerfect(false);

    let nextCover = cover;
    if (!r.correct && r.newContent) {
      nextCover = Math.max(0, cover - gamification.cover_integrity.cost_on_wrong_new_content_answer);
      setCover(nextCover);
    }

    setXp((v) => v + r.xp);
    if (r.countsForAccuracy) {
      setGraded((g) => g + 1);
      if (r.correct) setRight((c) => c + 1);
    }

    let remaining = steps.slice(index + 1);
    // Cover integrity at zero: restrict the rest of the session to review/shadowing.
    if (nextCover === 0 && cover > 0) {
      remaining = remaining.filter((x) => x.kind === "review" || x.kind === "shadow");
      setSteps([...steps.slice(0, index + 1), ...remaining]);
    }
    if (remaining.length === 0) finish(xp + r.xp, graded + (r.countsForAccuracy ? 1 : 0), right + (r.correct && r.countsForAccuracy ? 1 : 0), nextCover);
    else setIndex(index + 1);
  }

  function finish(finalXp: number, finalGraded: number, finalRight: number, finalCover: number) {
    stopSpeaking();
    const accuracy = finalGraded === 0 ? 1 : finalRight / finalGraded;
    const perfect = finalGraded > 0 && finalRight === finalGraded;
    const bonus =
      mode === "checkpoint" && accuracy >= 0.8 ? (gamification.xp_rules.checkpoint_passed_bonus as number) : 0;
    const awarded = Math.round(
      (finalXp + bonus) * (perfect ? (gamification.xp_rules.perfect_session_multiplier as number) : 1),
    );

    if (mode !== "review") seedCards(entry!.day.new_items, profile!.langId);

    const minutes = (Date.now() - startedAt) / 60000;
    completeSession(
      {
        date: Date.now(),
        dayKey: mode === "review" ? "review" : entry!.key,
        xp: awarded,
        accuracy,
        items: finalGraded,
        coverIntact: finalCover === (gamification.cover_integrity.starting_points_per_session as number),
      },
      {
        quest_sts_2: stsWins >= 2,
        quest_perfect_drill: mcqPerfect && steps.some((s) => s.kind === "mcq"),
        quest_clear_vault: dueAtStart > 0 && dueCards(useApp.getState().cards, profile!.langId, 999).length === 0,
        quest_shadow_5: shadowReps >= 5,
        quest_beat_clock: minutes <= (tier?.minutes ?? 30),
      },
    );
    setXp(awarded);
    setFinished(true);
  }

  if (finished) {
    const accuracy = graded === 0 ? 1 : right / graded;
    const passed = mode !== "checkpoint" || accuracy >= 0.8;
    return (
      <div className="topo mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-5">
        <div className="paper-card p-5">
          <p className="stamp stamp-in inline-block text-destructive">
            {passed ? "DEBRIEF COMPLETE" : "RE-RUN REQUIRED"}
          </p>
          <h1 className="hud mt-4 text-lg">SESSION REPORT</h1>
          <dl className="hud mt-4 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <dt>XP EARNED</dt>
              <dd>{xp}</dd>
            </div>
            <div className="flex justify-between">
              <dt>ACCURACY</dt>
              <dd>{Math.round(accuracy * 100)}%</dd>
            </div>
            <div className="flex justify-between">
              <dt>ITEMS GRADED</dt>
              <dd>{graded}</dd>
            </div>
            <div className="flex justify-between">
              <dt>COVER INTEGRITY</dt>
              <dd>{cover}/5</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm">
            {passed
              ? "Clean work. Missed items are filed in your Debrief Vault and will resurface on schedule."
              : "Below the 80% threshold. Run the checkpoint again when you're ready — no penalty."}
          </p>
        </div>
        <Link to="/dashboard" className="hud mt-4 rounded-sm bg-primary py-3.5 text-center text-xs text-primary-foreground">
          RETURN TO MAP
        </Link>
      </div>
    );
  }

  if (!step) {
    return (
      <div className="topo mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-4 px-5">
        <p className="hud text-center text-xs text-muted-foreground">
          NOTHING DUE. YOUR VAULT IS CLEAR.
        </p>
        <Link to="/dashboard" className="hud rounded-sm border border-border px-5 py-3 text-[10px]">
          RETURN TO MAP
        </Link>
      </div>
    );
  }

  return (
    <div className="topo mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
      <header className="sticky top-0 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate({ to: "/dashboard" })} aria-label="Abort session">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="min-w-0">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round((index / total) * 100)}%` }}
            />
          </div>
        </div>
        <span className="hud flex items-center gap-1 text-[11px] text-destructive">
          <ShieldAlert className="h-3.5 w-3.5" />
          {cover}
        </span>
      </header>

      <main className="flex-1 px-4 pb-8 pt-4">
        <p className="hud text-[10px] text-secondary">
          {stepLabel(step.kind)} · {index + 1}/{total}
        </p>
        <div className="mt-4">
          <StepRenderer key={index} step={step} locale={locale} onDone={handleDone} />
        </div>
      </main>
    </div>
  );
}
