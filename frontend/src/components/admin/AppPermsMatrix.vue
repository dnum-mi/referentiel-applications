<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import { useToasterStore } from "@/stores/toasterStore";
import api from "@/api/index";
import type { AppPermsDto, CreateActorTypeDto } from "@/client/types.gen";
import AppPermsMatrixHistory from "./AppPermsMatrixHistory.vue";
import PermissionWritePriorityRestart from "../PermissionWritePriorityRestart.vue";

const props = defineProps<{
  appPermsMatrix: AppPermsDto[];
}>();

const emits = defineEmits<{
  (e: "update:appPermsMatrix", value: AppPermsDto[]): void;
  (e: "reload"): void;
}>();
const actorTypeStore = useActorTypeStore();
const toaster = useToasterStore();

onMounted(async () => {
  // `includeSystem: true` : la matrice doit résoudre le libellé de TOUTES les lignes,
  // y compris le type d'acteur système (exclu par défaut de la liste des types assignables).
  await actorTypeStore.fetchAll(true);
});

// Colonnes dans l'ordre des onglets de la fiche application (#2083) — « Priorit. Redémarr. »
// et « Héberg. » n'ont pas d'onglet propre et restent accolées à « Infos » dont elles relèvent.
const permissionSuffixes = {
  App: { label: "Infos", title: "Informations" },
  PriorityRestart: { label: "Priorit. Redémarr.", title: "Prioritisation et redémarrage" },
  Hosting: { label: "Héberg.", title: "Hébergements" },
  Link: { label: "Liens", title: "Liens" },
  Compliance: { label: "Conformités", title: "Conformités" },
  Actor: { label: "Acteurs", title: "Acteurs" },
  Technology: { label: "Techno.", title: "Technologie" },
  Relation: { label: "Relations", title: "Relations" },
  Data: { label: "Données", title: "Données" },
  Metadata: { label: "Modifications", title: "Modifications" },
} as const satisfies Record<string, { label: string; title: string }>;
const permissionKeys = Object.keys(permissionSuffixes) as (keyof typeof permissionSuffixes)[];
// « Modifications » (Metadata) est rendue à part, APRÈS la colonne Signalements, pour suivre
// l'ordre des onglets de la fiche (Signalements avant Modifications).
const gridKeys = permissionKeys.filter((k) => k !== "Metadata");

// Clone la prop : c'est un brouillon local d'édition, il ne doit jamais muter l'état
// du parent (`AdminPermsMatrixTab.vue`) tant que l'utilisateur n'a pas cliqué « Enregistrer ».
const updatedMatrix = ref<AppPermsDto[]>(props.appPermsMatrix.map((perms) => ({ ...perms })));

// Resynchronise le brouillon si la matrice source est rechargée par le parent.
watch(
  () => props.appPermsMatrix,
  (newMatrix) => {
    updatedMatrix.value = newMatrix.map((perms) => ({ ...perms }));
  },
);

// Lignes triées par ordre alphabétique du type d'acteur, comme dans la modale create/edit acteur.
const sortedMatrix = computed(() =>
  [...updatedMatrix.value].sort((a, b) => {
    const labelA = actorTypeStore.actorTypes.find((at) => at.id === a.actorTypeId)?.label ?? "";
    const labelB = actorTypeStore.actorTypes.find((at) => at.id === b.actorTypeId)?.label ?? "";
    return labelA.localeCompare(labelB, "fr");
  }),
);

type PermissionValue = "none" | "Read" | "Write";
function updateMatrix(actorTypeId: string, permission: keyof typeof permissionSuffixes, value: PermissionValue) {
  const actorTypeIdx = updatedMatrix.value.findIndex((at) => at.actorTypeId === actorTypeId);
  if (actorTypeIdx === -1) return;
  if (permission === "PriorityRestart") {
    return;
  }
  updatedMatrix.value[actorTypeIdx][`${permission}Read`] = value === "Read" || value === "Write";
  // Seul « Metadata » n'a pas d'écriture (historique auto-généré). « Data » — et « Technology » —
  // ont bien un couple lecture/écriture : les exclure faisait que passer la colonne en RW ne
  // persistait jamais le `Write` (bug d'enregistrement de la colonne Données).
  if (permission !== "Metadata") {
    updatedMatrix.value[actorTypeIdx][`${permission}Write`] = value === "Write";
  }
}

function updateWritePriorityRestart(actorTypeId: string, value: boolean) {
  const actorTypeIdx = updatedMatrix.value.findIndex((at) => at.actorTypeId === actorTypeId);
  if (actorTypeIdx === -1) return;
  updatedMatrix.value[actorTypeIdx].AppWritePriority = value;
}

