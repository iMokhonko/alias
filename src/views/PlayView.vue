<script setup lang="ts">
import { storeToRefs } from "pinia"
import {
  computed,
  nextTick,
  onUnmounted,
  ref,
  watch,
  type CSSProperties,
} from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import ScreenHeader from "@/components/ScreenHeader.vue"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCountdown } from "@/composables/useTimer"
import { useGameStore } from "@/stores/game"
import { Check, ChevronRight, Play, X } from "lucide-vue-next"

const { t } = useI18n()
const router = useRouter()
const game = useGameStore()
const {
  currentTeam,
  currentWord,
  turnScoreDelta,
  phase,
  lastTurnSummary,
  currentTeamIndex,
  sortedTeamsByScore,
} = storeToRefs(game)

const { remaining, start, stop } = useCountdown(60)
/** After main turn time hits 0, play continues until current word is guessed or skipped. */
const turnTimerExpired = ref(false)

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, "0")}`
}

function armTimer() {
  const t = game.currentTeam
  if (!t || game.phase !== "playing") {
    stop()
    return
  }
  turnTimerExpired.value = false
  start(t.secondsPerTurn, () => {
    turnTimerExpired.value = true
  })
}

watch(
  () => game.currentTeamIndex,
  () => {
    armTimer()
  },
)

watch(
  () => game.phase,
  (p) => {
    if (p === "results") {
      stop()
      void router.replace({ name: "results" })
      return
    }
    if (p === "playing") {
      wordAnimMode.value = "idle"
      wordDragX.value = 0
      armTimer()
    }
    else stop()
  },
  { immediate: true },
)

onUnmounted(() => {
  stop()
})

function onCorrect() {
  beginWordExit("correct")
}

function onSkip() {
  beginWordExit("skip")
}

function onContinueNextTeam() {
  game.continueToNextTeam()
}

function onStartTurn() {
  game.startTurn()
}

function formatTurnDelta(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta}`
}

function onStopGame() {
  game.resetForNewGame()
  void router.replace({ name: "home" })
}

const SWIPE_THRESHOLD_PX = 56
const WORD_EXIT_MS = 320
const WORD_ENTER_MS = 280
const WORD_SNAP_MS = 220

type WordCardAnimMode =
  | "idle"
  | "dragging"
  | "snapBack"
  | "exiting"
  | "preEnter"
  | "entering"

const wordAnimMode = ref<WordCardAnimMode>("idle")
const wordDragX = ref(0)
const wordSwipeDragging = ref(false)
let wordSwipeStartX = 0
let wordSwipePointerId: number | null = null
const pendingWordAction = ref<"correct" | "skip" | null>(null)

const wordCardInteractionLocked = computed(() =>
  ["exiting", "preEnter", "entering"].includes(wordAnimMode.value),
)

const wordActionsDisabled = computed(() => wordAnimMode.value !== "idle")

const canSwipeWord = computed(
  () =>
    phase.value === "playing"
    && Boolean(currentWord.value)
    && wordAnimMode.value === "idle",
)

