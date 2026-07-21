<script setup lang="ts">
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { DsfrAccordion, DsfrAccordionsGroup, DsfrToggleSwitch } from "@gouvminint/vue-dsfr";
import type { FeatureFlagDto, FeatureFlagLogDto } from "@/client/types.gen";
import api from "@/api";
import { useFeatureFlagStore } from "@/stores/featureFlagStore";
import { useToasterStore } from "@/stores/toasterStore";

const featureFlagStore = useFeatureFlagStore();
const toaster = useToasterStore();

// La liste fait foi dans le store (mise à jour par fetchAll/toggle) ; le
// composant ne garde que de l'état d'UI (chargement, bascules en cours,
// historiques chargés à la demande).
const { list } = storeToRefs(featureFlagStore);
const isLoading = ref(false);
// Clés en cours de bascule, pour désactiver le toggle le temps de l'aller-retour.
const pending = ref<Set<string>>(new Set());
// Historique par flag, chargé au premier dépliage de l'accordéon.
const histories = ref<Record<string, FeatureFlagLogDto[]>>({});
// Index d'accordéon ouvert par flag (un DsfrAccordionsGroup mono-accordéon par
// flag : 0 = ouvert, -1 = fermé).
const openHistory = ref<Record<string, number>>({});

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
    // L'historique affiché devient obsolète : rechargé au prochain dépliage.
    delete histories.value[flag.key];
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

async function loadHistory(key: string) {
  if (histories.value[key]) return;
  const response = await api.featureFlagControllerHistory({ path: { key } });
  if (response.response.ok && response.data) {
    histories.value = { ...histories.value, [key]: response.data };
  } else {
    toaster.addErrorMessage("Impossible de charger l'historique du flag.");
  }
}

function onHistoryToggle(key: string, index: number) {
  openHistory.value = { ...openHistory.value, [key]: index };
  if (index === 0) void loadHistory(key);
}

onMounted(fetchFlags);

/** Date/heure de bascule, au format français. */
function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString("fr-FR", {
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
      <li v-for="flag in list" :key="flag.key" class="fr-mb-3w" :data-testid="`feature-flag-${flag.key}`">
        <DsfrToggleSwitch
          :model-value="flag.enabled"
          :label="flag.label"
          :hint="flag.description ?? undefined"
          :disabled="pending.has(flag.key)"
          :data-testid="`feature-flag-toggle-${flag.key}`"
          @update:model-value="(value: boolean) => onToggle(flag, value)"
        />
        <p class="fr-hint-text fr-mb-1v" :data-testid="`feature-flag-updated-${flag.key}`">
          Dernière bascule : {{ formatDate(flag.updatedAt) }}
        </p>
        <DsfrAccordionsGroup
          :model-value="openHistory[flag.key] ?? -1"
          @update:model-value="(index: number) => onHistoryToggle(flag.key, index)"
        >
          <DsfrAccordion
            :id="`feature-flag-history-${flag.key}`"
            title="Historique des bascules"
            :data-testid="`feature-flag-history-${flag.key}`"
          >
            <p v-if="!histories[flag.key]" role="status">Chargement…</p>
            <p v-else-if="histories[flag.key].length === 0" role="status">Aucune bascule enregistrée.</p>
            <ul v-else class="fr-text--sm fr-mb-0" :data-testid="`feature-flag-history-list-${flag.key}`">
              <li v-for="(entry, index) in histories[flag.key]" :key="index">
                {{ formatDate(entry.changedAt) }} — {{ entry.enabled ? "activé" : "désactivé" }} par
                {{ entry.changedByEmail ?? "compte supprimé" }}
              </li>
            </ul>
          </DsfrAccordion>
        </DsfrAccordionsGroup>
      </li>
    </ul>
  </div>
</template>
