import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Lock, Star, Check, Target, Brain, Crown } from "lucide-react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { arcTitle, langById, missionDays, onboarding } from "@/lib/content";
import { handlerSay } from "@/lib/handler-bus";
import { useApp } from "@/lib/store";
import { dueCards } from "@/lib/srs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Case File Map — Operation Lingua" },
      {
        name: "description",
        content:
          "A winding checkpoint map of your mission arcs: run the next mission, or tap a cleared checkpoint to drill its vocabulary in the vault.",
      },
      { property: "og:title", content: "Case File Map — Operation Lingua" },
      {
        property: "og:description",
        content: "Mission arcs, daily quests and spaced review on one progress map.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

  useEffect(() => {
    if (!profile) return;
    const t = setTimeout(
      () =>
        handlerSay(
          `${profile.callsign}, the glowing checkpoint is your next run. Cleared ones open a recall drill.`,
          "nudge",
        ),
      900,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.callsign]);

  if (!profile) return null;

  const lang = langById(profile.langId);
  const tier = onboarding.daily_commitment_tiers.find((t) => t.id === profile.tierId);
  const days = missionDays(profile.langId);
  const due = dueCards(cards, profile.langId, 999).length;
  const nextIdx = days.findIndex((d) => !completedDays.includes(d.key));
  const activeIdx = nextIdx === -1 ? days.length - 1 : nextIdx;

  // Duolingo-style winding path: horizontal offsets cycle left → centre → right.
  const OFFSETS = [0, 46, 66, 46, 0, -46, -66, -46];

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
          <span>
            {tier?.label.toUpperCase()} · {tier?.minutes} MIN
          </span>
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
          to="/vault"
          search={{ day: "due" }}
          className="hud mt-3 flex w-full items-center justify-between rounded-sm border border-secondary/50 bg-secondary/10 px-4 py-3 text-[10px] text-secondary"
        >
          <span>DEBRIEF VAULT · {due} ITEMS DUE</span>
          <span>RUN RECALL →</span>
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

      <section className="mt-7">
        <p className="hud text-[10px] text-muted-foreground">CASE FILE MAP</p>

        <div className="relative mt-4">
          {days.map((d, i) => {
            const done = completedDays.includes(d.key);
            const locked = i > activeIdx;
            const active = i === activeIdx && !done;
            const offset = OFFSETS[i % OFFSETS.length]!;
            const nextOffset = OFFSETS[(i + 1) % OFFSETS.length]!;
            const showArc = i === 0 || days[i - 1]!.arcId !== d.arcId;

            return (
              <div key={d.key}>
                {showArc && (
                  <p className="hud mb-3 mt-1 text-center text-[9px] text-secondary">
                    — {arcTitle(d.arcId).toUpperCase()} —
                  </p>
                )}
                <div className="relative flex flex-col items-center">
                  <Link
                    to={done ? "/vault" : "/session"}
                    search={done ? { day: d.key } : { day: d.key, mode: "mission" }}
                    disabled={locked}
                    style={{ transform: `translateX(${offset}px)` }}
                    aria-label={`${d.day.theme} — ${locked ? "locked" : done ? "cleared, open recall drill" : "next mission"}`}
                    className={`relative z-10 grid h-16 w-16 place-items-center rounded-full border-2 transition-transform active:scale-95 ${
                      locked
                        ? "pointer-events-none border-border/60 bg-card/40 text-muted-foreground"
                        : done
                          ? "border-primary bg-primary/15 text-primary"
                          : "mic-live border-secondary bg-secondary/20 text-secondary"
                    }`}
                  >
                    {locked ? (
                      <Lock className="h-5 w-5" />
                    ) : done ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Star className="h-6 w-6" />
                    )}
                    <span className="hud absolute -bottom-1 rounded-full border border-border bg-background px-1.5 text-[8px] text-muted-foreground">
                      {d.day.day_number}
                    </span>
                  </Link>

                  <p
                    style={{ transform: `translateX(${offset}px)` }}
                    className={`mt-3 max-w-[9rem] text-center text-[11px] leading-snug ${
                      locked ? "text-muted-foreground/60" : active ? "text-secondary" : "text-foreground"
                    }`}
                  >
                    {d.day.theme}
                  </p>
                  {done && (
                    <span
                      style={{ transform: `translateX(${offset}px)` }}
                      className="hud mt-1 flex items-center gap-1 text-[8px] text-primary"
                    >
                      <Brain className="h-3 w-3" /> RECALL DRILL
                    </span>
                  )}

                  {i < days.length - 1 && (
                    <span
                      aria-hidden
                      className={`my-3 block h-8 w-0.5 ${locked ? "bg-border/50" : "bg-border"}`}
                      style={{ transform: `translateX(${(offset + nextOffset) / 2}px) rotate(${(nextOffset - offset) / 6}deg)` }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          <div className="mt-6 flex flex-col items-center gap-2">
            <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground">
              <Crown className="h-6 w-6" />
            </span>
            <p className="hud text-[9px] text-muted-foreground">NEXT ARC — CLASSIFIED</p>
          </div>
        </div>
      </section>
    </AppFrame>
  );
}
