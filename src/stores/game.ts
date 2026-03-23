import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { i18n } from "@/i18n"
import {
  createOpenAIClient,
  generateWordPool,
} from "@/lib/openai"
import {
  DEFAULT_TURN_SECONDS,
  DEFAULT_WORDS_TO_WIN,
  MIN_TEAMS,
  PRESET_TOPIC_IDS,
  type Difficulty,
  type PresetTopicId,
} from "@/lib/constants"

export interface Team {
  id: string
  name: string
  secondsPerTurn: number
  score: number
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function t(key: string, params?: Record<string, unknown>) {
  return i18n.global.t(key, params ?? {})
}

function defaultTeams(): Team[] {
  return [
    { id: uid(), name: t("team.defaultA"), secondsPerTurn: DEFAULT_TURN_SECONDS, score: 0 },
    { id: uid(), name: t("team.defaultB"), secondsPerTurn: DEFAULT_TURN_SECONDS, score: 0 },
  ]
}

function nextTeamNameLetter(index: number) {
  return String.fromCharCode(1040 + index)
}

export type TurnWordOutcome = "guessed" | "skipped"

export interface TurnWordEntry {
  word: string
  outcome: TurnWordOutcome
}

export const useGameStore = defineStore("game", () => {
  const difficulty = ref<Difficulty | null>(null)
  const customPresetId = ref<string | null>(null)
  const customPrompt = ref("")
  const teams = ref<Team[]>(defaultTeams())
  const wordsToWin = ref(DEFAULT_WORDS_TO_WIN)
  const skipPenalty = ref(true)

  const wordPool = ref<string[]>([])
  const wordIndex = ref(0)
  const currentTeamIndex = ref(0)
  const turnGuessedWords = ref<string[]>([])
  const turnSkippedWords = ref<string[]>([])
  /** Words touched this turn in play order (for turn summary UI). */
  const turnWordLog = ref<TurnWordEntry[]>([])
  /** Team score at the start of the current team's turn (turn score delta). */
  const turnBaseScore = ref(0)
  const generationError = ref<string | null>(null)
  const isGenerating = ref(false)
  /** Bumped to ignore stale `runGeneration` results after the user leaves the screen */
  const generationEpoch = ref(0)
  const phase = ref<
    | "idle"
    | "generating"
    | "turn_ready"
    | "playing"
    | "turn_summary"
    | "results"
  >("idle")
  const winnerTeamId = ref<string | null>(null)
  /** Completed turns per team (same order as `teams`), for fair end after words goal. */
  const teamTurnCounts = ref<number[]>([])

  const lastTurnSummary = ref<{
    teamId: string
    teamName: string
    wordLog: TurnWordEntry[]
    score: number
    turnScoreDelta: number
  } | null>(null)

  const currentTeam = computed(() => teams.value[currentTeamIndex.value] ?? null)

  const turnScoreDelta = computed(() => {
    const t = currentTeam.value
    if (!t || phase.value !== "playing") return 0
    return t.score - turnBaseScore.value
  })

  const currentWord = computed(() => {
    if (wordIndex.value >= wordPool.value.length) return null
    return wordPool.value[wordIndex.value] ?? null
  })

  const sortedTeamsByScore = computed(() =>
    [...teams.value].sort((a, b) => b.score - a.score),
  )

  function setDifficulty(d: Difficulty) {
    difficulty.value = d
    if (d !== "custom") {
      customPresetId.value = null
      customPrompt.value = ""
    }
  }

  function setCustomTopic(presetId: string | null, prompt: string) {
    customPresetId.value = presetId
    customPrompt.value = prompt
  }

  function addTeam() {
    teams.value.push({
      id: uid(),
      name: t("team.withLetter", { letter: nextTeamNameLetter(teams.value.length) }),
      secondsPerTurn: DEFAULT_TURN_SECONDS,
      score: 0,
    })
  }

  function removeTeam(id: string) {
    if (teams.value.length <= MIN_TEAMS) return
    const idx = teams.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    teams.value.splice(idx, 1)
    if (currentTeamIndex.value >= teams.value.length) {
      currentTeamIndex.value = teams.value.length - 1
    }
  }

  function syncTurnBaseScore() {
    const t = currentTeam.value
    turnBaseScore.value = t?.score ?? 0
  }

  function resetRoundState() {
    wordIndex.value = 0
    turnGuessedWords.value = []
    turnSkippedWords.value = []
    turnWordLog.value = []
    lastTurnSummary.value = null
    currentTeamIndex.value = 0
    winnerTeamId.value = null
    generationError.value = null
    turnBaseScore.value = 0
    teamTurnCounts.value = teams.value.map(() => 0)
  }

  function resetForNewGame() {
    difficulty.value = null
    customPresetId.value = null
    customPrompt.value = ""
    teams.value = defaultTeams()
    wordsToWin.value = DEFAULT_WORDS_TO_WIN
    skipPenalty.value = true
    wordPool.value = []
    phase.value = "idle"
    resetRoundState()
  }

  function softResetKeepingSetup() {
    teams.value = teams.value.map((t) => ({ ...t, score: 0 }))
    wordPool.value = []
    phase.value = "idle"
    resetRoundState()
  }

  function topicDescriptionForGeneration(): string | undefined {
    if (difficulty.value !== "custom") return undefined
    const free = customPrompt.value.trim()
    if (free) return free
    const id = customPresetId.value
    if (id && (PRESET_TOPIC_IDS as readonly string[]).includes(id)) {
      return t(`topics.${id as PresetTopicId}.promptHint`)
    }
    return undefined
  }

  function cancelGeneration() {
    generationEpoch.value++
    isGenerating.value = false
    if (phase.value === "generating")
      phase.value = "idle"
    generationError.value = null
  }

  async function runGeneration(apiKey: string) {
    const epoch = generationEpoch.value
    if (!difficulty.value) {
      const m = t("errors.selectDifficulty")
      generationError.value = m
      throw new Error(m)
    }
    if (difficulty.value === "custom" && !topicDescriptionForGeneration()) {
      const m = t("errors.selectTopicOrPrompt")
      generationError.value = m
      throw new Error(m)
    }
    if (!apiKey.trim()) {
      const m = t("errors.addApiKey")
      generationError.value = m
      throw new Error(m)
    }
    isGenerating.value = true
    generationError.value = null
    phase.value = "generating"
    wordPool.value = []
    wordIndex.value = 0
    try {
      const client = createOpenAIClient(apiKey)
      const topicDescription = topicDescriptionForGeneration()
      const words = await generateWordPool(client, {
        difficulty: difficulty.value,
        topicDescription,
      })
      if (epoch !== generationEpoch.value)
        return
      wordPool.value = words
      wordIndex.value = 0
      turnGuessedWords.value = []
      turnSkippedWords.value = []
      turnWordLog.value = []
      lastTurnSummary.value = null
      currentTeamIndex.value = 0
      teams.value = teams.value.map((t) => ({ ...t, score: 0 }))
      winnerTeamId.value = null
      teamTurnCounts.value = teams.value.map(() => 0)
      syncTurnBaseScore()
      phase.value = "turn_ready"
    }
    catch (e) {
      if (epoch !== generationEpoch.value)
        return
      const msg = e instanceof Error ? e.message : t("errors.generateFailed")
      generationError.value = msg
      phase.value = "idle"
      throw new Error(msg, { cause: e })
    }
    finally {
      if (epoch === generationEpoch.value)
        isGenerating.value = false
    }
  }

  function anyTeamReachedWordsGoal(): boolean {
    return teams.value.some((t) => t.score >= wordsToWin.value)
  }

  /** True when every team has played the same number of completed turns. */
  function allTeamsPlayedEqualTurns(): boolean {
    const counts = teamTurnCounts.value
    if (counts.length !== teams.value.length || counts.length === 0)
      return false
    const min = Math.min(...counts)
    const max = Math.max(...counts)
    return min === max
  }

  /** Exactly one team has the highest score (no tie for first place). */
  function hasUniqueScoreLeader(): boolean {
    const sorted = [...teams.value].sort((a, b) => b.score - a.score)
    const top = sorted[0]
    if (!top) return false
    const second = sorted[1]
    if (!second) return true
    return top.score > second.score
  }

  function correctGuess() {
    if (phase.value !== "playing") return
    const t = currentTeam.value
    if (!t || !currentWord.value) return
    const w = currentWord.value
    t.score += 1
    turnGuessedWords.value = [...turnGuessedWords.value, w]
    turnWordLog.value = [...turnWordLog.value, { word: w, outcome: "guessed" }]
    wordIndex.value += 1
    if (wordIndex.value >= wordPool.value.length) {
      phase.value = "results"
      return
    }
  }

  function skipWord() {
    if (phase.value !== "playing") return
    const t = currentTeam.value
    const w = currentWord.value
    if (!t || !w) return
    turnSkippedWords.value = [...turnSkippedWords.value, w]
    turnWordLog.value = [...turnWordLog.value, { word: w, outcome: "skipped" }]
    if (skipPenalty.value) {
      t.score -= 1
    }
    wordIndex.value += 1
    if (wordIndex.value >= wordPool.value.length) {
      phase.value = "results"
      return
    }
  }

  function finishTurn() {
    if (phase.value !== "playing") return
    const t = currentTeam.value
    if (!t) return
    const idx = currentTeamIndex.value
    if (
      teamTurnCounts.value.length === teams.value.length
      && idx >= 0
      && idx < teamTurnCounts.value.length
    ) {
      teamTurnCounts.value[idx] += 1
    }
    lastTurnSummary.value = {
      teamId: t.id,
      teamName: t.name,
      wordLog: [...turnWordLog.value],
      score: t.score,
      turnScoreDelta: t.score - turnBaseScore.value,
    }
    phase.value = "turn_summary"
  }

  function startTurn() {
    if (phase.value !== "turn_ready") return
    syncTurnBaseScore()
    phase.value = "playing"
  }

  function continueToNextTeam() {
    if (phase.value !== "turn_summary") return
    if (
      allTeamsPlayedEqualTurns()
      && anyTeamReachedWordsGoal()
    ) {
      if (hasUniqueScoreLeader()) {
        const sorted = [...teams.value].sort((a, b) => b.score - a.score)
        const top = sorted[0]
        if (top)
          winnerTeamId.value = top.id
        phase.value = "results"
        return
      }
      // Tie for first after a full round: keep playing until one team leads alone.
    }
    turnGuessedWords.value = []
    turnSkippedWords.value = []
    turnWordLog.value = []
    lastTurnSummary.value = null
    currentTeamIndex.value =
      (currentTeamIndex.value + 1) % teams.value.length
    syncTurnBaseScore()
    phase.value = "turn_ready"
  }

  return {
    difficulty,
    customPresetId,
    customPrompt,
    teams,
    wordsToWin,
    skipPenalty,
    wordPool,
    wordIndex,
    currentTeamIndex,
    lastTurnSummary,
    turnScoreDelta,
    generationError,
    isGenerating,
    phase,
    winnerTeamId,
    currentTeam,
    currentWord,
    sortedTeamsByScore,
    setDifficulty,
    setCustomTopic,
    addTeam,
    removeTeam,
    resetForNewGame,
    softResetKeepingSetup,
    cancelGeneration,
    runGeneration,
    correctGuess,
    skipWord,
    finishTurn,
    startTurn,
    continueToNextTeam,
  }
})
