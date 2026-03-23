<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { RouterView } from "vue-router"
import SettingsDialog from "@/components/SettingsDialog.vue"
import { Button } from "@/components/ui/button"
import { useUiStore } from "@/stores/ui"

const ui = useUiStore()
const settingsOpen = ref(false)

function openSettings() {
  settingsOpen.value = true
}

function onOpenSettingsEvent() {
  settingsOpen.value = true
}

onMounted(() => {
  window.addEventListener("alias-open-settings", onOpenSettingsEvent)
})

onUnmounted(() => {
  window.removeEventListener("alias-open-settings", onOpenSettingsEvent)
})

const mainBottomStyle = computed(() => {
  if (!ui.footerPrimaryLabel) {
    return {
      paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
    }
  }
  return {
    paddingBottom: `calc(1rem + var(--app-footer-fixed-chrome))`,
  }
})
</script>

<template>
  <div class="bg-background flex min-h-dvh min-h-[100dvh] w-full flex-col">
    <main
      class="flex w-full flex-1 flex-col px-page pt-safe min-h-0"
      :style="mainBottomStyle"
    >
      <RouterView v-slot="{ Component }">
        <component :is="Component" class="flex min-h-0 flex-1 flex-col" />
      </RouterView>
    </main>

    <div
      v-if="ui.footerPrimaryLabel"
      class="fixed inset-x-0 bottom-0 z-40 w-full"
    >
      <div class="px-page pt-3 pb-safe">
        <Button
          class="from-primary h-12 w-full rounded-full bg-linear-to-b to-amber-500 text-base font-bold text-white shadow-md disabled:opacity-40"
          :disabled="ui.footerPrimaryDisabled"
          @click="ui.footerPrimaryOnClick?.()"
        >
          {{ ui.footerPrimaryLabel }}
        </Button>
      </div>
    </div>

    <SettingsDialog v-model:open="settingsOpen" />
  </div>
</template>