type ReportPermissionValue = "Read" | "Post" | "Manage";
function updateReportMatrix(actorTypeId: string, values: ReportPermissionValue[]) {
  const actorTypeIdx = updatedMatrix.value.findIndex((at) => at.actorTypeId === actorTypeId);
  if (actorTypeIdx === -1) return;

  updatedMatrix.value[actorTypeIdx].ReportRead = values.includes("Read") || values.includes("Manage");
  updatedMatrix.value[actorTypeIdx].ReportPost = values.includes("Post") || values.includes("Manage");
  updatedMatrix.value[actorTypeIdx].ReportManage = values.includes("Manage");
}

function saveAppPermsMatrix() {
  // Emit the updated matrix to the parent component

  emits("update:appPermsMatrix", updatedMatrix.value);
}

const isHistoryModalOpen = ref(false);

const isCreateActorTypeModalOpen = ref(false);
const isCreatingActorType = ref(false);
const newActorTypeForm = ref<CreateActorTypeDto>({ code: "", label: "", description: "" });

function openCreateActorTypeModal() {
  newActorTypeForm.value = { code: "", label: "", description: "" };
  isCreateActorTypeModalOpen.value = true;
}

function closeCreateActorTypeModal() {
  isCreateActorTypeModalOpen.value = false;
}

const isNewActorTypeFormValid = computed(() => newActorTypeForm.value.code.trim() !== "" && newActorTypeForm.value.label.trim() !== "");

async function createActorType() {
  isCreatingActorType.value = true;
  try {
    const response = await api.actorTypeControllerCreate({
      body: {
        code: newActorTypeForm.value.code.trim(),
        label: newActorTypeForm.value.label.trim(),
        description: newActorTypeForm.value.description?.trim() || undefined,
      },
    });
    if (response.response.ok) {
      toaster.addSuccessMessage("Type d'acteur créé avec succès");
      closeCreateActorTypeModal();
      // Rafraîchit le store partagé (liste utilisée par la matrice ET par le select de
      // type d'acteur des modales create/edit acteur, qui refera son propre fetch sans
      // `includeSystem` à sa prochaine ouverture) et la matrice elle-même (nouvelle ligne
      // créée côté back avec des droits à zéro, cf. DEFAULT_APP_PERMISSIONS).
      await actorTypeStore.fetchAll(true);
      emits("reload");
    } else {
      toaster.addErrorMessage("Erreur lors de la création du type d'acteur");
    }
  } catch (error) {
    console.error("Error creating actor type:", error);
    toaster.addErrorMessage("Erreur lors de la création du type d'acteur");
  } finally {
    isCreatingActorType.value = false;
  }
}
</script>

