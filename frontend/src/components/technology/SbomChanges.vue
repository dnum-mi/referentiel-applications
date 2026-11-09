<script setup lang="ts">
import { computed, ref, watch } from "vue";
import PaginationFooter from "@/components/PaginationFooter.vue";
import type { SbomPreview } from "@/services/sbom";

const props = defineProps<{ changes: SbomPreview["changes"] }>();
const page = ref(0);
const pageSize = ref(20);
const rows = computed(() => [
  ...props.changes.added.map((item) => ({
    kind: "Ajout",
    ref: item.ref,
    product: item.product,
    before: "—",
    after: item.version || "Non renseignée",
  })),
  ...props.changes.removed.map((item) => ({
    kind: "Retrait",
    ref: item.ref,
    product: item.product,
    before: item.version || "Non renseignée",
    after: "—",
  })),
  ...props.changes.changed.map((item) => ({
    kind: "Changement",
    ref: item.before.ref === item.after.ref ? item.after.ref : `${item.before.ref} → ${item.after.ref}`,
    product: item.before.product === item.after.product ? item.after.product : `${item.before.product} → ${item.after.product}`,
    before: item.before.version || "Non renseignée",
    after: item.after.version || "Non renseignée",
  })),
]);
const pageRows = computed(() => rows.value.slice(page.value * pageSize.value, (page.value + 1) * pageSize.value));
watch(
  () => props.changes,
  () => {
    page.value = 0;
  },
);
</script>

<template>
  <div v-if="rows.length" class="fr-mb-3w" data-testid="sbom-changes">
    <div class="fr-table fr-table--bordered">
      <div class="fr-table__wrapper">
        <div class="fr-table__container">
          <div class="fr-table__content">
            <table>
              <caption>
                Détail des changements de cette source
              </caption>
              <thead>
                <tr>
                  <th scope="col">Opération</th>
                  <th scope="col">Composant</th>
                  <th scope="col">Référence</th>
                  <th scope="col">Version avant</th>
                  <th scope="col">Version après</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in pageRows" :key="index">
                  <td>{{ row.kind }}</td>
                  <td>{{ row.product }}</td>
                  <td class="sbom-reference">{{ row.ref }}</td>
                  <td>{{ row.before }}</td>
                  <td>{{ row.after }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <PaginationFooter
      :total-filtered="rows.length"
      :page="page"
      :limit="pageSize"
      @update:page="page = $event"
      @update:limit="
        pageSize = $event;
        page = 0;
      "
    />
  </div>
</template>

<style scoped>
.sbom-reference {
  overflow-wrap: anywhere;
}
</style>
