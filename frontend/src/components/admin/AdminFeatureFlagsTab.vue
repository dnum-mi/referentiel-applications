<script setup lang="ts">
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { DsfrToggleSwitch } from "@gouvminint/vue-dsfr";
import type { FeatureFlagDto } from "@/client/types.gen";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";
import { useToasterStore } from "@/stores/toasterStore";

const featureFlagStore = useFeatureFlagStore();
const toaster = useToasterStore();

// La liste fait foi dans le store (mise à jour par fetchAll/toggle) ; le
// composant ne garde que de l'état d'UI (chargement, bascules en cours).
const { list } = storeToRefs(featureFlagStore);
const isLoading = ref(false);
// Clés en cours de bascule, pour désactiver le toggle le temps de l'aller-retour.
const pending = ref<Set<string>>(new Set());

async function fetchFlags() {
  isLoading.value = true;
  try {
    await featureFlagStore.fetchAll();
  } catch {
    toaster.addErrorMessage("Impossible de charger les feature flags.");
  } finally {
    isLoading.value = false;
  }
}

async function onToggle(flag: FeatureFlagDto, enabled: boolean) {
  pending.value = new Set(pending.value).add(flag.key);
  try {
    await featureFlagStore.toggle(flag.key, enabled);
    toaster.addSuccessMessage(`« ${flag.label} » ${enabled ? "activé" : "désactivé"}.`);
  } catch {
    toaster.addErrorMessage(`Échec de la bascule de « ${flag.label} ».`);
    // Recharge pour refléter l'état réel côté serveur en cas d'échec.
    await fetchFlags();
  } finally {
    const next = new Set(pending.value);
    next.delete(flag.key);
    pending.value = next;
  }
}

onMounted(fetchFlags);

/** Date/heure de dernière bascule, au format français. */
function formatUpdatedAt(updatedAt: string | Date): string {
  return new Date(updatedAt).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
</script>

<template>
  <div class="fr-p-2w">
    <p class="fr-hint-text fr-mb-2w">
      Activez ou désactivez des fonctionnalités à chaud, sans redéploiement. La bascule est immédiate côté serveur et prise en compte par
      les utilisateurs connectés en moins d'une minute (ou au prochain chargement).
    </p>

    <p v-if="isLoading" role="status">Chargement des feature flags…</p>
    <p v-else-if="list.length === 0" role="status">Aucun feature flag n'est enregistré.</p>

    <ul v-else class="fr-toggle__list">
      <li v-for="flag in list" :key="flag.key" class="fr-mb-2w" :data-testid="`feature-flag-${flag.key}`">
        <DsfrToggleSwitch
          :model-value="flag.enabled"
          :label="flag.label"
          :hint="flag.description ?? undefined"
          :disabled="pending.has(flag.key)"
          :data-testid="`feature-flag-toggle-${flag.key}`"
          @update:model-value="(value: boolean) => onToggle(flag, value)"
        />
        <p class="fr-hint-text fr-mb-0" :data-testid="`feature-flag-updated-${flag.key}`">
          Dernière bascule : {{ formatUpdatedAt(flag.updatedAt) }}
        </p>
      </li>
    </ul>
  </div>
</template>
