import type { FeatureFlagDto } from "@/client/types.gen";
import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/api/index";

/**
 * État des feature flags côté front.
 *
 * - `flags` est alimenté au boot depuis `GET /config` (`setFlags`) et sert au
 *   gating (composable `useFeatureFlag`, directive `v-feature`, garde de route).
 *   `/config` n'expose QUE les flags activés : toute clé absente est traitée
 *   comme désactivée.
 * - `loaded` distingue « pas encore chargé » de « aucun flag activé » (la map
 *   peut être légitimement vide).
 * - `list` n'est chargé qu'à la demande, pour l'écran d'admin (libellés + bascule).
 */
export const useFeatureFlagStore = defineStore("featureFlagStore", () => {
  const flags = ref<Record<string, boolean>>({});
  const loaded = ref(false);
  const list = ref<FeatureFlagDto[]>([]);

  /** Alimente l'état des flags depuis la config chargée au boot. */
  function setFlags(featureFlags: Record<string, boolean>) {
    flags.value = { ...featureFlags };
    loaded.value = true;
  }

  /** Un flag est actif s'il est explicitement à `true` (absent = désactivé). */
  function isEnabled(key: string): boolean {
    return flags.value[key] === true;
  }

  /**
   * Filtre déclaratif : un élément SANS clé de flag est toujours autorisé, un
   * élément avec clé l'est si son flag est actif. C'est LA primitive des listes
   * filtrées (navigation, onglets, plan du site) — le motif
   * `!key || isEnabled(key)` ne doit jamais être réécrit en place.
   */
  function allows(key?: string): boolean {
    return !key || isEnabled(key);
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

  /** Recharge l'état des flags depuis `GET /config` (sans passer par le cache de boot). */
  async function refresh() {
    const response = await api.getConfig();
    if (response.response.ok && response.data) {
      setFlags(response.data.featureFlags);
    }
  }

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Suivi quasi temps réel : rafraîchit périodiquement les flags pour que les
   * utilisateurs DÉJÀ connectés voient une bascule sans recharger la page
   * (navigation, onglets et directives sont réactifs au store ; App.vue éjecte
   * d'une route dont le flag vient d'être coupé). Idempotent.
   */
  function startPolling(intervalMs = 60_000) {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      void refresh().catch(() => {
        // Erreur transitoire : on garde l'état courant, prochain tick dans une minute.
      });
    }, intervalMs);
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
    loaded,
    list,
    isEnabled,
    allows,
    setFlags,
    refresh,
    startPolling,
    fetchAll,
    toggle,
  };
});
