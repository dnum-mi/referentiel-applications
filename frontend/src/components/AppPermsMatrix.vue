<script setup lang="ts">
import { onBeforeMount, ref } from "vue";
import type { AppPermsMatrix } from "@/models/Application";
import { useActorTypeStore } from "@/stores/actorTypeStore";

const props = defineProps({
  appPermsMatrix: {
    type: Array as () => AppPermsMatrix,
    required: true,
  },
});

const emits = defineEmits<{
  (e: "update:appPermsMatrix", value: AppPermsMatrix): void
  (e: "reload"): void
}>();
const actorTypeStore = useActorTypeStore();
onBeforeMount(async () => {
  await actorTypeStore.fetchAll();
});

const permissionSuffixes = {
  Base: "Informations",
  Hostings: "Hébergements",
  Links: "Liens",
  Compliances: "Conformités",
  Actors: "Acteurs",
  Relations: "Relations",
  Metadata: "Historique",
};

const updatedMatrix = ref<AppPermsMatrix>(Array.from(props.appPermsMatrix));

function updateMatrix(actorTypeId: string, permission: keyof typeof permissionSuffixes, value: string) {
  const actorTypeIdx = updatedMatrix.value.findIndex(at => at.actorTypeId === actorTypeId);
  if (actorTypeIdx === -1) return;
  if (value === "none") {
    updatedMatrix.value[actorTypeIdx][`write${permission}`] = false;
    updatedMatrix.value[actorTypeIdx][`read${permission}`] = false;
  } else if (value === "read") {
    updatedMatrix.value[actorTypeIdx][`write${permission}`] = false;
    updatedMatrix.value[actorTypeIdx][`read${permission}`] = true;
  } else if (value === "write") {
    updatedMatrix.value[actorTypeIdx][`write${permission}`] = true;
    updatedMatrix.value[actorTypeIdx][`read${permission}`] = true; // Writing implies reading
  }
}

function saveAppPermsMatrix() {
  // Emit the updated matrix to the parent component
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
        <th v-for="perm in permissionSuffixes" :key="perm" scope="col">
          {{ perm }}
        </th>
      </tr>
    </template>
    <tr v-for="actorType in updatedMatrix" :key="actorType.actorTypeId">
      <td>{{ actorTypeStore.actorTypes.find((at) => at.id === actorType.actorTypeId)?.label ?? actorType.actorTypeId }}</td>
      <td v-for="perm in Object.keys(permissionSuffixes)" :key="perm">
        <PermissionSelect
          :id="`${actorType.actorTypeId}-${perm}`"
          style="min-width: 7.5rem"
          :read="actorType[`read${perm as keyof typeof permissionSuffixes}`]"
          :write="actorType[`write${perm as keyof typeof permissionSuffixes}`]"
          :read-minimum="perm === 'Base'"
          @update:model-value="(value) => updateMatrix(actorType.actorTypeId, perm as keyof typeof permissionSuffixes, value)"
        />
      </td>
    </tr>
  </DsfrTable>
  <!-- Positionner à droite -->
  <div class="fr-mt-2w fr-text-right">
    <DsfrButton class="fr-mt-2w" @click="saveAppPermsMatrix">
      Enregistrer les modifications
    </DsfrButton>
    <DsfrButton class="fr-mt-2w fr-ml-2w" @click="$emit('reload')">
      Recharger les permissions
    </DsfrButton>
  </div>
</template>
