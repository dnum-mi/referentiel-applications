<script setup lang="ts">
import api from "@/api";
import type { ImportReportDto, UserControllerSyncOrganizationsFromMaiaData } from "@/client";
import { useToasterStore } from "@/stores/toasterStore";

const props = defineProps<{ loading: boolean }>();
const emit = defineEmits<(e: "recomputeQuality") => void>();
const toaster = useToasterStore();
const isBatchLoading = ref(false);

const selectedFile = ref<File | null>(null);
const isImporting = ref(false);
const importReport = ref<ImportReportDto | null>(null);

function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedFile.value = input.files?.[0] ?? null;
  importReport.value = null;
}

async function runActorImport() {
  if (!selectedFile.value) return;
  isImporting.value = true;
  try {
    const response = await api.actorControllerImportExcel({ body: { file: selectedFile.value } });
    if (!response.data) {
      throw new Error("Réponse d'import vide.");
    }
    importReport.value = response.data;
    const { created, updated, errors } = response.data.summary;
    const summary = `${created} créé(s), ${updated} mis à jour, ${errors} en erreur.`;
    if (errors > 0) {
      toaster.addErrorMessage(`Import terminé avec des erreurs : ${summary}`);
    } else {
      toaster.addSuccessMessage(`Import terminé : ${summary}`);
    }
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de l'import du fichier Excel.");
    console.error(error);
  } finally {
    isImporting.value = false;
  }
}

function downloadImportReport() {
  if (!importReport.value) return;
  const header = ["Onglet", "Ligne", "Statut", "Identifiant", "Détail"].join(";");
  const rows = importReport.value.entries.map((entry) =>
    [entry.sheet, String(entry.row), entry.status, entry.identifier ?? "", (entry.message ?? "").replace(/[\r\n;]+/g, " ")].join(";"),
  );
  const csv = [header, ...rows, "", ...importReport.value.logs].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const date = new Date().toISOString().split("T")[0];
  link.download = `rapport_import_acteurs_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

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
    <div class="section-card--mt">
      <h2 class="fr-h2">Import Excel des acteurs</h2>
      <p class="fr-hint-text">
        Importez ou mettez à jour des acteurs en masse à partir d'un fichier Excel au même format que l'export (un onglet « Acteurs »). Une
        ligne avec un « ID Acteur » met à jour l'acteur ; sans identifiant, un acteur est créé.
      </p>
      <div class="import-actor-container">
        <div class="fr-upload-group">
          <label class="fr-label" for="admin-import-actors-file">Fichier Excel (.xlsx)</label>
          <input
            id="admin-import-actors-file"
            class="fr-upload"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            data-testid="admin-import-actors-file"
            @change="onImportFileChange"
          />
        </div>
        <DsfrButton
          :label="isImporting ? 'Import en cours...' : 'Importer les acteurs'"
          :disabled="isImporting || !selectedFile"
          :icon="{ name: 'ri-upload-2-line', animation: isImporting ? 'spin' : undefined }"
          data-testid="admin-import-actors-submit"
          @click="runActorImport()"
        />
      </div>

      <div v-if="importReport" class="import-report" data-testid="admin-import-report">
        <p>
          <strong>Rapport d'exécution :</strong>
          <span data-testid="admin-import-report-summary">
            {{ importReport.summary.created }} créé(s), {{ importReport.summary.updated }} mis à jour, {{ importReport.summary.errors }} en
            erreur.
          </span>
        </p>
        <DsfrTable
          v-if="importReport.entries.length > 0"
          title="Détail par ligne"
          :headers="['Onglet', 'Ligne', 'Statut', 'Identifiant', 'Détail']"
        >
          <tr v-for="(entry, idx) in importReport.entries" :key="idx">
            <td>{{ entry.sheet }}</td>
            <td>{{ entry.row }}</td>
            <td>
              <span v-if="entry.status === 'created'" class="fr-badge fr-badge--success fr-badge--sm">Créé</span>
              <span v-else-if="entry.status === 'updated'" class="fr-badge fr-badge--info fr-badge--sm">Mis à jour</span>
              <span v-else class="fr-badge fr-badge--error fr-badge--sm">Erreur</span>
            </td>
            <td>{{ entry.identifier }}</td>
            <td>{{ entry.message }}</td>
          </tr>
        </DsfrTable>
        <DsfrButton
          label="Télécharger le rapport"
          secondary
          icon="ri-download-2-line"
          data-testid="admin-import-report-download"
          @click="downloadImportReport()"
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

.import-actor-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}

.import-report {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}

.section-card--mt {
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 1rem;
  padding: 1rem;
}
</style>
