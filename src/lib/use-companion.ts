import { useMemo } from "react";
import {
  bondFor,
  characterById,
  charactersFor,
  personalityById,
  type CompanionBrief,
} from "@/lib/companions";
import { useApp } from "@/lib/store";

/**
 * Resolves the stored companion config into everything the UI and the server
 * calls need: the character, the personality, the bond stage and the memory of
 * what this learner keeps getting wrong.
 */
export function useCompanion() {
  const config = useApp((s) => s.companion);
  const bondPoints = useApp((s) => s.bondPoints);
  const mistakeMemory = useApp((s) => s.mistakeMemory);
  const langId = useApp((s) => s.profile?.langId ?? "spanish");

  return useMemo(() => {
    const personality = personalityById(config?.personalityId);
    const character =
      characterById(config?.characterId) ?? charactersFor(langId)[0] ?? null;
    const bond = bondFor(bondPoints);

    const memory = Object.values(mistakeMemory)
      .filter((m) => m.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((m) => `${m.tag} (${m.count}×) — ${m.detail}`);

    // Higher bond quietly raises immersion even before the learner touches a dial.
    const slang = Math.min(3, (config?.slang ?? 1) + (bond.current.level >= 3 ? 1 : 0));
    const noTranslate = (config?.noTranslate ?? false) || bond.current.level >= 4;

    const brief: CompanionBrief = {
      personality: personality.behaviour,
      characterName: character?.name ?? "",
      characterBio: character ? `${character.age}, ${character.region}. ${character.bio}` : "",
      dialect: character?.dialect ?? "",
      slang,
      roast: config?.roast ?? 1,
      bond: bond.current.label,
      localMode: config?.localMode ?? true,
      noTranslate,
      memory,
    };

    return { config, personality, character, bond, bondPoints, memory, brief, ready: Boolean(config) };
  }, [config, bondPoints, mistakeMemory, langId]);
}
