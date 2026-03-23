import { computed, ref } from "vue"
import { OPENAI_API_KEY_STORAGE } from "@/lib/constants"

const stored = ref<string>("")

function load() {
  if (typeof localStorage === "undefined") return
  stored.value = localStorage.getItem(OPENAI_API_KEY_STORAGE) ?? ""
}

load()

export function useApiKey() {
  const apiKey = computed({
    get: () => stored.value,
    set: (v: string) => {
      stored.value = v
    },
  })

  function persist(key: string) {
    stored.value = key
    if (typeof localStorage !== "undefined") {
      if (key) localStorage.setItem(OPENAI_API_KEY_STORAGE, key)
      else localStorage.removeItem(OPENAI_API_KEY_STORAGE)
    }
  }

  function clearKey() {
    persist("")
  }

  return {
    apiKey,
    persist,
    clearKey,
    hasKey: computed(() => stored.value.trim().length > 0),
    reloadFromStorage: load,
  }
}
