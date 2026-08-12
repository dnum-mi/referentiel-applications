<script setup lang="ts">
import api from "@/api/index";
import { type EolProductDto, type TechnologyDto, Permission } from "@/client/types.gen";
import useModal from "@/composables/use-modal";
import type { APP_PERMISSIONS, Application } from "@/models/Application";
import { useToasterStore } from "@/stores/toasterStore";
import type { TableColumn } from "@/types/table";
import { computed, nextTick, onBeforeMount, ref } from "vue";
import RefAppTable from "../RefAppTable.vue";
import TechnologyForm from "./TechnologyForm.vue";
import { useAppPermission } from "@/composables/use-app-permission";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  application: Application & { myPerms: Set<APP_PERMISSIONS> };
  isMobile?: boolean;
}>();

const toaster = useToasterStore();
const technologyModal = useModal<TechnologyDto>();

const technologies = ref<TechnologyDto[]>([]);
const eolProducts = ref<EolProductDto[]>([]);
const loading = ref(false);
const showDeleteConfirmation = ref(false);
const technologyToDelete = ref<TechnologyDto | null>(null);
const statusMessage = ref("");
const lastTrigger = ref<HTMLElement | null>(null);

const canEdit = useAppPermission(() => props.application.myPerms, [Permission.TECHNOLOGY_WRITE]);

const columns: TableColumn[] = [
  { field: "Technologie", header: "Technologie", sortable: true },
  { field: "Produit", header: "Produit", sortable: true },
  { field: "Version", header: "Version", sortable: true },
  { field: "Documentation", header: "Documentation", sortable: false },
  { field: "FinDeVie", header: "Fin de vie", sortable: true },
  { field: "Actions", header: "Actions", sortable: false },
];

function formatEol(value?: string | Date | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("fr-FR");
}

// Fin de vie « proche » : dans moins de 6 mois.
const EOL_SOON_MS = 182 * 24 * 60 * 60 * 1000;

type EolStatus = "eol" | "eol-soon" | "eoas-passed" | null;

function computeEolStatus(techno: TechnologyDto): EolStatus {
  const now = Date.now();
  const eol = techno.eolDate ? new Date(techno.eolDate).getTime() : null;
  const eoas = techno.eoasDate ? new Date(techno.eoasDate).getTime() : null;
  if (eol !== null && eol < now) return "eol";
  if (eol !== null && eol < now + EOL_SOON_MS) return "eol-soon";
  if (eoas !== null && eoas < now) return "eoas-passed";
  return null;
}

const tableRows = computed(() =>
  technologies.value.map((techno) => {
    return {
      id: techno.id,
      Technologie: techno.technology,
      Produit: techno.product,
      Version: techno.version || "—",
      Documentation: techno.docUrl || "",
      FinDeVie: formatEol(techno.eolDate),
      eolStatus: computeEolStatus(techno),
      // eolCheckedAt renseigné + eolProduct null = produit non suivi par endoflife.date
      unknownProduct: Boolean(techno.eolCheckedAt) && !techno.eolProduct,
      latestVersion: techno.version && techno.latestVersion && techno.latestVersion !== techno.version ? techno.latestVersion : null,
      Actions: {
        edit: () => technologyModal.openModal(techno),
        remove: () => askDelete(techno),
      },
    };
  }),
);

async function fetchTechnologies(applicationId: string) {
  const response = await api.technologyControllerFindAll({ path: { applicationId } });
  technologies.value = response.data ?? [];
}

// Catalogue endoflife.date pour l'autocomplétion du produit (best-effort :
// en cas d'échec, la saisie reste libre).
async function fetchEolProducts(applicationId: string) {
  try {
    const response = await api.technologyControllerListEolProducts({ path: { applicationId } });
    eolProducts.value = response.data ?? [];
  } catch {
    eolProducts.value = [];
  }
}

function rememberTrigger(event: Event) {
  lastTrigger.value = (event.currentTarget as HTMLElement) ?? null;
}

onBeforeMount(async () => {
  loading.value = true;
  try {
    await Promise.all([fetchTechnologies(props.application.id), fetchEolProducts(props.application.id)]);
  } finally {
    loading.value = false;
  }
});

async function handleSave(technology: {
  id?: string;
  technology: string;
  product: string;
  version?: string | null;
  docUrl?: string | null;
}) {
  loading.value = true;
  technologyModal.closeModal();
  const body = {
    technology: technology.technology,
    product: technology.product,
    version: technology.version,
    docUrl: technology.docUrl,
  };
  try {
    if (technology.id) {
      await api.technologyControllerUpdate({
        path: { applicationId: props.application.id, id: technology.id },
        body,
      });
    } else {
      await api.technologyControllerCreate({
        path: { applicationId: props.application.id },
        body,
      });
    }
    await fetchTechnologies(props.application.id);
    statusMessage.value = "Technologie sauvegardée avec succès !";
    toaster.addSuccessMessage("Technologie sauvegardée avec succès !");
    await nextTick();
    lastTrigger.value?.focus();
  } catch {
    toaster.addErrorMessage("Erreur lors de la sauvegarde de la technologie.");
  } finally {
    loading.value = false;
  }
}

function askDelete(technology: TechnologyDto) {
  technologyToDelete.value = technology;
  showDeleteConfirmation.value = true;
}

async function confirmDelete() {
  if (!technologyToDelete.value) return;
  try {
    await api.technologyControllerDelete({
      path: { applicationId: props.application.id, id: technologyToDelete.value.id },
    });
    await fetchTechnologies(props.application.id);
    toaster.addSuccessMessage("Technologie supprimée avec succès !");
  } catch {
    toaster.addErrorMessage("Erreur lors de la suppression de la technologie.");
  } finally {
    showDeleteConfirmation.value = false;
    technologyToDelete.value = null;
  }
}

