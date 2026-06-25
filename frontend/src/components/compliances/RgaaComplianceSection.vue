<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { rgaaControllerFindAll, rgaaControllerCreate, rgaaControllerUpdate, rgaaControllerDelete } from "@/client/sdk.gen";
import type { CreateRgaaComplianceDto, RgaaComplianceDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { Permission } from "@/client/types.gen";
import { formatDateFR, toDateInputValue, toISODateTime } from "@/composables/use-date";
import RefAppTable from "@/components/RefAppTable.vue";
import type { TableColumn } from "@/types/table";
import type { ApplicationWithPerms } from "@/models/Application";

const props = defineProps<{ applicationId: string; appPerms: ApplicationWithPerms["myPerms"] }>();

const toaster = useToasterStore();
const userStore = useUserStore();

const items = ref<RgaaComplianceDto[]>([]);
const isLoading = ref(false);
const showModal = ref(false);
const editingItem = ref<RgaaComplianceDto | null>(null);
const submitting = ref(false);

const form = ref<Record<string, string | number | undefined>>({});

const canWrite = computed(() => userStore.hasPermissions([Permission.COMPLIANCE_WRITE], Array.from(props.appPerms)));

const tableColumns: TableColumn[] = [
  { field: "service_url", header: "URL du service", sortable: false },
  { field: "audit_date", header: "Date d'audit", sortable: false },
  { field: "accessibility_url", header: "Déclaration d'accessibilité", sortable: false },
  { field: "score", header: "Score", sortable: false },
  { field: "actions", header: "Actions", sortable: false },
];

const modalTitle = computed(() => (editingItem.value ? "Modifier la conformité RGAA" : "Ajouter une conformité RGAA"));

function scoreLabel(score: number | undefined | null): string {
  if (score == null) return "Non renseigné";
  if (score === 100) return "Conforme";
  if (score >= 50) return "Partiellement conforme";
  return "Non conforme";
}

async function load() {
  isLoading.value = true;
  try {
    const res = await rgaaControllerFindAll({ path: { applicationId: props.applicationId } });
    items.value = res.data ?? [];
  } catch {
    toaster.addErrorMessage("Erreur lors du chargement des conformités RGAA.");
  } finally {
    isLoading.value = false;
  }
}

onMounted(load);

function openCreate() {
  editingItem.value = null;
  form.value = {};
  showModal.value = true;
}

function openEdit(item: RgaaComplianceDto) {
  editingItem.value = item;
  form.value = {
    service_url: item.service_url || undefined,
    accessibility_url: item.accessibility_url || undefined,
    score_percentage: item.score_percentage || undefined,
    audit_date: toDateInputValue(item.audit_date) || undefined,
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  form.value = {};
  editingItem.value = null;
}

function buildPayload(): CreateRgaaComplianceDto {
  return {
    service_url: form.value.service_url && form.value.service_url !== "" ? String(form.value.service_url) : null,
    accessibility_url: form.value.accessibility_url && form.value.accessibility_url !== "" ? String(form.value.accessibility_url) : null,
    score_percentage:
      form.value.score_percentage != null && form.value.score_percentage !== "" ? Number(form.value.score_percentage) : null,
    audit_date: form.value.audit_date ? (toISODateTime(String(form.value.audit_date)) ?? null) : null,
  };
}

async function saveUpdate(payload: CreateRgaaComplianceDto, editing: RgaaComplianceDto) {
  const res = await rgaaControllerUpdate({
    path: { applicationId: props.applicationId, id: editing.id },
    body: payload,
  });
  const idx = items.value.findIndex((i) => i.id === editing.id);
  if (idx !== -1 && res.data) items.value[idx] = res.data;
  toaster.addSuccessMessage("Conformité RGAA mise à jour avec succès !");
}

async function saveCreate(payload: CreateRgaaComplianceDto) {
  const res = await rgaaControllerCreate({
    path: { applicationId: props.applicationId },
    body: payload,
  });
  if (res?.error?.message) {
    toaster.addErrorMessage(res.error.message);
  }
  if (res.data) {
    items.value.push(res.data);
    toaster.addSuccessMessage("Conformité RGAA créée avec succès !");
  }
}

async function save() {
  submitting.value = true;
  const payload = buildPayload();
  const editing = editingItem.value;
  try {
    if (editing) {
      await saveUpdate(payload, editing);
    } else {
      await saveCreate(payload);
    }
    closeModal();
  } catch {
    toaster.addErrorMessage(
      editing ? "Erreur lors de la modification de la conformité RGAA." : "Erreur lors de la création de la conformité RGAA.",
    );
  } finally {
    submitting.value = false;
  }
}

async function remove(item: RgaaComplianceDto) {
  if (!confirm(`Supprimer la conformité RGAA pour « ${item.service_url ?? "ce site"} » ?`)) return;
  try {
    await rgaaControllerDelete({
      path: { applicationId: props.applicationId, id: item.id },
    });
    items.value = items.value.filter((i) => i.id !== item.id);
    toaster.addSuccessMessage("Conformité RGAA supprimée.");
  } catch {
    toaster.addErrorMessage("Erreur lors de la suppression de la conformité RGAA.");
  }
}
</script>

<template>
  <section data-testid="rgaa-section">
    <div class="fr-grid-row fr-grid-row--middle fr-justify-content-between fr-mb-2w">
      <h4 class="fr-mb-0">Conformités RGAA</h4>
      <DsfrButton
        v-if="canWrite"
        icon="fr-icon-add-line"
        size="sm"
        label="Ajouter"
        data-testid="rgaa-add-btn"
        :disabled="isLoading"
        @click="openCreate"
        class="fr-ml-1w"
      />
    </div>

    <AppLoader v-if="isLoading" data-testid="rgaa-loader" />

    <div v-else>
      <p v-if="items.length === 0" class="fr-text--sm fr-text--light" data-testid="rgaa-empty">
        Aucune conformité RGAA renseignée pour cette application.
      </p>

      <RefAppTable v-else :items="items" :columns="tableColumns" data-testid="rgaa-table">
        <template #body-service_url="{ data }">
          <a v-if="data.service_url" :href="data.service_url" target="_blank" rel="noopener noreferrer">
            {{ data.service_url }}
          </a>
          <span v-else>Site non renseigné</span>
        </template>

        <template #body-audit_date="{ data }">
          {{ data.audit_date ? formatDateFR(data.audit_date) : "Non renseignée" }}
        </template>

        <template #body-accessibility_url="{ data }">
          <a v-if="data.accessibility_url" :href="data.accessibility_url" target="_blank" rel="noopener noreferrer">
            {{ data.accessibility_url }}
          </a>
          <span v-else>Non renseignée</span>
        </template>

        <template #body-score="{ data }">
          <span v-if="data.score_percentage != null">{{ data.score_percentage }}% - {{ scoreLabel(data.score_percentage) }}</span>
          <span v-else>Non renseigné</span>
        </template>

        <template #body-actions="{ data }">
          <div v-if="canWrite">
            <DsfrButton
              tertiary
              icon="ri-edit-line"
              :aria-label="`Modifier la conformité RGAA pour ${data.service_url ?? 'ce site'}`"
              data-testid="rgaa-edit-btn"
              @click="openEdit(data)"
              class="fr-mr-1w"
            >
              Modifier
            </DsfrButton>
            <DsfrButton
              tertiary
              icon="ri-delete-bin-line"
              :aria-label="`Supprimer la conformité RGAA pour ${data.service_url ?? 'ce site'}`"
              data-testid="rgaa-delete-btn"
              @click="remove(data)"
            >
              Supprimer
            </DsfrButton>
          </div>
        </template>
      </RefAppTable>
    </div>

    <DsfrModal v-if="showModal" :title="modalTitle" :opened="showModal" @close="closeModal">
      <form @submit.prevent="save">
        <AppLoader v-if="submitting" />
        <template v-else>
          <DsfrInput v-model="form.service_url" label="URL du service" label-visible type="url" data-testid="rgaa-form-service-url" />
          <DsfrInput
            v-model="form.accessibility_url"
            label="URL de la déclaration d'accessibilité"
            label-visible
            type="url"
            data-testid="rgaa-form-accessibility-url"
          />
          <DsfrInput
            v-model="form.score_percentage"
            label="Score RGAA (%)"
            label-visible
            type="number"
            input-mode="decimal"
            min="0"
            max="100"
            step="0.01"
            data-testid="rgaa-form-score"
          />
          <DsfrInput v-model="form.audit_date" label="Date d'audit" label-visible type="date" data-testid="rgaa-form-audit-date" />
          <DsfrButton type="submit" label="Enregistrer" data-testid="rgaa-form-submit" />
        </template>
      </form>
    </DsfrModal>
  </section>
</template>
