<script setup lang="ts">
import { onMounted, ref, unref } from "vue";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import type { AppPermsDto } from "@/client/types.gen";

const props = defineProps<{
  appPermsMatrix: AppPermsDto[]
}>();

const emits = defineEmits<{
  (e: "update:appPermsMatrix", value: AppPermsDto[]): void
  (e: "reload"): void
}>();
const actorTypeStore = useActorTypeStore();

onMounted(async () => {
  await actorTypeStore.fetchAll();
});

const permissionSuffixes = {
  Base: { label: "Infos", title: "Informations" },
  Hostings: { label: "Héberg.", title: "Hébergements" },
  Links: { label: "Liens", title: "Liens" },
  Compliances: { label: "Conformités", title: "Conformités" },
  Actors: { label: "Acteurs", title: "Acteurs" },
  Relations: { label: "Relations", title: "Relations" },
  Metadata: { label: "Historique", title: "Historique" },
} as const satisfies Record<string, { label: string, title: string }>;
const permissionKeys = Object.keys(permissionSuffixes) as (keyof typeof permissionSuffixes)[];

const updatedMatrix = ref<AppPermsDto[]>(unref(props.appPermsMatrix));

type PermissionValue = "none" | "read" | "write";
function updateMatrix(actorTypeId: string, permission: keyof typeof permissionSuffixes, value: PermissionValue) {
  const actorTypeIdx = updatedMatrix.value.findIndex(at => at.actorTypeId === actorTypeId);
  if (actorTypeIdx === -1) return;
  updatedMatrix.value[actorTypeIdx][`read${permission}`] = value === "read" || value === "write";
  if (permission !== "Metadata") {
    updatedMatrix.value[actorTypeIdx][`write${permission}`] = value === "write";
  }
}

type AnomalyPermissionValue = "read" | "post" | "manage";
function updateAnomalyMatrix(actorTypeId: string, values: AnomalyPermissionValue[]) {
  const actorTypeIdx = updatedMatrix.value.findIndex(at => at.actorTypeId === actorTypeId);
  if (actorTypeIdx === -1) return;

  updatedMatrix.value[actorTypeIdx].readAnomalyNotifications = values.includes("read") || values.includes("manage");
  updatedMatrix.value[actorTypeIdx].postAnomalyNotifications = values.includes("post") || values.includes("manage");
  updatedMatrix.value[actorTypeIdx].manageAnomalyNotifications = values.includes("manage");
}

function saveAppPermsMatrix() {
  // Emit the updated matrix to the parent component
  console.log("Saving App Perms Matrix:", updatedMatrix.value);

  emits("update:appPermsMatrix", updatedMatrix.value);
}
</script>

<template>
  <DsfrTable title="Tableau des permissions des applications">
    <template #header>
      <tr>
        <th scope="col">
          Type d'acteur
        </th>
        <th
          v-for="perm in permissionSuffixes" :key="perm.label" scope="col"
          style="min-width: 6rem;"
          :title="perm.title"
        >
          {{ perm.label }}
        </th>
        <th scope="col">
          Anomalies
        </th>
      </tr>
    </template>
    <tr v-for="perms in (updatedMatrix as AppPermsDto[])" :key="perms.actorTypeId">
      <td>{{ actorTypeStore.actorTypes.find((at) => at.id === perms.actorTypeId)?.label ?? perms.actorTypeId }}</td>
      <td
        v-for="perm in permissionKeys"
        :key="perm"
      >
        <PermissionSelect
          v-if="perm === 'Base'"
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :read="perms[`read${perm}`] || false"
          :write="perms[`write${perm}`] || false"
          :perm-order="['read', 'write']"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
        <PermissionSelect
          v-else-if="perm === 'Metadata'"
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :read="perms[`read${perm}`] || false"
          :perm-order="['none', 'read']"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
        <PermissionSelect
          v-else
          :id="`${perms.actorTypeId}-${perm}`"
          class="permission-select"
          :read="perms[`read${perm}`] || false"
          :write="perms[`write${perm}`] || false"
          @update:model-value="(value: PermissionValue) => updateMatrix(perms.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
      </td>
      <td style="min-width: 15rem;">
        <AnomalyPermissionSelect
          :id="`${perms.actorTypeId}`"
          :read="perms.readAnomalyNotifications"
          :post="perms.postAnomalyNotifications"
          :manage="perms.manageAnomalyNotifications"
          @update:model-value="(value: AnomalyPermissionValue[]) => updateAnomalyMatrix(perms.actorTypeId, value)"
        />
      </td>
    </tr>
  </DsfrTable>
  <!-- Positionner à droite -->
  <div class="fr-mt-2w fr-text-right">
    <DsfrButton
      class="fr-mt-2w"
      @click="saveAppPermsMatrix"
    >
      Enregistrer les modifications
    </DsfrButton>
    <DsfrButton class="fr-mt-2w fr-ml-2w" @click="$emit('reload')">
      Recharger les permissions
    </DsfrButton>
  </div>
</template>

<style scoped>
.fr-table > table td {
  padding: 0.5rem !important;
}
</style>
