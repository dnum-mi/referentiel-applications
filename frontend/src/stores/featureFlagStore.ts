import type { FeatureFlagDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import api from "@/api/index";

/**
 * État des feature flags côté front.
 *
 * - `flags` est alimenté au boot depuis `GET /config` (`setFlags`) et sert au
 *   gating (composable `useFeatureFlag`, directive `v-feature`, garde de route).
 * - `list` n'est chargé qu'à la demande, pour l'écran d'admin (libellés + bascule).
 */
export const useFeatureFlagStore = defineStore("featureFlagStore", () => {
  const flags = ref<Record<string, boolean>>({});
  const list = ref<FeatureFlagDto[]>([]);

  /** Alimente l'état des flags depuis la config chargée au boot. */
  function setFlags(featureFlags: Record<string, boolean>) {
    flags.value = { ...featureFlags };
  }

  /** Un flag est actif s'il est explicitement à `true`. */
  function isEnabled(key: string): boolean {
    return flags.value[key] === true;
  }

  /** Charge la liste complète des flags (admin). */
  async function fetchAll() {
    const response = await api.featureFlagControllerFindAll();
    if (!response.response.ok || !response.data) {
      throw new Error("Erreur lors de la récupération des feature flags.");
    }
    list.value = response.data;
    return list.value;
  }

  /** Bascule un flag (admin) et met à jour l'état local. */
  async function toggle(key: string, enabled: boolean) {
    const response = await api.featureFlagControllerUpdate({
      path: { key },
      body: { enabled },
    });
    if (!response.response.ok || !response.data) {
      throw new Error("Erreur lors de la mise à jour du feature flag.");
    }
    const updated = response.data;
    list.value = list.value.map((flag) => (flag.key === updated.key ? updated : flag));
    flags.value = { ...flags.value, [updated.key]: updated.enabled };
    return updated;
  }

  return {
    flags,
    list,
    isEnabled,
    setFlags,
    fetchAll,
    toggle,
    hasFlags: computed(() => Object.keys(flags.value).length > 0),
  };
});
