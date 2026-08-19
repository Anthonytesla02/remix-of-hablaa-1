import { useEffect, useMemo } from "react";
import { CheckCircle2 } from "lucide-react";
import { sfx } from "@/lib/sfx";

/**
 * Full-screen completion celebration. Plays a sound, stamps a seal, throws
 * sparks, then calls `onDone` so the app can move straight into the next task.
 */
export function Completion({
  title = "OBJECTIVE COMPLETE",
  subtitle,
  tone = "complete",
  duration = 1800,
  onDone,
}: {
  title?: string;
  subtitle?: string;
  tone?: "complete" | "levelup";
  duration?: number;
  onDone?: () => void;
}) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return {
          dx: `${Math.cos(a) * 120}px`,
          dy: `${Math.sin(a) * 120}px`,
          delay: `${(i % 5) * 40}ms`,
        };
      }),
    [],
  );

  useEffect(() => {
    sfx(tone);
    if (!onDone) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/85 backdrop-blur-sm">
      <div className="relative grid place-items-center">
        <span className="burst-ring absolute h-28 w-28 rounded-full border-2 border-primary" />
        <span
          className="burst-ring absolute h-28 w-28 rounded-full border border-secondary"
          style={{ animationDelay: "140ms" }}
        />
        {sparks.map((s, i) => (
          <span
            key={i}
            className="spark-fly absolute h-1.5 w-1.5 rounded-full bg-primary"
            style={
              {
                "--dx": s.dx,
                "--dy": s.dy,
                animationDelay: s.delay,
              } as React.CSSProperties
            }
          />
        ))}
        <div className="seal-in relative grid place-items-center gap-2 rounded-sm border-2 border-primary bg-card/95 px-6 py-5 text-center shadow-xl">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <p className="hud text-xs text-primary">{title}</p>
          {subtitle && <p className="hud text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
