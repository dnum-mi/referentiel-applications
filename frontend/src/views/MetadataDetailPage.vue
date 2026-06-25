<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import api from "@/api/index";
import { formatDate } from "@/composables/use-date";
import { metadataActionLabels } from "@/constants/dictionary";
import type { MetadataDto } from "@/client/types.gen";

const route = useRoute();
const router = useRouter();

const metadata = ref<MetadataDto | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

async function fetchMetadata() {
  const id = route.params.id as string;
  if (!id) {
    error.value = "Identifiant de metadata manquant";
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const response = await api.metadatasControllerFindOne({ path: { id } });
    isLoading.value = false;

    if (!response.response.ok) {
      error.value = "Erreur lors de la récupération de la metadata.";
      console.error("Error fetching metadata:", response.error);
      return;
    }

    metadata.value = response.data ?? null;
    if (!metadata.value) {
      error.value = "Metadata non trouvée";
    }
  } catch (err) {
    isLoading.value = false;
    console.error("Error fetching metadata:", err);
    error.value = "Erreur lors de la récupération de la metadata";
  }
}

function formatArrayValue(value: unknown[]): string {
  if (value.every((v) => typeof v === "string")) {
    return value.join(", ");
  }
  return value.map((v) => (v as { name: string }).name).join(", ");
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return formatArrayValue(value);
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatValueLines(label: string, raw: string): string[] {
  const obj = JSON.parse(raw);
  const lines = [`${label}:`];
  for (const [key, value] of Object.entries(obj)) {
    lines.push(`  • ${key}: ${formatValue(value)}`);
  }
  return lines;
}

function formatDescriptionLine(line: string): string[] {
  const newMatch = line.match(/Nouvelle\(s\) valeur\(s\):\s*(\{[\s\S]*?\})$/);
  const oldMatch = line.match(/Ancienne\(s\) valeur\(s\):\s*(\{[\s\S]*?\})$/);
  const match = newMatch ?? oldMatch;
  if (match) {
    const label = newMatch ? "Nouvelle(s) valeur(s)" : "Ancienne(s) valeur(s)";
    try {
      return formatValueLines(label, match[1]);
    } catch {
      return [line];
    }
  }
  if (line.trim()) {
    return [line];
  }
  return [];
}

const formattedDescription = computed(() => {
  const description = metadata.value?.description || "";
  const lines = description.split("\n");
  const title = lines[0];
  const details: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    details.push(...formatDescriptionLine(lines[i]));
  }
  return { title, details };
});

onMounted(() => {
  fetchMetadata();
});
</script>

<template>
  <div class="fr-container fr-px-2w">
    <DsfrButton
      label="Retour à l'historique"
      secondary
      icon="ri-arrow-left-line"
      class="fr-mb-3w"
      data-testid="back-button"
      title="Retour à la page d'historique"
      aria-label="Retour à la page d'historique"
      @click="router.push(route.query.from as string)"
    />

    <h1>Détails de la modification</h1>

    <div v-if="isLoading" class="fr-mb-3w">
      <AppLoader data-testid="metadata-loader" />
    </div>

    <div v-else-if="error" class="fr-alert fr-alert--error fr-mb-3w" data-testid="metadata-error">
      <p>{{ error }}</p>
    </div>

    <div v-else-if="metadata" class="metadata-details">
      <div class="fr-mb-3w">
        <h2 class="fr-h6">Application</h2>
        <template v-if="metadata.application">
          <router-link :to="{ name: 'application', params: { id: metadata.applicationId } }" data-testid="metadata-application-link">
            {{ metadata.application.label }}
          </router-link>
        </template>
        <span v-else data-testid="metadata-application">Application inconnue</span>
      </div>

      <div class="fr-mb-3w">
        <h2 class="fr-h6">Auteur</h2>
        <p data-testid="metadata-author">{{ metadata.createdBy?.email ?? "Inconnu" }}</p>
      </div>

      <div class="fr-mb-3w">
        <h2 class="fr-h6">Type</h2>
        <DsfrTag :class="metadata.action" :label="metadataActionLabels[metadata.action]" data-testid="metadata-type" />
      </div>

      <div class="fr-mb-3w">
        <h2 class="fr-h6">Date</h2>
        <p data-testid="metadata-date">{{ formatDate(metadata.createdAt) }}</p>
      </div>

      <div class="fr-mb-3w">
        <h2 class="fr-h6">Description</h2>
        <div class="metadata-description" data-testid="metadata-description">
          <h3 class="fr-text--lg fr-mb-2w">{{ formattedDescription.title }}</h3>
          <div class="description-details">
            <p v-for="(detail, index) in formattedDescription.details" :key="index" class="detail-line">
              {{ detail }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="fr-alert fr-alert--info" data-testid="metadata-not-found">
      <p>Aucune metadata trouvée.</p>
    </div>
  </div>
</template>

<style scoped>
.add {
  background-color: #e6f8ea;
  color: #1aa779;
}
.update {
  background-color: #f8f3e6;
  color: #a7791a;
}
.delete {
  background-color: #f8e6e6;
  color: #a71a1a;
}

.metadata-description {
  background-color: var(--background-alt-grey);
  padding: 1.5rem;
  border-radius: 0.25rem;
}

.description-details {
  margin-top: 1rem;
}

.detail-line {
  margin-bottom: 0.5rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
</style>
