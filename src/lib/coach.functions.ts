import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CoachInput = z.object({
  language: z.string().min(2).max(40),
  setting: z.string().max(300).default(""),
  characterLine: z.string().max(600).default(""),
  userText: z.string().max(600),
  options: z.array(z.string().max(200)).max(6).default([]),
});

export type CoachVerdict = {
  correct: boolean;
  why: string;
  fix: string;
  better: string;
  better_translation: string;
};

const OK: CoachVerdict = {
  correct: true,
  why: "",
  fix: "",
  better: "",
  better_translation: "",
};

/** Checks a learner's line against the offered options before the scene advances. */
export const checkUtterance = createServerFn({ method: "POST" })
  .inputValidator((data) => CoachInput.parse(data))
  .handler(async ({ data }): Promise<CoachVerdict> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return OK;

    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N} ]/gu, "")
        .trim();

    // Exact match with an offered option is always accepted, no model call.
    if (data.options.some((o) => norm(o) === norm(data.userText))) return OK;

    const system = `You are a strict but kind ${data.language} tutor inside a role-play scene.
Scene: ${data.setting}
The character just said: "${data.characterLine}"
Three acceptable things the learner could say were offered:
${data.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}

The learner said: "${data.userText}"

Decide if the learner's line is an acceptable, understandable, grammatical reply in ${data.language}
for this moment. It does NOT have to match the offered options word-for-word — a natural
equivalent is correct. It is INCORRECT if it is in the wrong language, ungrammatical enough to
confuse, or irrelevant to what was just said.

Reply with ONLY JSON:
{"correct":boolean,"why":string,"fix":string,"better":string,"better_translation":string}
- "why" = one or two short English sentences explaining exactly what is wrong. Empty if correct.
- "fix" = one short English sentence on how to fix it. Empty if correct.
- "better" = the correct thing to say next time, in ${data.language} only. Empty if correct.
- "better_translation" = English for "better". Empty if correct.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: "Judge the learner's line. Return the json." },
          ],
        }),
      });
      if (!res.ok) return OK;
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) return OK;
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<CoachVerdict>;
      return { ...OK, ...parsed, correct: Boolean(parsed.correct) };
    } catch {
      return OK;
    }
  });
