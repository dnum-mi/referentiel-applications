import { watchEffect, type Directive, type WatchStopHandle } from "vue";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";

const STOP_HANDLE = Symbol("v-feature-stop");

type FeatureElement = HTMLElement & { [STOP_HANDLE]?: WatchStopHandle };

/**
 * Directive `v-feature="'ma-cle'"` : masque l'élément (retiré du flux, `hidden`)
 * tant que le flag est désactivé. RÉACTIVE : un `watchEffect` par élément suit
 * l'état du store, donc une bascule reflétée dans le store (toggle admin) se
 * répercute immédiatement, sans rechargement.
 */
export const vFeature: Directive<FeatureElement, string> = {
  mounted(el, binding) {
    const store = useFeatureFlagStore();
    el[STOP_HANDLE] = watchEffect(() => {
      const enabled = store.isEnabled(binding.value);
      el.style.display = enabled ? "" : "none";
      el.hidden = !enabled;
    });
  },
  unmounted(el) {
    el[STOP_HANDLE]?.();
    delete el[STOP_HANDLE];
  },
};
