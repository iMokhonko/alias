import { onUnmounted, ref } from "vue"

export function useCountdown(initialSeconds: number) {
  const remaining = ref(initialSeconds)
  let id: ReturnType<typeof setInterval> | null = null

  function clear() {
    if (id !== null) {
      clearInterval(id)
      id = null
    }
  }

  function start(seconds: number, onDone?: () => void) {
    clear()
    remaining.value = Math.max(0, Math.floor(seconds))
    id = setInterval(() => {
      if (remaining.value <= 1) {
        remaining.value = 0
        clear()
        onDone?.()
        return
      }
      remaining.value -= 1
    }, 1000)
  }

  function stop() {
    clear()
  }

  onUnmounted(clear)

  return { remaining, start, stop }
}
