<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { Button } from "@/components/ui/button"
import { useApiKey } from "@/composables/useApiKey"
import { Settings } from "lucide-vue-next"

const { t } = useI18n()
const router = useRouter()
const { hasKey } = useApiKey()

function openSettings() {
  window.dispatchEvent(new CustomEvent("alias-open-settings"))
}

function startGame() {
  if (!hasKey.value) return
  void router.push({ name: "difficulty" })
}
</script>

<template>
  <div
    class="flex min-h-0 flex-1 flex-col justify-center px-page py-6"
  >
    <div class="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center">
      <h1 class="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
        Alias
      </h1>
      <p class="text-muted-foreground text-sm leading-relaxed text-pretty sm:text-base">
        {{ t("home.rules") }}
      </p>
      <div class="w-full space-y-2">
        <div class="flex w-full items-stretch gap-2 sm:gap-3">
          <Button
            type="button"
            class="from-primary h-12 min-w-0 flex-1 rounded-full bg-linear-to-b to-amber-500 text-base font-bold text-white shadow-md hover:to-amber-600 disabled:opacity-40"
            :disabled="!hasKey"
            @click="startGame"
          >
            {{ t("home.play") }}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            class="border-border size-12 shrink-0 rounded-full"
            :aria-label="t('app.settings')"
            @click="openSettings"
          >
            <Settings class="size-5" stroke-width="2" />
          </Button>
        </div>
        <p
          v-if="!hasKey"
          class="text-muted-foreground px-1 text-xs leading-snug"
        >
          {{ t("home.needApiKey") }}
        </p>
      </div>
    </div>
  </div>
</template>
