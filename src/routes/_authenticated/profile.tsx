import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { gamification, langById, onboarding } from "@/lib/content";
import { useApp, useClearance } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Operative Dossier — Operation Lingua" },
      {
        name: "description",
        content: "Your clearance record, badges, streak history and training settings.",
      },
      { property: "og:title", content: "Operative Dossier — Operation Lingua" },
      { property: "og:description", content: "Clearance level, badges and session history." },
    ],
  }),
  component: () => (
    <Hydrated>
      <ProfilePage />
    </Hydrated>
  ),
});

function ProfilePage() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const badges = useApp((s) => s.badges);
  const history = useApp((s) => s.history);
  const streak = useApp((s) => s.streak);
  const longest = useApp((s) => s.longestStreak);
  const settings = useApp((s) => s.settings);
  const setSetting = useApp((s) => s.setSetting);
  const resetAll = useApp((s) => s.resetAll);
  const clearance = useClearance();

  useEffect(() => {
    if (!profile) void navigate({ to: "/" });
  }, [profile, navigate]);
  if (!profile) return null;

  const lang = langById(profile.langId);
  const persona = onboarding.operational_personas.find((p) => p.id === profile.personaId);
  const allBadges = gamification.badges as { id: string; label: string; unlock_condition: string }[];

  return (
    <AppFrame>
      <section className="paper-card p-4">
        <p className="hud text-[10px] text-destructive">OPERATIVE DOSSIER</p>
        <h1 className="hud mt-1 text-lg">{profile.callsign.toUpperCase()}</h1>
        <dl className="hud mt-3 space-y-1 text-[10px]">
          <div className="flex justify-between">
            <dt>LANGUAGE</dt>
            <dd>
              {lang?.flag_emoji} {lang?.label}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>PERSONA</dt>
            <dd>{persona?.label}</dd>
          </div>
          <div className="flex justify-between">
            <dt>CLEARANCE</dt>
            <dd>
              {clearance.current.ilr_equivalent} · {clearance.current.codename}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>STREAK</dt>
            <dd>
              {streak} DAYS (BEST {longest})
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs">{clearance.current.can_do_summary}</p>
      </section>

      <section className="mt-6">
        <p className="hud text-[10px] text-muted-foreground">
          COMMENDATIONS · {badges.length}/{allBadges.length}
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {allBadges.map((b) => {
            const earned = badges.includes(b.id);
            return (
              <li
                key={b.id}
                className={`rounded-sm border px-3 py-2.5 ${
                  earned ? "border-primary/60 bg-primary/10" : "border-border bg-card opacity-50"
                }`}
              >
                <span className="hud block text-[9px]">{b.label}</span>
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  {b.unlock_condition}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6">
        <p className="hud text-[10px] text-muted-foreground">SETTINGS</p>
        <div className="mt-2 space-y-3 rounded-sm border border-border bg-card p-3">
          <label className="block">
            <span className="hud text-[10px]">TTS SPEED · {settings.rate.toFixed(2)}×</span>
            <input
              type="range"
              min={0.6}
              max={1.3}
              step={0.05}
              value={settings.rate}
              onChange={(e) => setSetting("rate", Number(e.target.value))}
              className="mt-2 w-full accent-[oklch(0.762_0.128_72)]"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="hud text-[10px]">TARGET-LANGUAGE CAPTIONS</span>
            <input
              type="checkbox"
              checked={settings.captions}
              onChange={(e) => setSetting("captions", e.target.checked)}
              className="h-5 w-5 accent-[oklch(0.673_0.076_213)]"
            />
          </label>
        </div>
      </section>

      <section className="mt-6">
        <p className="hud text-[10px] text-muted-foreground">SESSION LOG</p>
        <ul className="mt-2 space-y-1.5">
          {history.map((h, i) => (
            <li
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-sm border border-border bg-card px-3 py-2"
            >
              <span className="hud truncate text-[10px]">
                {new Date(h.date).toLocaleDateString()} · {Math.round(h.accuracy * 100)}% ·{" "}
                {h.items} ITEMS
              </span>
              <span className="hud shrink-0 text-[10px] text-primary">+{h.xp} XP</span>
            </li>
          ))}
          {history.length === 0 && (
            <li className="text-xs text-muted-foreground">No sessions logged yet.</li>
          )}
        </ul>
      </section>

      <button
        onClick={() => {
          if (confirm("Burn this dossier? All local progress is erased.")) {
            resetAll();
            void navigate({ to: "/" });
          }
        }}
        className="hud mt-8 w-full rounded-sm border border-destructive/60 py-3 text-[10px] text-destructive"
      >
        BURN DOSSIER (RESET)
      </button>
    </AppFrame>
  );
}