const wordCardStyle = computed((): CSSProperties => {
  const mode = wordAnimMode.value
  if (mode === "dragging") {
    return {
      transform: `translateX(${wordDragX.value}px)`,
      opacity: 1,
      transition: "none",
    }
  }
  if (mode === "snapBack") {
    return {
      transform: `translateX(${wordDragX.value}px)`,
      opacity: 1,
      transition: `transform ${WORD_SNAP_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    }
  }
  if (mode === "exiting") {
    return {
      transform: `translateX(${wordDragX.value}px)`,
      opacity: 1,
      transition: `transform ${WORD_EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    }
  }
  if (mode === "preEnter") {
    return {
      transform: "translateX(0)",
      opacity: 0,
      transition: "none",
    }
  }
  if (mode === "entering") {
    return {
      transform: "translateX(0)",
      opacity: 1,
      transition: `opacity ${WORD_ENTER_MS}ms ease-out`,
    }
  }
  return {
    transform: "translateX(0)",
    opacity: 1,
    transition: "none",
  }
})

function offscreenTranslateX(direction: 1 | -1): number {
  const w = typeof window !== "undefined" ? window.innerWidth : 400
  return direction * (w * 0.5 + 120)
}

function beginWordExit(action: "correct" | "skip") {
  if (phase.value !== "playing" || !currentWord.value) return
  if (!["idle", "dragging"].includes(wordAnimMode.value)) return

  pendingWordAction.value = action
  wordSwipeDragging.value = false
  wordAnimMode.value = "exiting"

  requestAnimationFrame(() => {
    const dir: 1 | -1 = action === "correct" ? 1 : -1
    wordDragX.value = offscreenTranslateX(dir)
  })
}

function wordSwipeReleasePointer(target: HTMLElement, e: PointerEvent) {
  wordSwipeDragging.value = false
  wordSwipePointerId = null
  if (target.hasPointerCapture(e.pointerId))
    target.releasePointerCapture(e.pointerId)
}

function completeWordExit() {
  const action = pendingWordAction.value
  pendingWordAction.value = null
  if (!action) return

  wordAnimMode.value = "preEnter"
  wordDragX.value = 0

  if (action === "correct") {
    game.correctGuess()
    if (turnTimerExpired.value && game.phase === "playing")
      game.finishTurn()
  }
  else {
    game.skipWord()
    if (turnTimerExpired.value && game.phase === "playing")
      game.finishTurn()
  }

  if (game.phase !== "playing") {
    wordAnimMode.value = "idle"
    return
  }

  void nextTick().then(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wordAnimMode.value = "entering"
      })
    })
  })
}

function onWordCardTransitionEnd(e: TransitionEvent) {
  if (e.propertyName !== "transform" && e.propertyName !== "opacity") return

  if (wordAnimMode.value === "snapBack" && e.propertyName === "transform") {
    wordAnimMode.value = "idle"
    return
  }
  if (wordAnimMode.value === "exiting" && e.propertyName === "transform") {
    completeWordExit()
    return
  }
  if (wordAnimMode.value === "entering" && e.propertyName === "opacity")
    wordAnimMode.value = "idle"
}