function cancelDelete() {
  showDeleteConfirmation.value = false;
  technologyToDelete.value = null;
}
</script>

<template>
  <p class="fr-sr-only" aria-live="polite" aria-atomic="true" data-testid="technology-status">{{ statusMessage }}</p>
  <div class="fr-grid-row fr-grid-row--middle fr-mb-3w" v-bind="$attrs" data-testid="technology-tab">
    <div class="fr-col">
      <h3 class="fr-mb-0">Technologie</h3>
    </div>
    <div class="fr-col-auto">
      <DsfrButton
        type="button"
        title="Ajouter une technologie à l’application"
        aria-label="Ajouter une technologie"
        class="fr-btn--icon-left fr-icon-add-line"
        :disabled="!canEdit"
        data-testid="technology-add-btn"
        @click="
          (e) => {
            rememberTrigger(e);
            technologyModal.openCreateModal();
          }
        "
      >
        Ajouter une technologie
      </DsfrButton>
    </div>
  </div>

  <AppLoader v-if="loading" data-testid="technology-loader"></AppLoader>

  <div v-else-if="technologies.length === 0" class="text-center" data-testid="technology-empty-state">
    <p>Aucune technologie renseignée.</p>
  </div>

  <RefAppTable v-else :items="tableRows" :columns="columns" data-test-id="technology-table" empty-message="Aucune technologie renseignée.">
    <template #body-Documentation="{ data }">
      <a
        v-if="data.Documentation"
        :href="data.Documentation"
        target="_blank"
        rel="noopener noreferrer"
        :title="data.Documentation"
        :data-testid="`technology-doc-link-${data.id}`"
      >
        Documentation
      </a>
      <template v-else>—</template>
    </template>

    <template #body-Version="{ data }">
      <span>{{ data.Version }}</span>
      <span v-if="data.latestVersion" class="fr-hint-text" :data-testid="`technology-latest-version-${data.id}`">
        dernière du cycle : {{ data.latestVersion }}
      </span>
    </template>

    <template #body-FinDeVie="{ data }">
      <template v-if="data.eolStatus === 'eol'">
        <DsfrBadge
          type="error"
          label="Fin de vie"
          small
          :title="data.FinDeVie ? `Fin de vie depuis le ${data.FinDeVie}` : undefined"
          :data-testid="`technology-eol-badge-${data.id}`"
        ></DsfrBadge>
      </template>
      <template v-else-if="data.eolStatus === 'eol-soon'">
        <DsfrBadge
          type="warning"
          label="Fin de vie proche"
          small
          :title="`Fin de vie prévue le ${data.FinDeVie}`"
          :data-testid="`technology-eol-soon-badge-${data.id}`"
        ></DsfrBadge>
        <span class="fr-hint-text">{{ data.FinDeVie }}</span>
      </template>
      <template v-else-if="data.eolStatus === 'eoas-passed'">
        <DsfrBadge
          type="info"
          label="Support actif terminé"
          small
          :title="data.FinDeVie ? `Fin de vie prévue le ${data.FinDeVie}` : undefined"
          :data-testid="`technology-eoas-badge-${data.id}`"
        ></DsfrBadge>
        <span v-if="data.FinDeVie" class="fr-hint-text">{{ data.FinDeVie }}</span>
      </template>
      <span v-else-if="data.FinDeVie" :title="`Fin de support prévue le ${data.FinDeVie}`">{{ data.FinDeVie }}</span>
      <span
        v-else-if="data.unknownProduct"
        class="fr-hint-text"
        title="Produit non suivi par endoflife.date : la fin de vie ne peut pas être vérifiée automatiquement"
        :data-testid="`technology-eol-unknown-${data.id}`"
      >
        Produit non suivi
      </span>
      <template v-else>—</template>
    </template>

    <template #body-Actions="{ data }">
      <DsfrButton
        title="Modifier la technologie"
        aria-label="Modifier la technologie"
        tertiary
        size="sm"
        icon="fr-icon-edit-line"
        :disabled="!canEdit"
        data-testid="technology-edit-btn"
        @click="
          (e) => {
            rememberTrigger(e);
            data.Actions.edit();
          }
        "
      >
        Modifier
      </DsfrButton>
      <DsfrButton
        title="Supprimer la technologie"
        aria-label="Supprimer la technologie"
        tertiary
        size="sm"
        icon="fr-icon-delete-line"
        :disabled="!canEdit"
        data-testid="technology-delete-btn"
        @click="data.Actions.remove()"
      >
        Supprimer
      </DsfrButton>
    </template>
  </RefAppTable>

  <DsfrModal
    :opened="technologyModal.isModalOpen.value || technologyModal.isCreateModalOpen.value"
    :title="technologyModal.isCreateModalOpen.value ? 'Ajouter une technologie' : 'Modifier la technologie'"
    data-testid="technology-modal"
    @close="technologyModal.closeModal"
  >
    <TechnologyForm
      :initial-data="technologyModal.selectedItem.value ?? undefined"
      :is-submitting="loading"
      :eol-products="eolProducts"
      data-testid="technology-form-container"
      @submit="handleSave"
      @cancel="technologyModal.closeModal"
    ></TechnologyForm>
  </DsfrModal>

  <DeleteConfirmationModal
    :opened="showDeleteConfirmation"
    item-name="cette technologie"
    data-testid="technology-delete-modal"
    @confirm="confirmDelete"
    @cancel="cancelDelete"
  ></DeleteConfirmationModal>
</template>
