<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { useFooterPrimaryAction } from "@/composables/useFooterPrimaryAction"
import ScreenHeader from "@/components/ScreenHeader.vue"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useGameStore } from "@/stores/game"
import type { Difficulty } from "@/lib/constants"
import {
  Flame,
  Gauge,
  Mountain,
  Shuffle,
  Wand2,
} from "lucide-vue-next"

const { t } = useI18n()
const router = useRouter()
const game = useGameStore()
const { difficulty } = storeToRefs(game)

const options = computed((): { id: Difficulty; label: string; icon: typeof Flame }[] => [
  { id: "easy", label: t("difficulty.easy"), icon: Flame },
  { id: "medium", label: t("difficulty.medium"), icon: Gauge },
  { id: "hard", label: t("difficulty.hard"), icon: Mountain },
  { id: "mixed", label: t("difficulty.mixed"), icon: Shuffle },
  { id: "custom", label: t("difficulty.custom"), icon: Wand2 },
])

function select(id: Difficulty) {
  game.setDifficulty(id)
}

function next() {
  if (!difficulty.value) return
  if (difficulty.value === "custom") {
    router.push({ name: "custom" })
    return
  }
  router.push({ name: "setup" })
}

useFooterPrimaryAction(() => ({
  label: t("difficulty.next"),
  disabled: !difficulty.value,
  onClick: next,
}))
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-page pt-page">
    <ScreenHeader
      :title="t('difficulty.title')"
      :subtitle="t('difficulty.description', { customLabel: t('difficulty.custom') })"
      :back-route="{ name: 'home' }"
    />

    <div class="grid min-h-0 grid-cols-2 gap-4">
      <button
        v-for="opt in options"
        :key="opt.id"
        type="button"
        class="text-left focus-visible:ring-ring rounded-2xl focus-visible:ring-2 focus-visible:outline-none"
        @click="select(opt.id)"
      >
        <Card
          :class="cn(
            'border-0 shadow-sm transition-all',
            difficulty === opt.id
              ? 'bg-primary shadow-md ring-2 ring-amber-400/60'
              : 'bg-card hover:shadow-md',
          )"
        >
          <CardContent class="flex flex-col items-center gap-3 p-5 sm:p-6">
            <div
              :class="cn(
                'flex size-14 items-center justify-center rounded-2xl',
                difficulty === opt.id ? 'bg-white/30' : 'bg-accent',
              )"
            >
              <component
                :is="opt.icon"
                class="size-8"
                :class="difficulty === opt.id ? 'text-primary-foreground' : 'text-foreground'"
              />
            </div>
            <span
              class="text-center text-sm font-bold"
              :class="difficulty === opt.id ? 'text-primary-foreground' : 'text-muted-foreground'"
            >
              {{ opt.label }}
            </span>
          </CardContent>
        </Card>
      </button>
    </div>
  </div>
</template>
