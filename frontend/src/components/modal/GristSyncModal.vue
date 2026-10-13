<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { GristDocumentReportDto, GristDocumentTablesDto, GristSyncTargetDto } from "@/client/types.gen";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useApplicationStore } from "@/stores/applicationStore";
import { useToasterStore } from "@/stores/toasterStore";

// Choix par document : une table existante ou une nouvelle table. Un document illisible est écarté (SKIP).
const NEW_TABLE = "__new__";
const SKIP = "";

const props = defineProps<{
  opened: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { filters, total } = useApplicationSearch();
const applicationStore = useApplicationStore();
const toaster = useToasterStore();

const documents = ref<GristDocumentTablesDto[]>([]);
const choices = ref<Record<string, string>>({});
const isLoading = ref(false);
const isSyncing = ref(false);
const errorMessage = ref("");

// Par défaut : la première table RefApp du document, ou une nouvelle s'il n'en a pas.
async function load() {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    documents.value = await applicationStore.listGristTables();
    choices.value = Object.fromEntries(documents.value.map(({ docId, tables, error }) => [docId, error ? SKIP : (tables[0] ?? NEW_TABLE)]));
  } catch (error) {
    console.error("Erreur lors de la lecture des documents Grist", error);
    documents.value = [];
    errorMessage.value = "Impossible de lire vos documents Grist. Vérifiez votre connexion Grist dans votre profil.";
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => props.opened,
  (opened) => {
    if (opened) load();
  },
  { immediate: true },
);

function optionsFor({ tables }: GristDocumentTablesDto) {
  return [...tables.map((tableId) => ({ value: tableId, text: `${tableId} (mise à jour)` })), { value: NEW_TABLE, text: "Nouvelle table" }];
}

const targets = computed<GristSyncTargetDto[]>(() =>
  documents.value
    .map(({ docId }) => ({ docId, choice: choices.value[docId] ?? SKIP }))
    .filter(({ choice }) => choice !== SKIP)
    .map(({ docId, choice }) => (choice === NEW_TABLE ? { docId, newTable: true } : { docId, tableId: choice })),
);

const label = ({ docId, tableId }: GristDocumentReportDto) => (tableId ? `${docId} › ${tableId}` : docId);

function announce(report: GristDocumentReportDto[]) {
  const synced = report.filter((document) => document.status === "ok");
  const failed = report.filter((document) => document.status === "error");
  if (synced.length) {
    // La sélection est la même pour toutes les tables : seuls grisés et retirés varient.
    const sum = (key: "rowsGreyed" | "rowsDeleted") => synced.reduce((count, document) => count + (document[key] ?? 0), 0);
    toaster.addSuccessMessage(
      `Grist synchronisé (${synced.map(label).join(", ")}) : ${synced[0].rowsWritten ?? 0} applications, ${sum("rowsGreyed")} grisées, ${sum("rowsDeleted")} retirées.`,
    );
  }
  if (failed.length) {
    toaster.addErrorMessage(
      `Synchronisation Grist en échec pour ${failed.map((document) => `${label(document)} (${document.error ?? "erreur inconnue"})`).join(", ")}.`,
    );
  }
}

async function confirmSync() {
  if (isSyncing.value || isLoading.value) return;
  if (!targets.value.length) {
    errorMessage.value = "Aucun document lisible à synchroniser.";
    return;
  }
  isSyncing.value = true;
  errorMessage.value = "";
  try {
    const { documents: report } = await applicationStore.syncWithGrist(filters.value, targets.value);
    announce(report);
    emit("close");
  } catch (error) {
    console.error("Erreur lors de la synchronisation avec Grist", error);
    errorMessage.value = "Une erreur est survenue lors de la synchronisation avec Grist. Veuillez réessayer.";
  } finally {
    isSyncing.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <DsfrModal :opened="opened" title="Synchroniser avec Grist" data-testid="grist-sync-modal" @close="emit('close')">
      <p class="fr-text--sm fr-hint-text fr-mb-3w" style="white-space: normal">
        Les <strong>{{ total }}</strong> application(s) correspondant aux filtres actuels seront écrites dans la table choisie pour chaque
        document. Une table existante prend cette sélection : les lignes qui n'en font plus partie sont grisées ou retirées. Une nouvelle
        table garde les autres intactes.
      </p>

      <DsfrAlert v-if="errorMessage" alert type="error" :description="errorMessage" small class="fr-mb-3w" data-testid="grist-sync-error" />

      <output class="fr-text--sm" aria-live="polite" aria-atomic="true" data-testid="grist-sync-status">
        {{ isLoading ? "Lecture de vos documents Grist…" : isSyncing ? "Synchronisation avec Grist en cours…" : "" }}
      </output>
      <div v-for="document in isLoading ? [] : documents" :key="document.docId" class="fr-mb-2w" data-testid="grist-sync-document">
        <DsfrSelect
          v-model="choices[document.docId]"
          :options="optionsFor(document)"
          :label="`Document ${document.docId}`"
          :disabled="!!document.error"
          :error-message="document.error ? `Document illisible : ${document.error}` : undefined"
          :data-testid="`grist-sync-choice-${document.docId}`"
        />
      </div>

      <template #footer>
        <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
          <li><DsfrButton label="Annuler" secondary data-testid="grist-sync-cancel-btn" @click="emit('close')" /></li>
          <li>
            <DsfrButton
              :label="isSyncing ? 'Synchronisation…' : 'Synchroniser'"
              :aria-disabled="isSyncing || isLoading"
              :aria-busy="isSyncing"
              data-testid="grist-sync-confirm-btn"
              @click="confirmSync"
            />
          </li>
        </DsfrButtonGroup>
      </template>
    </DsfrModal>
  </Teleport>
</template>
