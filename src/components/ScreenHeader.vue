<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ChevronLeft, OctagonX } from "lucide-vue-next"

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    showBack?: boolean
    /** If set, back runs this instead of router navigation */
    backHandler?: () => void | Promise<void>
    backRoute?: RouteLocationRaw
    /** Use replace instead of push for back navigation */
    backReplace?: boolean
    showStop?: boolean
    /** When true, stop opens confirm dialog before emitting */
    stopConfirm?: boolean
    class?: string
  }>(),
  {
    title: "",
    subtitle: "",
    showBack: true,
    showStop: false,
    stopConfirm: true,
  },
)

const emit = defineEmits<{
  stopConfirm: []
}>()

const { t } = useI18n()
const router = useRouter()
const stopDialogOpen = ref(false)

async function onBack() {
  if (props.backHandler) {
    await props.backHandler()
    return
  }
  if (props.backRoute != null) {
    if (props.backReplace)
      await router.replace(props.backRoute)
    else
      await router.push(props.backRoute)
    return
  }
  if (window.history.length > 1)
    router.back()
  else
    await router.push({ name: "home" })
}

function onStopClick() {
  if (props.stopConfirm)
    stopDialogOpen.value = true
  else
    emit("stopConfirm")
}

function confirmStop() {
  stopDialogOpen.value = false
  emit("stopConfirm")
}
</script>

<template>
  <header
    :class="
      cn(
        'flex shrink-0 items-start gap-2 pb-4 sm:gap-3',
        props.class,
      )
    "
  >
    <Button
      v-if="showBack"
      type="button"
      variant="ghost"
      size="icon"
      class="text-foreground hover:bg-accent -ml-1 size-11 shrink-0 rounded-full sm:ml-0"
      :aria-label="t('app.back')"
      @click="onBack"
    >
      <ChevronLeft class="size-6" stroke-width="2" />
    </Button>

    <div class="min-w-0 flex-1 pt-0.5">
      <slot name="heading">
        <h1
          v-if="title"
          class="text-foreground text-xl font-bold tracking-tight sm:text-2xl"
        >
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="text-muted-foreground mt-1 text-sm leading-snug sm:text-base"
        >
          {{ subtitle }}
        </p>
      </slot>
    </div>

    <div
      v-if="showStop"
      class="flex h-11 shrink-0 items-center justify-end self-start"
    >
      <Button
        type="button"
        variant="outline"
        class="border-destructive/35 text-destructive hover:bg-destructive/10 hover:text-destructive h-10 gap-1.5 rounded-full px-3 text-xs font-semibold sm:px-4 sm:text-sm"
        @click="onStopClick"
      >
        <OctagonX class="size-4 shrink-0" stroke-width="2" />
        <span class="max-w-[5.5rem] truncate sm:max-w-none">
          {{ t("play.stopGame") }}
        </span>
      </Button>
    </div>

    <Dialog v-if="showStop && stopConfirm" v-model:open="stopDialogOpen">
      <DialogContent class="rounded-2xl sm:max-w-md" :show-close-button="true">
        <DialogHeader>
          <DialogTitle>{{ t("play.stopGameConfirmTitle") }}</DialogTitle>
          <DialogDescription>
            {{ t("play.stopGameConfirmBody") }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            class="rounded-full"
            @click="stopDialogOpen = false"
          >
            {{ t("common.cancel") }}
          </Button>
          <Button
            type="button"
            variant="destructive"
            class="rounded-full"
            @click="confirmStop"
          >
            {{ t("play.stopGameConfirmAction") }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </header>
</template>
