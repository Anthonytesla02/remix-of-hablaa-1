import { Link, useRouterState } from "@tanstack/react-router";
import { useHydrated } from "@tanstack/react-router";
import { Flame, Map, Archive, Radio, Trophy, Package, IdCard } from "lucide-react";
import type { ReactNode } from "react";
import { HandlerAvatar } from "@/components/Handler";
import { useApp, useClearance } from "@/lib/store";

const TABS = [
  { to: "/dashboard", label: "Map", icon: Map },
  { to: "/simulate", label: "Sim", icon: Radio },
  { to: "/vault", label: "Vault", icon: Archive },
  { to: "/league", label: "League", icon: Trophy },
  { to: "/shop", label: "Supply", icon: Package },
  { to: "/profile", label: "Dossier", icon: IdCard },
] as const;

export function HudBar() {
  const xp = useApp((s) => s.xp);
  const credits = useApp((s) => s.credits);
  const streak = useApp((s) => s.streak);
  const clearance = useClearance();

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <p className="hud truncate text-[10px] text-muted-foreground">
            CLEARANCE {clearance.current.ilr_equivalent} · {clearance.current.codename}
          </p>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-secondary transition-all"
              style={{ width: `${Math.round(clearance.progress * 100)}%` }}
            />
          </div>
        </div>
        <div className="hud flex shrink-0 items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-primary">
            <Flame className="h-3.5 w-3.5" />
            {streak}
          </span>
          <span className="text-primary">{xp} XP</span>
          <span className="text-secondary">{credits} IC</span>
        </div>
      </div>
    </header>
  );
}

export function TabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 z-20 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="grid grid-cols-6">
        {TABS.map((t) => {
          const active = pathname === t.to;
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                className={`flex flex-col items-center gap-1 py-2.5 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="hud text-[9px]">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppFrame({ children, tabs = true }: { children: ReactNode; tabs?: boolean }) {
  return (
    <div className="topo mx-auto flex min-h-[100dvh] w-full max-w-md flex-col">
      {tabs && <HudBar />}
      <main className="flex-1 px-4 pb-6 pt-4">{children}</main>
      {tabs && <TabBar />}
      <HandlerAvatar offset={tabs} />
    </div>
  );
}

/** Gate client-persisted state so SSR and first paint agree. */
export function Hydrated({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated)
    return (
      <div className="topo flex min-h-[100dvh] items-center justify-center">
        <p className="hud animate-pulse text-xs text-muted-foreground">ESTABLISHING SECURE LINK…</p>
      </div>
    );
  return <>{children}</>;
}
