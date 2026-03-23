import { createRouter, createWebHistory } from "vue-router"
import { useApiKey } from "@/composables/useApiKey"
import { useGameStore } from "@/stores/game"

const setupFlowRequiresKey = new Set([
  "difficulty",
  "custom",
  "setup",
  "generating",
])

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/difficulty",
      name: "difficulty",
      component: () => import("@/views/DifficultyView.vue"),
    },
    {
      path: "/custom",
      name: "custom",
      component: () => import("@/views/CustomTopicView.vue"),
    },
    {
      path: "/setup",
      name: "setup",
      component: () => import("@/views/SetupView.vue"),
    },
    {
      path: "/generating",
      name: "generating",
      component: () => import("@/views/GeneratingView.vue"),
    },
    {
      path: "/play",
      name: "play",
      component: () => import("@/views/PlayView.vue"),
    },
    {
      path: "/results",
      name: "results",
      component: () => import("@/views/ResultsView.vue"),
    },
  ],
})

router.beforeEach((to) => {
  const { hasKey } = useApiKey()
  if (
    typeof to.name === "string"
    && setupFlowRequiresKey.has(to.name)
    && !hasKey.value
  ) {
    return { name: "home" }
  }

  const game = useGameStore()
  if (to.name === "play") {
    if (
      game.wordPool.length === 0
      || (
        game.phase !== "playing"
        && game.phase !== "turn_ready"
        && game.phase !== "turn_summary"
      )
    ) {
      return { name: "home" }
    }
  }
  if (to.name === "results" && game.phase !== "results") {
    return { name: "home" }
  }
  if (to.name === "custom" && game.difficulty !== "custom") {
    return { name: "difficulty" }
  }
  if (to.name === "setup" && !game.difficulty) {
    return { name: "difficulty" }
  }
  return true
})

export default router
