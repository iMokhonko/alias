import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"
import { i18n } from "@/i18n"
import {
  OPENAI_MODEL,
  TARGET_WORD_COUNT,
  type Difficulty,
} from "./constants"

const wordListSchema = z.object({
  words: z.array(z.string()),
})

export function createOpenAIClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  })
}

function normalizeWords(raw: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of raw) {
    const t = w.trim().replace(/\s+/g, " ")
    if (t.length < 2 || t.length > 48) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

function difficultyInstructions(difficulty: Difficulty, topicDescription?: string): string {
  const { t } = i18n.global
  const base = t("openai.baseInstructions")

  const tier = (() => {
    switch (difficulty) {
      case "easy":
        return t("openai.tierEasy")
      case "medium":
        return t("openai.tierMedium")
      case "hard":
        return t("openai.tierHard")
      case "mixed":
        return t("openai.tierMixed")
      case "custom":
        return t("openai.tierCustom", {
          topic: topicDescription ?? t("openai.fallbackTopic"),
        })
      default:
        return ""
    }
  })()

  return `${base}\n${tier}`
}

export async function generateWordPool(
  client: OpenAI,
  params: {
    difficulty: Difficulty
    topicDescription?: string
  },
): Promise<string[]> {
  const instructions = difficultyInstructions(
    params.difficulty,
    params.topicDescription,
  )

  const { t } = i18n.global
  const user = [
    t("openai.userJsonRequest", { count: TARGET_WORD_COUNT }),
    t("openai.userEachLineUkrainian"),
    params.difficulty === "custom" && params.topicDescription
      ? t("openai.userTopicStrict", { topic: params.topicDescription })
      : null,
  ]
    .filter(Boolean)
    .join("\n")

  const response = await client.responses.parse({
    model: OPENAI_MODEL,
    instructions,
    input: user,
    text: {
      format: zodTextFormat(wordListSchema, "word_list"),
    },
    max_output_tokens: 16000,
  })

  const parsed = response.output_parsed
  if (!parsed?.words?.length) {
    throw new Error(t("openai.errNoWords"))
  }

  const words = normalizeWords(parsed.words)
  if (words.length < 40) {
    throw new Error(t("openai.errTooFewWords"))
  }

  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[words[i], words[j]] = [words[j]!, words[i]!]
  }

  return words
}
