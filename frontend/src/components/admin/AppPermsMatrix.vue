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
    (Read/Write).
  </p>
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
    <tr v-for="perms in updatedMatrix as AppPermsDto[]" :key="perms.actorTypeId" :data-testid="`app-perms-row-${perms.actorTypeId}`">
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
  </div>
</template>

<style scoped>
.fr-table > table td {
  padding: 0.5rem !important;
}

/* En-tête sticky (#2083). En DSFR legacy la `table` est ELLE-MÊME la boîte de défilement
   (`.fr-table > table { display: block; overflow: auto }`) : c'est donc sa hauteur qu'on
   borne — un max-height posé sur `.fr-table` ferait défiler l'en-tête avec le corps, le
   sticky s'épinglant au scrollport le plus proche (la table). Le fond est porté par `thead`,
   pas par `th` — un `th` sticky doit redéclarer fond opaque thémé et liseré bas.
   `table` appartient au template interne de DsfrTable (pas au slot) → :deep obligatoire. */
.fr-table :deep(> table) {
  max-height: 70vh;
}

.fr-table > table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background-color: var(--background-alt-grey);
  box-shadow: inset 0 -1px 0 var(--border-plain-grey);
}
</style>
