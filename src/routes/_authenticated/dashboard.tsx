import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Lock, Stamp as StampIcon, CheckCircle2, Target } from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { arcTitle, langById, missionDays, onboarding } from "@/lib/content";
import { useApp } from "@/lib/store";
import { dueCards } from "@/lib/srs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Case File Map — Operation Lingua" },
      {
        name: "description",
        content: "Your mission arc map, daily quests, streak and review queue for language training.",
      },
      { property: "og:title", content: "Case File Map — Operation Lingua" },
      { property: "og:description", content: "Mission arcs, daily quests and spaced review at a glance." },
    ],
  }),
  component: () => (
    <Hydrated>
      <DashboardPage />
    </Hydrated>
  ),
});

function DashboardPage() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const completedDays = useApp((s) => s.completedDays);
  const cards = useApp((s) => s.cards);
  const quests = useApp((s) => s.quests);
  const registerLogin = useApp((s) => s.registerLogin);

  useEffect(() => {
    if (!profile) void navigate({ to: "/" });
    else registerLogin();
  }, [profile, navigate, registerLogin]);

  if (!profile) return null;

  const lang = langById(profile.langId);
  const tier = onboarding.daily_commitment_tiers.find((t) => t.id === profile.tierId);
  const days = missionDays(profile.langId);
  const due = dueCards(cards, profile.langId, 999).length;
  const nextIdx = days.findIndex((d) => !completedDays.includes(d.key));
  const activeIdx = nextIdx === -1 ? days.length - 1 : nextIdx;

  return (
    <AppFrame>
      <section className="paper-card p-4">
        <p className="hud text-[10px] text-destructive">TODAY'S ORDERS</p>
        <h1 className="hud mt-1 text-lg leading-tight">
          {lang?.flag_emoji} {days[activeIdx]?.day.theme ?? "ARC COMPLETE"}
        </h1>
        <p className="mt-2 text-sm">
          {days[activeIdx]
            ? days[activeIdx]!.day.learning_objectives.slice(0, 2).join(" · ")
            : "All authored mission days for this language are complete. Keep your vault clear while the next arc is declassified."}
        </p>
        <div className="hud mt-3 flex items-center gap-3 text-[10px] opacity-70">
          <span>{tier?.label.toUpperCase()} · {tier?.minutes} MIN</span>
          <span>{due} DUE IN VAULT</span>
        </div>
        {days[activeIdx] && (
          <Link
            to="/session"
            search={{ day: days[activeIdx]!.key, mode: "mission" }}
            className="hud mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-background py-3 text-xs text-primary"
          >
            <Target className="h-4 w-4" /> START MISSION
          </Link>
        )}
      </section>

      {due > 0 && (
        <Link
          to="/session"
          search={{ day: days[activeIdx]?.key ?? days[0]?.key ?? "", mode: "review" }}
          className="hud mt-3 flex w-full items-center justify-between rounded-sm border border-secondary/50 bg-secondary/10 px-4 py-3 text-[10px] text-secondary"
        >
          <span>DEBRIEF VAULT · {due} ITEMS DUE</span>
          <span>RUN REVIEW →</span>
        </Link>
      )}

      <section className="mt-6">
        <p className="hud text-[10px] text-muted-foreground">DAILY QUESTS</p>
        <ul className="mt-2 space-y-2">
          {quests.list.map((q) => (
            <li
              key={q.id}
              className="flex items-center justify-between rounded-sm border border-border bg-card px-3 py-2.5"
            >
              <span className={`text-xs ${q.done ? "line-through opacity-50" : ""}`}>{q.label}</span>
              <span className="hud text-[10px] text-primary">+{q.reward_xp}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <p className="hud text-[10px] text-muted-foreground">CASE FILE MAP</p>
        <ol className="mt-3 space-y-2">
          {days.map((d, i) => {
            const done = completedDays.includes(d.key);
            const locked = i > activeIdx;
            return (
              <li key={d.key}>
                <Link
                  to="/session"
                  search={{ day: d.key, mode: done ? "checkpoint" : "mission" }}
                  disabled={locked}
                  className={`flex items-center gap-3 rounded-sm border px-3 py-3 ${
                    locked
                      ? "pointer-events-none border-border/50 bg-card/40 opacity-50"
                      : done
                        ? "border-primary/40 bg-card"
                        : "border-secondary/50 bg-card"
                  }`}
                >
                  <span className="shrink-0">
                    {locked ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : done ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <StampIcon className="h-4 w-4 text-secondary" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="hud block text-[9px] text-muted-foreground">
                      {arcTitle(d.arcId)} · DAY {d.day.day_number}
                    </span>
                    <span className="block truncate text-sm">{d.day.theme}</span>
                  </span>
                  {done && <span className="hud text-[9px] text-primary">CHECKPOINT</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </AppFrame>
  );
}
