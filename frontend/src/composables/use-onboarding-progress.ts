import { ref } from "vue";

const STORAGE_KEY = "onboarding-tour-progress";

function loadCompletedChapters(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

// Module-scoped (pas dans useOnboardingProgress) : un seul état partagé entre le
// composable de tour et le panneau de debug, quel que soit le composant qui les instancie.
const completedChapters = ref<Set<string>>(loadCompletedChapters());

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedChapters.value]));
}

export function useOnboardingProgress() {
  function markChapterCompleted(chapterId: string) {
    if (completedChapters.value.has(chapterId)) return;
    completedChapters.value = new Set(completedChapters.value).add(chapterId);
    persist();
  }

  function resetProgress() {
    completedChapters.value = new Set();
    persist();
  }

  return { completedChapters, markChapterCompleted, resetProgress };
}
