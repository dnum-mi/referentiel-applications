<script setup lang="ts">
import { onMounted, ref, unref } from "vue";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import type { AppPermsDto } from "@/client/types.gen";
import PermissionWritePriorityRestart from "../PermissionWritePriorityRestart.vue";

const props = defineProps<{
  appPermsMatrix: AppPermsDto[];
}>();

const emits = defineEmits<{
  (e: "update:appPermsMatrix", value: AppPermsDto[]): void;
  (e: "reload"): void;
}>();
const actorTypeStore = useActorTypeStore();

onMounted(async () => {
  await actorTypeStore.fetchAll();
});

const permissionSuffixes = {
  App: { label: "Infos", title: "Informations" },
  PriorityRestart: { label: "Priorit. Redémarr.", title: "Prioritisation et redémarrage" },
  Hosting: { label: "Héberg.", title: "Hébergements" },
  Link: { label: "Liens", title: "Liens" },
  Compliance: { label: "Conformités", title: "Conformités" },
  Actor: { label: "Acteurs", title: "Acteurs" },
  Relation: { label: "Relations", title: "Relations" },
  Data: { label: "Données", title: "Données" },
  Technology: { label: "Techno.", title: "Technologies" },
  Metadata: { label: "Modifications", title: "Modifications" },
} as const satisfies Record<string, { label: string; title: string }>;
const permissionKeys = Object.keys(permissionSuffixes) as (keyof typeof permissionSuffixes)[];

const updatedMatrix = ref<AppPermsDto[]>(unref(props.appPermsMatrix));

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

// Marque (ou non) un type d'acteur comme « administrateur de l'application ». Les acteurs de ce
// type disposent alors de tous les droits (forcés côté serveur) ; les contrôles de la ligne sont
// verrouillés dans l'UI pour refléter que la matrice ne s'applique plus.
function updateIsAdmin(actorTypeId: string, value: boolean) {
  const actorTypeIdx = updatedMatrix.value.findIndex((at) => at.actorTypeId === actorTypeId);
  if (actorTypeIdx === -1) return;
  updatedMatrix.value[actorTypeIdx].isAdmin = value;
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
</script>

<template>
  <p class="fr-text--sm fr-mb-1w" data-testid="app-perms-legend">
    Légende : <strong>-</strong> aucun droit · <strong>RO</strong> lecture seule (Read Only) · <strong>RW</strong> lecture et écriture
    (Read/Write) · <strong>Admin</strong> : administrateur de l'application (tous les droits, forcés côté serveur — la ligne est alors
    verrouillée).
  </p>
  <DsfrTable title="Tableau des permissions des applications" data-testid="app-perms-table">
    <template #header>
      <tr>
        <th scope="col">Type d'acteur</th>
        <th scope="col" style="min-width: 4rem" title="Administrateur de l'application">Admin</th>
        <th v-for="perm in permissionSuffixes" :key="perm.label" scope="col" style="min-width: 6rem" :title="perm.title">
          {{ perm.label }}
        </th>
        <th scope="col">Signalements</th>
      </tr>
    </template>
    <tr v-for="perms in updatedMatrix as AppPermsDto[]" :key="perms.actorTypeId" :data-testid="`app-perms-row-${perms.actorTypeId}`">
      <td>{{ actorTypeStore.actorTypes.find((at) => at.id === perms.actorTypeId)?.label ?? perms.actorTypeId }}</td>
      <td>
        <input
          :id="`admin-toggle-${perms.actorTypeId}`"
          type="checkbox"
          class="admin-toggle"
          :checked="perms.isAdmin ?? false"
          aria-label="Administrateur de l'application : tous les droits"
          :data-testid="`app-perms-admin-${perms.actorTypeId}`"
          @change="(e: Event) => updateIsAdmin(perms.actorTypeId, (e.target as HTMLInputElement).checked)"
        />
      </td>
      <td v-for="perm in permissionKeys" :key="perm" :class="{ 'admin-locked': perms.isAdmin }">
        <PermissionSelect
          v-if="perm === 'App'"
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :disabled="perms.isAdmin ?? false"
          :read="perms[`${perm}Read`] || false"
          :write="perms[`${perm}Write`] || false"
          :perm-order="['Read', 'Write']"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
        <PermissionSelect
          v-else-if="perm === 'Metadata'"
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :disabled="perms.isAdmin ?? false"
          :read="perms[`${perm}Read`] || false"
          :perm-order="['none', 'Read']"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
        <PermissionSelect
          v-else-if="perm === 'Data' || perm === 'Technology'"
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :disabled="perms.isAdmin ?? false"
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
          :disabled="perms.isAdmin ?? false"
          :read="perms[`${perm}Read`] || false"
          :write="perms[`${perm}Write`] || false"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
      </td>
      <td style="min-width: 15rem" :class="{ 'admin-locked': perms.isAdmin }">
        <ReportPermissionSelect
          :id="`${perms.actorTypeId}`"
          :read="perms.ReportRead"
          :post="perms.ReportPost"
          :manage="perms.ReportManage"
          :data-testid="`app-perms-report-${perms.actorTypeId}`"
          @update:model-value="(value: ReportPermissionValue[]) => updateReportMatrix(perms.actorTypeId, value)"
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
  </div>
</template>

<style scoped>
.fr-table > table td {
  padding: 0.5rem !important;
}

/* Ligne « administrateur de l'application » : les droits sont forcés côté serveur, on verrouille
   les contrôles de permission (le bascule Admin, lui, reste actionnable pour revenir en arrière). */
.admin-locked {
  pointer-events: none;
  opacity: 0.45;
}

.admin-toggle {
  width: 1.15rem;
  height: 1.15rem;
  cursor: pointer;
}
</style>
