<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApiKey } from "@/composables/useApiKey"

const { t } = useI18n()
const open = defineModel<boolean>("open", { default: false })

const { apiKey, persist, clearKey } = useApiKey()
const draft = ref(apiKey.value)

watch(open, (v) => {
  if (v) draft.value = apiKey.value
})

function save() {
  persist(draft.value.trim())
  open.value = false
}

function clear() {
  draft.value = ""
  clearKey()
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="rounded-2xl sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t("settings.title") }}</DialogTitle>
        <DialogDescription>
          {{ t("settings.description") }}
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-2">
        <Label for="api-key">{{ t("settings.secretLabel") }}</Label>
        <Input
          id="api-key"
          v-model="draft"
          type="password"
          autocomplete="off"
          placeholder="sk-..."
          class="rounded-xl font-mono text-sm"
        />
      </div>
      <DialogFooter class="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          class="rounded-full"
          @click="clear"
        >
          {{ t("settings.clear") }}
        </Button>
        <Button
          type="button"
          class="rounded-full"
          @click="save"
        >
          {{ t("settings.save") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
