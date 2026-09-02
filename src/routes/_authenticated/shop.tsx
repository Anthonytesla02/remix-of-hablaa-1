import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppFrame, Hydrated } from "@/components/AppFrame";
import { gamification } from "@/lib/content";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/shop")({
  head: () => ({
    meta: [
      { title: "Shop — Habla" },
      {
        name: "description",
        content: "Spend Coins on streak freezes, hint refills and tutor hints.",
      },
      { property: "og:title", content: "Shop — Habla" },
      { property: "og:description", content: "Trade Coins for mission support items." },
    ],
  }),
  component: () => (
    <Hydrated>
      <ShopPage />
    </Hydrated>
  ),
});

type Entry = { item: string; label: string; cost?: number; cost_range?: number[] };

function ShopPage() {
  const credits = useApp((s) => s.credits);
  const spend = useApp((s) => s.spend);

  const catalog = gamification.currency.spend_catalog as Entry[];

  return (
    <AppFrame>
      <h1 className="hud text-lg">SUPPLY DEPOT</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Balance: <span className="text-secondary">{credits} Coins</span> · earn 1 IC per 20
        XP, plus daily check-in and streak milestones.
      </p>

      <ul className="mt-5 space-y-2">
        {catalog.map((c) => {
          const cost = c.cost ?? c.cost_range?.[0] ?? 0;
          return (
            <li
              key={c.item}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-border bg-card px-3 py-3"
            >
              <span className="min-w-0">
                <span className="hud block text-[10px]">{c.label}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{cost} IC</span>
              </span>
              <button
                onClick={() => {
                  if (spend(cost)) toast.success(`${c.label} acquired`);
                  else toast.error("Insufficient Coins");
                }}
                disabled={credits < cost}
                className="hud shrink-0 rounded-sm bg-primary px-4 py-2 text-[10px] text-primary-foreground disabled:opacity-40"
              >
                BUY
              </button>
            </li>
          );
        })}
      </ul>
    </AppFrame>
  );
}
