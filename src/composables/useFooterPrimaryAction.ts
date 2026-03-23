import { onScopeDispose, watchEffect } from "vue"
import { useUiStore } from "@/stores/ui"

/**
 * Registers the main bottom-bar primary button for the current screen.
 * Clears automatically when the calling component is torn down.
 */
export function useFooterPrimaryAction(
  getter: () => {
    label: string
    disabled?: boolean
    onClick: () => void
  },
) {
  const ui = useUiStore()
  watchEffect(() => {
    ui.setFooterPrimaryAction(getter())
  })
  onScopeDispose(() => {
    ui.clearFooterPrimaryAction()
  })
}
