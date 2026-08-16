import { useEffect, useState } from "react";
import { X, VolumeX, Volume2 } from "lucide-react";
import avatar from "@/assets/handler-avatar.png";
import { useHandler, type Mood } from "@/lib/handler-bus";

const MOOD_RING: Record<Mood, string> = {
  hype: "border-primary ring-2 ring-primary/40",
  proud: "border-primary",
  nudge: "border-secondary",
  tough: "border-destructive",
  idle: "border-border",
};

const MOOD_TEXT: Record<Mood, string> = {
  hype: "text-primary",
  proud: "text-primary",
  nudge: "text-secondary",
  tough: "text-destructive",
  idle: "text-foreground",
};

/** Floating handler avatar that pops in with reactions and sentiment. */
export function HandlerAvatar({ offset = true }: { offset?: boolean }) {
  const msg = useHandler((s) => s.msg);
  const muted = useHandler((s) => s.muted);
  const dismiss = useHandler((s) => s.dismiss);
  const toggleMute = useHandler((s) => s.toggleMute);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!msg) {
      setOpen(false);
      return;
    }
    setOpen(true);
    const t = setTimeout(() => dismiss(), 6500);
    return () => clearTimeout(t);
  }, [msg, dismiss]);

  const mood: Mood = msg?.mood ?? "idle";

  return (
    <div
      className={`pointer-events-none fixed right-3 z-30 flex max-w-[min(20rem,calc(100vw-1.5rem))] flex-col items-end gap-2 ${
        offset ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]" : "bottom-4"
      }`}
    >
      {open && msg && (
        <div
          key={msg.id}
          className="handler-pop pointer-events-auto relative rounded-sm border border-border bg-card/95 px-3 py-2.5 pr-8 shadow-lg backdrop-blur"
        >
          <p className="hud text-[8px] text-muted-foreground">HANDLER</p>
          <p className={`mt-1 text-[12px] leading-snug ${MOOD_TEXT[mood]}`}>{msg.text}</p>
          <button
            onClick={dismiss}
            aria-label="Dismiss handler"
            className="absolute right-1.5 top-1.5 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-1.5">
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute handler" : "Mute handler"}
          className="rounded-full border border-border bg-card/90 p-1.5 text-muted-foreground backdrop-blur"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => (msg ? dismiss() : useHandler.getState().push("Standing by. Tap a checkpoint and I'll call the shots.", "idle"))}
          aria-label="Handler"
          className={`handler-idle grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 bg-card/90 backdrop-blur ${MOOD_RING[mood]}`}
        >
          <img src={avatar} alt="Your handler" width={512} height={512} loading="lazy" className="h-11 w-11 object-contain" />
        </button>
      </div>
    </div>
  );
}
