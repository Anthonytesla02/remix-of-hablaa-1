import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Turn = z.object({
  role: z.enum(["user", "character"]),
  text: z.string().max(600),
});

const SimInput = z.object({
  language: z.string().min(2).max(40),
  setting: z.string().min(2).max(60),
  character: z.string().min(2).max(60),
  level: z.string().min(1).max(40).default("absolute beginner"),
  history: z.array(Turn).max(40).default([]),
  userText: z.string().max(600).default(""),
});

export type SimReply = {
  reply: string;
  reply_translation: string;
  stage_direction: string;
  suggestions: { target: string; translation: string }[];
  feedback: { verdict: "good" | "understandable" | "unclear"; note: string } | null;
  ended: boolean;
};

const FALLBACK: SimReply = {
  reply: "…",
  reply_translation: "The line dropped. Try again.",
  stage_direction: "Connection unstable.",
  suggestions: [],
  feedback: null,
  ended: false,
};

/** One turn of an immersive role-play conversation in the target language. */
export const simulateTurn = createServerFn({ method: "POST" })
  .inputValidator((data) => SimInput.parse(data))
  .handler(async ({ data }): Promise<SimReply> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return FALLBACK;

    const system = `You role-play a realistic ${data.character} in this setting: ${data.setting}.
You speak ONLY ${data.language}, naturally but simply, calibrated for a ${data.level} learner.
Keep every line to 1-2 short sentences. Stay in character, react to what the learner actually said,
ask follow-up questions, and let the conversation progress like a real interaction
(greeting -> the transaction/small talk -> a natural close).
The learner may also ask YOU questions — answer them in character.

Reply with ONLY JSON matching:
{"reply":string,"reply_translation":string,"stage_direction":string,
 "suggestions":[{"target":string,"translation":string}],
 "feedback":{"verdict":"good"|"understandable"|"unclear","note":string} | null,
 "ended":boolean}

Rules:
- "reply" = your next line, in ${data.language} only. "reply_translation" = English.
- "stage_direction" = one short English sentence of scene detail (what is happening around them).
- "suggestions" = 3 SHORT things the learner could say next in ${data.language}, each with an English translation. Vary them: at least one should be a question the learner asks you.
- "feedback" = null on the opening line; otherwise a one-sentence English coaching note on the learner's last message (grammar/word choice/naturalness). Be encouraging and specific.
- "ended" = true only when the interaction has reached a natural goodbye.`;

    const convo = data.history.map((t) => ({
      role: t.role === "user" ? ("user" as const) : ("assistant" as const),
      content: t.text,
    }));
    if (data.userText.trim()) convo.push({ role: "user" as const, content: data.userText.trim() });

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
            ...(convo.length === 0
              ? [
                  {
                    role: "user" as const,
                    content: "Open the scene: greet the learner in character. Return the json.",
                  },
                ]
              : convo),
          ],
        }),
      });
      if (!res.ok) return FALLBACK;
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) return FALLBACK;
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<SimReply>;
      return {
        ...FALLBACK,
        ...parsed,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
        ended: Boolean(parsed.ended),
      };
    } catch {
      return FALLBACK;
    }
  });
