export const OPENAI_API_KEY_STORAGE = "alias_openai_api_key"

export const DEFAULT_WORDS_TO_WIN = 25
export const DEFAULT_TURN_SECONDS = 60
export const MIN_TEAMS = 2
export const TARGET_WORD_COUNT = 280

export type Difficulty = "easy" | "medium" | "hard" | "mixed" | "custom"

export const PRESET_TOPIC_IDS = [
  "marvel",
  "got",
  "programming",
  "science",
  "movies",
  "sports",
  "music",
  "history",
  "geography",
  "food",
] as const

export type PresetTopicId = (typeof PRESET_TOPIC_IDS)[number]

export const OPENAI_MODEL = "gpt-4o-mini"
