import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { PlayButton } from "@/components/Audio";
import { Redaction } from "@/components/Redaction";
import { bcp47 } from "@/lib/content";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Debrief Vault — Operation Lingua" },
      {
        name: "description",
        content: "Every item you've drilled, scheduled by a modified SM-2 spaced repetition engine.",
      },
      { property: "og:title", content: "Debrief Vault — Operation Lingua" },
      { property: "og:description", content: "Spaced-repetition review queue for your language training." },
    ],
  }),
  component: () => (
    <Hydrated>
      <VaultPage />
    </Hydrated>
  ),
});

function VaultPage() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const cards = useApp((s) => s.cards);

  useEffect(() => {
    if (!profile) void navigate({ to: "/" });
  }, [profile, navigate]);
  if (!profile) return null;

  const locale = bcp47(profile.langId);
  const all = Object.values(cards)
    .filter((c) => c.lang === profile.langId)
    .sort((a, b) => a.dueAt - b.dueAt);
  const due = all.filter((c) => c.dueAt <= Date.now());

  return (
    <AppFrame>
      <h1 className="hud text-lg">DEBRIEF VAULT</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        {all.length} items filed · {due.length} due now · modified SM-2 scheduling
      </p>

      {due.length > 0 && (
        <Link
          to="/session"
          search={{ day: "", mode: "review" }}
          className="hud mt-4 block rounded-sm bg-primary py-3.5 text-center text-xs text-primary-foreground"
        >
          RUN {due.length} REVIEWS
        </Link>
      )}

      <ul className="mt-5 space-y-2">
        {all.map((c) => {
          const dueIn = Math.round((c.dueAt - Date.now()) / 86400000);
          return (
            <li key={c.id} className="rounded-sm border border-border bg-card p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <p className="min-w-0 text-base">{c.target}</p>
                <span
                  className={`hud shrink-0 text-[9px] ${
                    c.dueAt <= Date.now() ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {c.dueAt <= Date.now() ? "DUE" : `${dueIn}D`}
                </span>
              </div>
              <div className="mt-2">
                <Redaction text={c.translation} />
              </div>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <PlayButton text={c.target} locale={locale} label="PLAY" />
                <span className="hud shrink-0 text-[9px] text-muted-foreground">
                  EF {c.ease.toFixed(2)} · {c.lapses}L
                </span>
              </div>
            </li>
          );
        })}
        {all.length === 0 && (
          <li className="paper-card p-4 text-sm">
            Nothing filed yet. Complete a mission day and every item you touch lands here.
          </li>
        )}
      </ul>
    </AppFrame>
  );
}
