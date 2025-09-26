<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useMetadataStore } from "@/stores/metadataStore";
import { formatDate } from "@/composables/use-date";

const title = "Historique global des modifications";
const headers = ["Application", "Auteur", "Type", "Date", "Description"];

const selection = ref<string[]>([]);
const currentPage = ref(0);

const metadataStore = useMetadataStore();

const isLoading = computed(() => metadataStore.isLoading);

onMounted(async () => {
  await metadataStore.fetchMetadatasGlobal();
});

function formatDescription(description: string): { title: string, content: string } {
  const title = description.split("\n")[0];

  const newMatch = description.match(/Nouvelle\(s\) valeur\(s\):\s*(\{[\s\S]*?\})(?:\n|$)/);
  const oldMatch = description.match(/Ancienne\(s\) valeur\(s\):\s*(\{[\s\S]*?\})(?:\n|$)/);

  if (!newMatch && !oldMatch) {
    return { title, content: description };
  }

  try {
    const segments: { pos: number, label: string, obj: any }[] = [];

    if (newMatch) {
      segments.push({ pos: newMatch.index || 0, label: "Nouvelle(s) valeur(s):", obj: JSON.parse(newMatch[1]) });
    }
    if (oldMatch) {
      segments.push({ pos: oldMatch.index || 0, label: "Ancienne(s) valeur(s):", obj: JSON.parse(oldMatch[1]) });
    }

    segments.sort((a, b) => a.pos - b.pos);

    const content = segments
      .map(seg =>
        `${seg.label
        } ${
          Object.entries(seg.obj)
            .map(([k, v]) => `${k}='${Array.isArray(v) ? v.join(", ") : (typeof v === "object" && v !== null ? JSON.stringify(v) : v)}'`)
            .join(" ")}`,
      )
      .join("\n");

    return { title, content };
  } catch {
    return { title, content: description };
  }
}

const rows = computed(() =>
  metadataStore.metadatas.map((meta) => {
    const { title: descTitle, content } = formatDescription(meta.description || "");
    return {
      id: meta.id,
      Application: {
        label: meta.application?.label ?? "Application inconnue",
        to: meta.applicationId
          ? { name: "application", params: { id: meta.applicationId } }
          : undefined,
      },
      Auteur: meta.createdBy?.email ?? "Inconnu",
      Type: {
        component: "DsfrTag",
        label: meta.action,
        class: meta.action,
      },
      Date: formatDate(meta.createdAt),
      Description: {
        id: meta.id,
        title: descTitle,
        content,
      },
    };
  }),
);
</script>

<template>
  <div class="fr-container fr-my-2v w-[1000px]">
    <AppLoader v-if="isLoading" data-testid="history-loader" />
    <div v-else-if="!rows.length" class="text-center" data-testid="history-empty">
      <p>Aucune modification recensée.</p>
    </div>
    <DsfrDataTable
      v-else
      v-model:selection="selection"
      v-model:current-page="currentPage"
      data-testid="history-table"
      :headers-row="headers"
      :rows="rows"
      row-key="id"
      :title="title"
      pagination
      :rows-per-page="15"
      :pagination-options="[15, 30, 50]"
      sorted="Date"
      :sortable-rows="['Date', 'Application', 'Auteur', 'Type']"
    >
      <template #cell="{ colKey, cell }">
        <template v-if="colKey === 'Description'">
          <DsfrAccordion :id="`meta-${cell.id}`" :title="cell.title" data-testid="history-description-accordion">
            <pre class="formatted-description" data-testid="history-description-content">{{ cell.content }}</pre>
          </DsfrAccordion>
        </template>
        <template v-else-if="colKey === 'Application'">
          <template v-if="cell && cell.to">
            <router-link :to="cell.to" :data-testid="`history-row-${cell.id}-application`">
              {{ cell.label }}
            </router-link>
          </template>
          <template v-else>
            <span :data-testid="`history-row-${cell.id}-application`">{{ cell.label }}</span>
          </template>
        </template>
        <template v-else-if="colKey === 'Type'">
          <DsfrTag :class="cell.class" :label="cell.label" :data-testid="`history-row-${cell.id}-type`" />
        </template>
        <template v-else>
          {{ cell }}
        </template>
      </template>
    </DsfrDataTable>
  </div>
</template>

<style scoped>
.text-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #555;
  font-size: 1.2rem;
  font-weight: 500;
  background-color: #f9f9f9;
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  margin: 20px auto;
  width: 80%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.add { background-color: #e6f8ea; color: #1aa779; }
.update { background-color: #f8f3e6; color: #a7791a; }
.delete { background-color: #f8e6e6; color: #a71a1a; }
</style>
