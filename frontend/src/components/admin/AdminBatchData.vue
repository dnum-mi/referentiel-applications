<script setup lang="ts">
import api from "@/api";
import type { UserControllerSyncOrganizationsFromMaiaData } from "@/client";
import { useToasterStore } from "@/stores/toasterStore";

const props = defineProps<{ loading: boolean }>();
const emit = defineEmits<(e: "recomputeQuality") => void>();
const toaster = useToasterStore();
const isBatchLoading = ref(false);

async function runMaiaBatch(body: NonNullable<UserControllerSyncOrganizationsFromMaiaData["body"]> = { onlyMissing: true }) {
  isBatchLoading.value = true;
  try {
    await api.userControllerSyncOrganizationsFromMaia({ body });
    toaster.addSuccessMessage("Batch MAIA lancé en tâche de fond.");
  } catch (error) {
    toaster.addErrorMessage("Erreur lors du lancement du batch MAIA.");
    console.error(error);
  } finally {
    isBatchLoading.value = false;
  }
}

async function runMaiaActorSync() {
  isBatchLoading.value = true;
  try {
    await api.actorControllerSyncFromMaia();
    toaster.addSuccessMessage("Batch MAIA lancé en tâche de fond.");
  } catch (error) {
    toaster.addErrorMessage("Erreur lors du lancement du batch MAIA.");
    console.error(error);
  } finally {
    isBatchLoading.value = false;
  }
}
</script>

<template>
  <div class="container">
    <div class="section-card--mt">
      <h2 class="fr-h2">Gestion de l'indice de qualité</h2>
      <DsfrButton
        :label="props.loading ? 'Mise à jour en cours...' : 'Calculer l’indice de qualité de toutes les applications'"
        :icon="{ name: 'ri-refresh-line', animation: props.loading ? 'spin' : undefined }"
        :disabled="props.loading"
        data-testid="admin-quality-recompute-btn"
        title="Lance le calcul de l'indice de qualité pour toutes les applications"
        aria-label="Calculer l'indice de qualité"
        @click="emit('recomputeQuality')"
      />
    </div>
    <div class="section-card--mt">
      <h2 class="fr-h2">Synchronisation des organisation avec MAIA</h2>
      <div class="maia-sync-organization-container">
        <DsfrButton
          :label="
            isBatchLoading
              ? 'Batch MAIA en cours...'
              : 'Synchroniser les utilisateurs et organisations avec MAIA (utilisateurs sans organisation)'
          "
          :disabled="isBatchLoading"
          :icon="{ name: 'ri-refresh-line', animation: isBatchLoading ? 'spin' : undefined }"
          data-testid="admin-users-maia-batch-btn"
          @click="runMaiaBatch()"
        />
        <DsfrButton
          :label="
            isBatchLoading
              ? 'Batch MAIA en cours...'
              : 'Synchroniser les utilisateurs et organisations avec MAIA (utilisateurs avec organisation)'
          "
          :disabled="isBatchLoading"
          :icon="{ name: 'ri-refresh-line', animation: isBatchLoading ? 'spin' : undefined }"
          data-testid="admin-users-maia-batch-btn"
          @click="runMaiaBatch({ onlyMissing: false })"
        />
      </div>
    </div>
    <div class="section-card--mt">
      <h2 class="fr-h2">Synchronisation des acteurs avec MAIA</h2>
      <div class="maia-sync-actor-container">
        <DsfrButton
          :label="isBatchLoading ? 'Batch MAIA en cours...' : 'Synchroniser les acteurs MAIA'"
          :disabled="isBatchLoading"
          :icon="{ name: 'ri-refresh-line', animation: isBatchLoading ? 'spin' : undefined }"
          data-testid="admin-actor-maia-batch-btn"
          @click="runMaiaActorSync()"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
}

.maia-sync-organization-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
}

.maia-sync-actor-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
}

.section-card--mt {
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 1rem;
  padding: 1rem;
}
</style>
