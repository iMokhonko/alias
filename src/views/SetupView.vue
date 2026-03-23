<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { useFooterPrimaryAction } from "@/composables/useFooterPrimaryAction"
import ScreenHeader from "@/components/ScreenHeader.vue"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { DEFAULT_TURN_SECONDS, MIN_TEAMS } from "@/lib/constants"
import { useApiKey } from "@/composables/useApiKey"
import { useGameStore } from "@/stores/game"
import { Minus, Plus } from "lucide-vue-next"

const { t } = useI18n()
const router = useRouter()
const game = useGameStore()
const { teams, wordsToWin, skipPenalty, difficulty } = storeToRefs(game)
const { hasKey } = useApiKey()

const setupBackRoute = computed(() =>
  difficulty.value === "custom"
    ? ({ name: "custom" } as const)
    : ({ name: "difficulty" } as const),
)

function updateTeamSeconds(id: string, v: number[]) {
  const t = teams.value.find((x) => x.id === id)
  if (t) t.secondsPerTurn = v[0] ?? DEFAULT_TURN_SECONDS
}

function start() {
  if (!hasKey.value) {
    window.dispatchEvent(new CustomEvent("alias-open-settings"))
    return
  }
  router.push({ name: "generating" })
}

useFooterPrimaryAction(() => ({
  label: hasKey.value ? t("setup.startWithKey") : t("setup.startNoKey"),
  onClick: start,
}))
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-page pt-page">
    <ScreenHeader
      :title="t('setup.title')"
      :subtitle="t('setup.subtitle')"
      :back-route="setupBackRoute"
    />

    <Card class="border-0 bg-[#2d3436] text-white shadow-lg">
      <CardHeader>
        <CardTitle class="text-lg text-white">
          {{ t("setup.teamsTitle") }}
        </CardTitle>
        <CardDescription class="text-white/70">
          {{ t("setup.teamsHint", { min: MIN_TEAMS }) }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div
          v-for="team in teams"
          :key="team.id"
          class="space-y-3 rounded-2xl bg-white/5 p-4"
        >
          <div class="flex items-center gap-2">
            <Input
              v-model="team.name"
              class="border-white/20 bg-white/10 text-white placeholder:text-white/40"
              :aria-label="t('setup.teamNameAria')"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              class="shrink-0 bg-white/15 text-white hover:bg-white/25"
              :disabled="teams.length <= MIN_TEAMS"
              :aria-label="t('setup.removeTeamAria')"
              @click="game.removeTeam(team.id)"
            >
              <Minus class="size-4" />
            </Button>
          </div>
          <div>
            <div class="mb-2 flex justify-between text-xs text-white/80">
              <span>{{ t("setup.secondsPerTurn") }}</span>
              <span class="font-mono font-semibold text-white">{{ team.secondsPerTurn }}s</span>
            </div>
            <Slider
              :model-value="[team.secondsPerTurn]"
              :min="20"
              :max="180"
              :step="5"
              class="**:data-[slot=slider-range]:bg-primary"
              @update:model-value="(v) => updateTeamSeconds(team.id, v as number[])"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          class="w-full rounded-full bg-white/15 text-white hover:bg-white/25"
          @click="game.addTeam"
        >
          <Plus class="size-4" />
          {{ t("setup.addTeam") }}
        </Button>
      </CardContent>
    </Card>

    <Card class="border-0 shadow-md">
      <CardHeader>
        <CardTitle class="text-lg">
          {{ t("setup.rulesTitle") }}
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div>
          <div class="mb-2 flex justify-between">
            <Label>{{ t("setup.wordsToWin") }}</Label>
            <span class="text-muted-foreground text-sm font-mono font-semibold">{{ wordsToWin }}</span>
          </div>
          <Slider
            :model-value="[wordsToWin]"
            :min="5"
            :max="80"
            :step="1"
            @update:model-value="(v) => {
              const n = (v as number[])[0]
              if (n != null) game.wordsToWin = n
            }"
          />
        </div>

        <Separator />

        <div class="flex items-center justify-between gap-4">
          <div>
            <Label for="skip-penalty" class="text-base">{{ t("setup.skipPenalty") }}</Label>
            <p class="text-muted-foreground mt-0.5 text-xs">
              {{ t("setup.skipPenaltyHint") }}
            </p>
          </div>
          <Switch
            id="skip-penalty"
            v-model="skipPenalty"
          />
        </div>
      </CardContent>
    </Card>
  </div>
</template>
