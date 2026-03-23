<script setup lang="ts">
import { computed } from "vue"
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
import { useGameStore } from "@/stores/game"
import { Crown, Trophy } from "lucide-vue-next"

const { t } = useI18n()
const router = useRouter()
const game = useGameStore()

const winner = computed(() =>
  game.teams.find((t) => t.id === game.winnerTeamId) ?? null,
)

const deckExhausted = computed(
  () => game.wordPool.length > 0 && game.wordIndex >= game.wordPool.length,
)

const headline = computed(() => {
  if (winner.value) return t("results.winner", { name: winner.value.name })
  return t("results.roundDone")
})

const subline = computed(() => {
  if (deckExhausted.value) return t("results.deckFinished")
  if (winner.value)
    return t("results.highScoreAfterRound", { n: game.wordsToWin })
  return t("results.roundScoreRecorded")
})

function exitToHome() {
  game.resetForNewGame()
  void router.push({ name: "home" })
}

function newGame() {
  exitToHome()
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-page pb-safe pt-page min-h-0">
    <ScreenHeader :back-handler="exitToHome">
      <template #heading>
        <h1 class="text-2xl font-extrabold tracking-tight">
          {{ headline }}
        </h1>
        <p class="text-muted-foreground mt-1 text-sm">
          {{ subline }}
        </p>
      </template>
    </ScreenHeader>

    <div class="-mt-1 flex justify-center">
      <div
        class="from-primary flex size-24 items-center justify-center rounded-full bg-linear-to-b to-amber-500 shadow-lg"
      >
        <Trophy class="size-12 text-white" aria-hidden="true" />
      </div>
    </div>

    <Card
      v-if="winner"
      class="border-primary/40 border-2 bg-accent/50 shadow-md"
    >
      <CardHeader class="pb-2 pt-0">
        <CardTitle class="flex items-center gap-2 text-lg">
          <Crown class="text-primary size-6" />
          {{ t("results.champion") }}
        </CardTitle>
        <CardDescription>
          {{ t("results.winnerStats", { name: winner.name, score: winner.score }) }}
        </CardDescription>
      </CardHeader>
    </Card>

    <Card class="border-0 shadow-md">
      <CardHeader class="pt-0">
        <CardTitle class="text-lg">
          {{ t("results.leaderboard") }}
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-0 pb-0">
        <template
          v-for="(t, i) in game.sortedTeamsByScore"
          :key="t.id"
        >
          <Separator v-if="i > 0" />
          <div class="flex items-center justify-between py-3">
            <span class="font-semibold">
              <span class="text-muted-foreground mr-2 font-mono">{{ i + 1 }}.</span>
              {{ t.name }}
            </span>
            <span class="font-mono text-sm font-bold tabular-nums">
              {{ t.score }}
            </span>
          </div>
        </template>
      </CardContent>
    </Card>

    <Button
      class="from-primary h-12 w-full rounded-full bg-linear-to-b to-amber-500 text-base font-bold text-white shadow-lg"
      @click="newGame"
    >
      {{ t("results.newGame") }}
    </Button>
  </div>
</template>
