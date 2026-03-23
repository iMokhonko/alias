<script setup lang="ts">
import { storeToRefs } from "pinia"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { useFooterPrimaryAction } from "@/composables/useFooterPrimaryAction"
import ScreenHeader from "@/components/ScreenHeader.vue"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PRESET_TOPIC_IDS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useGameStore } from "@/stores/game"

const { t } = useI18n()
const router = useRouter()
const game = useGameStore()
const { customPresetId, customPrompt } = storeToRefs(game)

const localPrompt = ref(customPrompt.value)

watch(localPrompt, (v) => {
  if (v.trim()) game.setCustomTopic(null, v)
  else if (customPresetId.value) game.setCustomTopic(customPresetId.value, "")
  else game.setCustomTopic(null, "")
})

watch(customPresetId, () => {
  if (customPresetId.value) localPrompt.value = ""
})

function pickPreset(id: string) {
  game.setCustomTopic(id, "")
  localPrompt.value = ""
}

const canContinue = computed(
  () =>
    Boolean(customPresetId.value?.trim()) || Boolean(localPrompt.value.trim()),
)

function next() {
  if (!canContinue.value) return
  router.push({ name: "setup" })
}

useFooterPrimaryAction(() => ({
  label: t("customTopic.next"),
  disabled: !canContinue.value,
  onClick: next,
}))
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-page pt-page">
    <ScreenHeader
      :title="t('customTopic.title')"
      :subtitle="t('customTopic.subtitle')"
      :back-route="{ name: 'difficulty' }"
    />

    <div>
      <Label class="mb-2 block text-xs font-semibold uppercase tracking-wider">
        {{ t("customTopic.presetsLabel") }}
      </Label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in PRESET_TOPIC_IDS"
          :key="p"
          type="button"
          :class="cn(
            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
            customPresetId === p && !localPrompt.trim()
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card hover:bg-accent',
          )"
          @click="pickPreset(p)"
        >
          {{ t(`topics.${p}.label`) }}
        </button>
      </div>
    </div>

    <Card class="border-0 shadow-sm">
      <CardContent class="space-y-2 py-0">
        <Label for="custom-prompt">{{ t("customTopic.ownPrompt") }}</Label>
        <Textarea
          id="custom-prompt"
          v-model="localPrompt"
          rows="4"
          :placeholder="t('customTopic.placeholder')"
          class="rounded-xl"
          @input="game.setCustomTopic(null, localPrompt)"
        />
        <p class="text-muted-foreground text-xs">
          {{ t("customTopic.hint") }}
        </p>
      </CardContent>
    </Card>
  </div>
</template>
