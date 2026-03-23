import { defineStore } from "pinia"
import { ref, shallowRef } from "vue"

export const useUiStore = defineStore("ui", () => {
  const footerPrimaryLabel = ref<string | null>(null)
  const footerPrimaryDisabled = ref(false)
  const footerPrimaryOnClick = shallowRef<(() => void) | null>(null)

  function setFooterPrimaryAction(opts: {
    label: string
    disabled?: boolean
    onClick: () => void
  }) {
    footerPrimaryLabel.value = opts.label
    footerPrimaryDisabled.value = opts.disabled ?? false
    footerPrimaryOnClick.value = opts.onClick
  }

  function clearFooterPrimaryAction() {
    footerPrimaryLabel.value = null
    footerPrimaryDisabled.value = false
    footerPrimaryOnClick.value = null
  }

  return {
    footerPrimaryLabel,
    footerPrimaryDisabled,
    footerPrimaryOnClick,
    setFooterPrimaryAction,
    clearFooterPrimaryAction,
  }
})
