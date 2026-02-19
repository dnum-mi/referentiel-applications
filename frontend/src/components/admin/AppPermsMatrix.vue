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
  Base: { label: "Infos", title: "Informations" },
  PriorityRestart: { label: "Priorit. Redémarr.", title: "Prioritisation et redémarrage" },
  Hostings: { label: "Héberg.", title: "Hébergements" },
  Links: { label: "Liens", title: "Liens" },
  Compliances: { label: "Conformités", title: "Conformités" },
  Actors: { label: "Acteurs", title: "Acteurs" },
  Relations: { label: "Relations", title: "Relations" },
  Metadata: { label: "Historique", title: "Historique" },
} as const satisfies Record<string, { label: string; title: string }>;
const permissionKeys = Object.keys(permissionSuffixes) as (keyof typeof permissionSuffixes)[];

const updatedMatrix = ref<AppPermsDto[]>(unref(props.appPermsMatrix));

type PermissionValue = "none" | "read" | "write";
function updateMatrix(actorTypeId: string, permission: keyof typeof permissionSuffixes, value: PermissionValue) {
  const actorTypeIdx = updatedMatrix.value.findIndex((at) => at.actorTypeId === actorTypeId);
  if (actorTypeIdx === -1) return;
  if (permission === "PriorityRestart") {
    return;
  }
  updatedMatrix.value[actorTypeIdx][`read${permission}`] = value === "read" || value === "write";
  if (permission !== "Metadata") {
    updatedMatrix.value[actorTypeIdx][`write${permission}`] = value === "write";
  }
}

function updateWritePriorityRestart(actorTypeId: string, value: boolean) {
  const actorTypeIdx = updatedMatrix.value.findIndex((at) => at.actorTypeId === actorTypeId);
  if (actorTypeIdx === -1) return;
  updatedMatrix.value[actorTypeIdx].writePriorityRestart = value;
}

type ReportPermissionValue = "read" | "post" | "manage";
function updateReportMatrix(actorTypeId: string, values: ReportPermissionValue[]) {
  const actorTypeIdx = updatedMatrix.value.findIndex((at) => at.actorTypeId === actorTypeId);
  if (actorTypeIdx === -1) return;

  updatedMatrix.value[actorTypeIdx].readReports = values.includes("read") || values.includes("manage");
  updatedMatrix.value[actorTypeIdx].postReports = values.includes("post") || values.includes("manage");
  updatedMatrix.value[actorTypeIdx].manageReports = values.includes("manage");
}

function saveAppPermsMatrix() {
  // Emit the updated matrix to the parent component
  console.log("Saving App Perms Matrix:", updatedMatrix.value);

  emits("update:appPermsMatrix", updatedMatrix.value);
}
</script>

<template>
  <DsfrTable title="Tableau des permissions des applications" data-testid="app-perms-table">
    <template #header>
      <tr>
        <th scope="col">Type d'acteur</th>
        <th v-for="perm in permissionSuffixes" :key="perm.label" scope="col" style="min-width: 6rem" :title="perm.title">
          {{ perm.label }}
        </th>
        <th scope="col">Signalements</th>
      </tr>
    </template>
    <tr v-for="perms in updatedMatrix as AppPermsDto[]" :key="perms.actorTypeId" :data-testid="`app-perms-row-${perms.actorTypeId}`">
      <td>{{ actorTypeStore.actorTypes.find((at) => at.id === perms.actorTypeId)?.label ?? perms.actorTypeId }}</td>
      <td v-for="perm in permissionKeys" :key="perm">
        <PermissionSelect
          v-if="perm === 'Base'"
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :read="perms[`read${perm}`] || false"
          :write="perms[`write${perm}`] || false"
          :perm-order="['read', 'write']"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
        <PermissionSelect
          v-else-if="perm === 'Metadata'"
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :read="perms[`read${perm}`] || false"
          :perm-order="['none', 'read']"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
        <PermissionWritePriorityRestart
          v-else-if="perm === 'PriorityRestart'"
          :id="`${perms.actorTypeId}-${perm}`"
          :checked="perms.writePriorityRestart"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: boolean) => updateWritePriorityRestart(perms.actorTypeId, value)"
        />
        <PermissionSelect
          v-else
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :read="perms[`read${perm}`] || false"
          :write="perms[`write${perm}`] || false"
          :data-testid="`app-perms-select-${perms.actorTypeId}-${perm}`"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
      </td>
      <td style="min-width: 15rem">
        <ReportPermissionSelect
          :id="`${perms.actorTypeId}`"
          :read="perms.readReports"
          :post="perms.postReports"
          :manage="perms.manageReports"
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
</style>
