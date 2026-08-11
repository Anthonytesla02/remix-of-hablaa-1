import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { speak, stopSpeaking, ttsSupported } from "@/lib/speech";
import { useApp } from "@/lib/store";

export function useSpeaker(locale: string) {
  const rate = useApp((s) => s.settings.rate);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopSpeaking();
    };
  }, []);
  return useCallback(
    (text: string, override?: number) => speak(text, locale, override ?? rate),
    [locale, rate],
  );
}

export function PlayButton({
  text,
  locale,
  rate,
  label = "PLAY TRANSMISSION",
  autoPlay = false,
}: {
  text: string;
  locale: string;
  rate?: number;
  label?: string;
  autoPlay?: boolean;
}) {
  const say = useSpeaker(locale);
  const [playing, setPlaying] = useState(false);

  const play = useCallback(async () => {
    setPlaying(true);
    await say(text, rate);
    setPlaying(false);
  }, [say, text, rate]);

  useEffect(() => {
    if (autoPlay && ttsSupported()) void play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <button
      type="button"
      onClick={play}
      className={`flex w-full items-center justify-center gap-2 rounded-sm border border-secondary/60 px-4 py-3 text-secondary transition-colors ${
        playing ? "mic-live bg-secondary/10" : "bg-secondary/5 active:bg-secondary/15"
      }`}
    >
      <Volume2 className="h-4 w-4" />
      <span className="hud text-[10px]">{playing ? "TRANSMITTING…" : label}</span>
    </button>
  );
}