<template>
  <p class="fr-text--sm fr-mb-1w" data-testid="app-perms-legend">
    Légende : <strong>-</strong> aucun droit · <strong>RO</strong> lecture seule (Read Only) · <strong>RW</strong> lecture et écriture
    (Read/Write).
  </p>
  <div class="fr-mb-2w fr-text-right">
    <DsfrButton
      secondary
      size="sm"
      data-testid="app-perms-create-actor-type-btn"
      title="Ajouter un type d'acteur"
      aria-label="Ajouter un type d'acteur"
      @click="openCreateActorTypeModal"
    >
      Ajouter un type d'acteur
    </DsfrButton>
  </div>
  <DsfrTable title="Tableau des permissions des applications" data-testid="app-perms-table">
    <template #header>
      <tr>
        <th scope="col">Type d'acteur</th>
        <th v-for="key in gridKeys" :key="key" scope="col" style="min-width: 6rem" :title="permissionSuffixes[key].title">
          {{ permissionSuffixes[key].label }}
        </th>
        <th scope="col">Signalements</th>
        <th scope="col" style="min-width: 6rem" title="Modifications">Modifications</th>
      </tr>
    </template>
    <tr v-for="perms in sortedMatrix" :key="perms.actorTypeId" :data-testid="`app-perms-row-${perms.actorTypeId}`">
      <td>{{ actorTypeStore.actorTypes.find((at) => at.id === perms.actorTypeId)?.label ?? perms.actorTypeId }}</td>
      <td v-for="perm in gridKeys" :key="perm">
        <PermissionSelect
          v-if="perm === 'App'"
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :read="perms[`${perm}Read`] || false"
          :write="perms[`${perm}Write`] || false"
          :perm-order="['Read', 'Write']"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
        <PermissionSelect
          v-else-if="perm === 'Data' || perm === 'Technology'"
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :read="perms[`${perm}Read`] || false"
          :write="perms[`${perm}Write`] || false"
          :perm-order="['Read', 'Write', 'none']"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
        <PermissionWritePriorityRestart
          v-else-if="perm === 'PriorityRestart'"
          :id="`${perms.actorTypeId}-${perm}`"
          :checked="perms.AppWritePriority"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: boolean) => updateWritePriorityRestart(perms.actorTypeId, value)"
        />
        <PermissionSelect
          v-else
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :read="perms[`${perm}Read`] || false"
          :write="perms[`${perm}Write`] || false"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
      </td>
      <td style="min-width: 15rem">
        <ReportPermissionSelect
          :id="`${perms.actorTypeId}`"
          :read="perms.ReportRead"
          :post="perms.ReportPost"
          :manage="perms.ReportManage"
          :data-testid="`app-perms-report-${perms.actorTypeId}`"
          @update:model-value="(value: ReportPermissionValue[]) => updateReportMatrix(perms.actorTypeId, value)"
        />
      </td>
      <td>
        <PermissionSelect
          :id="`${perms.actorTypeId}-Metadata`"
          class="permission-select"
          :read="perms.MetadataRead || false"
          :perm-order="['none', 'Read']"
          :data-testid="`app-perms-select-${perms.actorTypeId}-Metadata`"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, 'Metadata', value)"
        />
      </td>
    </tr>
  </DsfrTable>
  <!-- Positionner à droite -->
  <div class="fr-mt-2w fr-text-right">
    <DsfrButton
      class="fr-mt-2w"
      data-testid="app-perms-save-btn"
      title="Enregistrer la matrice des permissions"
      aria-label="Enregistrer la matrice des permissions"
      @click="saveAppPermsMatrix"
    >
      Enregistrer les modifications
    </DsfrButton>
    <DsfrButton
      class="fr-mt-2w fr-ml-2w"
      data-testid="app-perms-reload-btn"
      title="Recharger la matrice des permissions"
      aria-label="Recharger la matrice des permissions"
      @click="$emit('reload')"
    >
      Recharger les permissions
    </DsfrButton>
    <DsfrButton
      class="fr-mt-2w fr-ml-2w"
      secondary
      data-testid="app-perms-history-btn"
      title="Voir l'historique des modifications de la matrice des permissions"
      aria-label="Voir l'historique des modifications de la matrice des permissions"
      @click="isHistoryModalOpen = true"
    >
      Voir l'historique
    </DsfrButton>
  </div>

  <DsfrModal
    :opened="isHistoryModalOpen"
    size="xl"
    title="Historique des modifications de la matrice des permissions"
    data-testid="app-perms-history-modal"
    @close="isHistoryModalOpen = false"
  >
    <AppPermsMatrixHistory v-if="isHistoryModalOpen" />
  </DsfrModal>

  <DsfrModal
    :opened="isCreateActorTypeModalOpen"
    title="Ajouter un type d'acteur"
    data-testid="create-actor-type-modal"
    @close="closeCreateActorTypeModal"
  >
    <DsfrInput
      v-model="newActorTypeForm.code"
      label="Code"
      label-visible
      required
      placeholder="MOA"
      data-testid="create-actor-type-code-input"
      class="fr-mb-3w"
    />
    <DsfrInput
      v-model="newActorTypeForm.label"
      label="Libellé"
      label-visible
      required
      placeholder="Maîtrise d'Ouvrage"
      data-testid="create-actor-type-label-input"
      class="fr-mb-3w"
    />
    <DsfrInput
      v-model="newActorTypeForm.description"
      label="Description"
      label-visible
      is-textarea
      placeholder="Description du rôle de ce type d'acteur"
      data-testid="create-actor-type-description-input"
      class="fr-mb-3w"
    />
    <DsfrAlert
      type="info"
      description="Le nouveau type d'acteur est créé sans aucun droit : ouvrez-les depuis la matrice une fois la création effectuée."
      class="fr-mb-3w alert-wrap"
    />
    <template #footer>
      <DsfrButton label="Annuler" secondary data-testid="create-actor-type-cancel-btn" @click="closeCreateActorTypeModal" />
      <DsfrButton
        label="Créer"
        :disabled="isCreatingActorType || !isNewActorTypeFormValid"
        data-testid="create-actor-type-submit-btn"
        @click="createActorType"
      />
    </template>
  </DsfrModal>
</template>

<style scoped>
.fr-table > table td {
  padding: 0.5rem !important;
}

/* En-tête sticky : porté par la règle GLOBALE de main.css (#2112), qui couvre toutes les
   tables DSFR legacy (`.fr-table > table`), celle-ci comprise. */

.alert-wrap {
  text-wrap: auto;
}
</style>
