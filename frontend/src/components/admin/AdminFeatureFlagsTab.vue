<script setup lang="ts">
import { onMounted, ref } from "vue";
import { DsfrToggleSwitch } from "@gouvminint/vue-dsfr";
import type { FeatureFlagDto } from "@/client/types.gen";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";
import { useToasterStore } from "@/stores/toasterStore";

const featureFlagStore = useFeatureFlagStore();
const toaster = useToasterStore();

const flags = ref<FeatureFlagDto[]>([]);
const isLoading = ref(false);
// Clés en cours de bascule, pour désactiver le toggle le temps de l'aller-retour.
const pending = ref<Set<string>>(new Set());

async function fetchFlags() {
  isLoading.value = true;
  try {
    flags.value = await featureFlagStore.fetchAll();
  } catch {
    toaster.addErrorMessage("Impossible de charger les feature flags.");
  } finally {
    isLoading.value = false;
  }
}

async function onToggle(flag: FeatureFlagDto, enabled: boolean) {
  pending.value = new Set(pending.value).add(flag.key);
  try {
    const updated = await featureFlagStore.toggle(flag.key, enabled);
    flags.value = flags.value.map((f) => (f.key === updated.key ? updated : f));
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
</script>

<template>
  <div class="fr-p-2w">
    <p class="fr-hint-text fr-mb-2w">
      Activez ou désactivez des fonctionnalités à chaud, sans redéploiement. La bascule prend effet au prochain chargement du front.
    </p>

    <p v-if="isLoading" role="status">Chargement des feature flags…</p>
    <p v-else-if="flags.length === 0" role="status">Aucun feature flag n'est enregistré.</p>

    <ul v-else class="fr-toggle__list">
      <li v-for="flag in flags" :key="flag.key" class="fr-mb-2w" :data-testid="`feature-flag-${flag.key}`">
        <DsfrToggleSwitch
          :model-value="flag.enabled"
          :label="flag.label"
          :hint="flag.description ?? undefined"
          :disabled="pending.has(flag.key)"
          :data-testid="`feature-flag-toggle-${flag.key}`"
          @update:model-value="(value: boolean) => onToggle(flag, value)"
        />
      </li>
    </ul>
  </div>
</template>