function onWordPointerDown(e: PointerEvent) {
  if (!canSwipeWord.value || e.button !== 0) return
  wordSwipePointerId = e.pointerId
  wordSwipeStartX = e.clientX
  wordDragX.value = 0
  wordSwipeDragging.value = true
  wordAnimMode.value = "dragging"
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onWordPointerMove(e: PointerEvent) {
  if (!wordSwipeDragging.value || e.pointerId !== wordSwipePointerId) return
  wordDragX.value = e.clientX - wordSwipeStartX
}

function onWordPointerUp(e: PointerEvent) {
  if (!wordSwipeDragging.value || e.pointerId !== wordSwipePointerId) return
  const dx = wordDragX.value
  const el = e.currentTarget as HTMLElement
  wordSwipeReleasePointer(el, e)

  if (dx > SWIPE_THRESHOLD_PX) {
    beginWordExit("correct")
    return
  }
  if (dx < -SWIPE_THRESHOLD_PX) {
    beginWordExit("skip")
    return
  }

  wordAnimMode.value = "snapBack"
  requestAnimationFrame(() => {
    wordDragX.value = 0
  })
}

function onWordPointerCancel(e: PointerEvent) {
  if (!wordSwipeDragging.value || e.pointerId !== wordSwipePointerId) return
  const el = e.currentTarget as HTMLElement
  wordSwipeReleasePointer(el, e)
  wordAnimMode.value = "snapBack"
  requestAnimationFrame(() => {
    wordDragX.value = 0
  })
}
</script>

<template>
  <div
    v-if="phase === 'turn_summary' && lastTurnSummary"
    class="flex min-h-0 flex-1 flex-col gap-page pt-page"
  >
    <ScreenHeader
      class="shrink-0"
      :show-back="false"
      show-stop
      @stop-confirm="onStopGame"
    >
      <template #heading>
        <p class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {{ t("play.turnDone") }}
        </p>
        <h1 class="text-xl font-bold">
          {{ lastTurnSummary.teamName }}
        </h1>
      </template>
    </ScreenHeader>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div class="flex flex-col gap-page pb-2">
          <Card
            class="flex flex-col gap-4 overflow-hidden border border-border/50 bg-card py-5 shadow-[0_2px_8px_-2px_rgba(51,73,78,0.08),0_14px_36px_-12px_rgba(51,73,78,0.14)]"
          >
            <CardHeader class="shrink-0 space-y-0 pb-0 pt-0">
              <CardTitle class="text-lg">
                {{ t("play.thisTurn") }}
              </CardTitle>
              <CardDescription class="mt-1.5">
                {{ t("play.summaryTotalWords", { score: lastTurnSummary.score }) }}
                <span class="mt-1 block">
                  {{ t("play.summaryTurnScore", { delta: formatTurnDelta(lastTurnSummary.turnScoreDelta) }) }}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent class="flex min-h-0 flex-col overflow-hidden pb-0 pt-0">
              <div class="flex max-h-[min(24rem,50svh)] min-h-[6rem] flex-col overflow-hidden">
                <p
                  class="text-muted-foreground mb-2 shrink-0 text-xs font-semibold uppercase tracking-wider"
                >
                  {{ t("play.wordsThisTurn", { n: lastTurnSummary.wordLog.length }) }}
                </p>
                <div
                  v-if="lastTurnSummary.wordLog.length > 0"
                  class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain rounded-md border border-border/50"
                >
                  <ul class="divide-border/60 divide-y">
                    <li
                      v-for="(entry, i) in lastTurnSummary.wordLog"
                      :key="`w-${i}-${entry.word}`"
                      class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                    >
                      <span class="min-w-0 truncate font-medium">{{ entry.word }}</span>
                      <span
                        class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                        :class="
                          entry.outcome === 'guessed'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                        "
                      >
                        {{
                          entry.outcome === "guessed"
                            ? t("play.statusGuessed")
                            : t("play.statusSkipped")
                        }}
                      </span>
                    </li>
                  </ul>
                </div>
                <p
                  v-else
                  class="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-border/50 py-8 text-sm"
                >
                  {{ t("play.none") }}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            class="shrink-0 border border-border/40 bg-card shadow-[0_1px_4px_-1px_rgba(51,73,78,0.07),0_6px_16px_-6px_rgba(51,73,78,0.1)]"
          >
            <CardHeader class="pb-2 pt-0">
              <CardTitle class="text-base">
                {{ t("play.allTeamsScores") }}
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-0 pb-0">
              <template
                v-for="(team, i) in sortedTeamsByScore"
                :key="team.id"
              >
                <Separator v-if="i > 0" />
                <div class="flex items-center justify-between gap-3 py-2.5">
                  <span
                    class="min-w-0 truncate font-medium"
                    :class="team.id === lastTurnSummary.teamId ? 'font-semibold text-primary' : ''"
                  >
                    {{ team.name }}
                    <span
                      v-if="team.id === lastTurnSummary.teamId"
                      class="text-muted-foreground ml-1 text-xs font-normal"
                    >{{ t("play.thisTurnTag") }}</span>
                  </span>
                  <span class="font-mono text-sm font-bold tabular-nums shrink-0">
                    {{ team.score }}
                  </span>
                </div>
              </template>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <div
      class="border-border/50 bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-10 shrink-0 border-t pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md"
    >
      <Button
        class="from-primary h-12 w-full rounded-full bg-linear-to-b to-amber-500 text-base font-bold text-white shadow-lg"
        @click="onContinueNextTeam"
      >
        {{ t("play.nextTeam") }}
        <ChevronRight class="ml-1 size-5" />
      </Button>
    </div>
  </div>

  <div
    v-else-if="phase === 'turn_ready'"
    class="flex min-h-0 flex-1 flex-col gap-page pb-safe pt-page"
  >
    <ScreenHeader
      :show-back="false"
      show-stop
      @stop-confirm="onStopGame"
    >
      <template #heading>
        <h1 class="text-xl font-bold">
          {{ t("play.turnReadyScreenTitle") }}
        </h1>
      </template>
    </ScreenHeader>

    <Card
      class="flex min-h-0 flex-1 flex-col justify-center border border-border/50 bg-card shadow-[0_2px_8px_-2px_rgba(51,73,78,0.08),0_14px_36px_-12px_rgba(51,73,78,0.14)]"
    >
      <CardContent class="flex flex-col items-center gap-5 px-6 py-10 text-center">
        <p class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {{ t("play.nowPlaying") }}
        </p>
        <p class="text-foreground text-3xl font-extrabold tracking-tight text-balance">
          {{ currentTeam?.name ?? t("play.defaultTeam") }}
        </p>
        <p class="text-muted-foreground max-w-sm text-sm text-balance">
          {{ t("play.turnReadyHint") }}
        </p>
        <Button
          class="from-primary h-12 w-full max-w-sm rounded-full bg-linear-to-b to-amber-500 text-base font-bold text-white shadow-lg"
          @click="onStartTurn"
        >
          <Play class="mr-2 size-5 fill-current" />
          {{ t("play.startTurn") }}
        </Button>
      </CardContent>
    </Card>
  </div>

  <div
    v-else-if="phase === 'playing'"
    class="flex min-h-0 flex-1 flex-col gap-page pb-safe pt-page"
  >
    <ScreenHeader
      :show-back="false"
      show-stop
      @stop-confirm="onStopGame"
    >
      <template #heading>
        <p class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
          {{ t("play.nowPlaying") }}
        </p>
        <h1 class="text-xl font-bold">
          {{ currentTeam?.name ?? t("play.defaultTeam") }}
        </h1>
      </template>
    </ScreenHeader>

    <div class="flex flex-1 flex-col items-center justify-center gap-page">
      <div class="flex w-full items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon-lg"
          class="size-12 shrink-0 rounded-full text-muted-foreground"
          :disabled="wordActionsDisabled"
          :aria-label="t('play.skipWordAria')"
          @click="onSkip"
        >
          <X class="size-5" />
        </Button>

        <Card
          :class="[
            'min-h-36 flex-1 touch-none border-0 shadow-lg select-none',
            wordAnimMode === 'dragging'
              ? 'cursor-grabbing'
              : wordAnimMode === 'idle'
                ? 'cursor-grab'
                : 'cursor-default',
            wordCardInteractionLocked ? 'pointer-events-none' : '',
          ]"
          :style="wordCardStyle"
          @pointerdown="onWordPointerDown"
          @pointermove="onWordPointerMove"
          @pointerup="onWordPointerUp"
          @pointercancel="onWordPointerCancel"
          @transitionend="onWordCardTransitionEnd"
        >
          <CardContent class="flex min-h-36 items-center justify-center py-8">
            <p
              v-if="currentWord"
              class="text-center text-2xl font-extrabold tracking-tight text-balance"
            >
              {{ currentWord }}
            </p>
            <p
              v-else
              class="text-muted-foreground text-sm"
            >
              {{ t("play.noWordsLeft") }}
            </p>
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          size="icon-lg"
          class="size-12 shrink-0 rounded-full text-primary"
          :disabled="wordActionsDisabled"
          :aria-label="t('play.markGuessedAria')"
          @click="onCorrect"
        >
          <Check class="size-6" />
        </Button>
      </div>
    </div>

    <div
      class="from-primary mt-auto flex w-full shrink-0 items-center justify-between gap-4 rounded-full bg-linear-to-b to-amber-500 px-6 py-4 text-white shadow-lg"
    >
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wider opacity-90">
          {{ t("play.turnScoreBar") }}
        </p>
        <p class="text-lg font-bold tabular-nums">
          {{ turnScoreDelta > 0 ? "+" : "" }}{{ turnScoreDelta }}
        </p>
      </div>
      <div class="text-right">
        <p class="text-[10px] font-semibold uppercase tracking-wider opacity-90">
          {{ t("play.time") }}
        </p>
        <p class="font-mono text-2xl font-bold tabular-nums">
          {{ formatTime(remaining) }}
        </p>
      </div>
    </div>
  </div>
</template>
