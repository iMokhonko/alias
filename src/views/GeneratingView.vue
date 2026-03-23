<script setup lang="ts">
import { onMounted } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { Button } from "@/components/ui/button"
import { useApiKey } from "@/composables/useApiKey"
import { useGameStore } from "@/stores/game"
import { ChevronLeft, Loader2 } from "lucide-vue-next"

const { t } = useI18n()
const router = useRouter()
const game = useGameStore()
const { apiKey } = useApiKey()

function leaveGenerating() {
  game.cancelGeneration()
  void router.replace({ name: "setup" })
}

onMounted(async () => {
  if (
    (game.phase === "playing" || game.phase === "turn_ready")
    && game.wordPool.length > 0
  ) {
    await router.replace({ name: "play" })
    return
  }
  try {
    await game.runGeneration(apiKey.value)
  }
  catch {
    await router.replace({ name: "setup" })
    return
  }
  if (
    (game.phase === "playing" || game.phase === "turn_ready")
    && game.wordPool.length > 0
  )
    await router.replace({ name: "play" })
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col pb-safe pt-page">
    <header class="flex shrink-0 items-center pb-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="text-foreground hover:bg-accent -ml-1 size-11 shrink-0 rounded-full sm:ml-0"
        :aria-label="t('app.back')"
        @click="leaveGenerating"
      >
        <ChevronLeft class="size-6" stroke-width="2" />
      </Button>
    </header>

    <div
      class="flex flex-1 flex-col items-center justify-center gap-5 px-page text-center"
    >
      <div class="max-w-md space-y-2">
        <h1
          class="text-foreground text-xl font-bold tracking-tight sm:text-2xl"
        >
          {{ t("generating.title") }}
        </h1>
        <p class="text-muted-foreground text-sm leading-snug sm:text-base">
          {{ t("generating.subtitle") }}
        </p>
      </div>
      <Loader2
        class="text-primary size-14 shrink-0 animate-spin"
        aria-hidden="true"
      />
      <p
        v-if="game.generationError"
        class="text-destructive -mt-2 max-w-md text-sm"
      >
        {{ game.generationError }}
      </p>
    </div>
  </div>
</template>
