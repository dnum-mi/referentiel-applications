<script setup lang="ts">
import { computed, defineProps, defineEmits, onMounted } from "vue";
import { useHostingStore } from "@/stores/hostingStore";

const props = defineProps<{ applicationId: string }>();
const emit = defineEmits(["edit", "delete"]);

const hostingStore = useHostingStore();
const hostings = computed(() => hostingStore.hostings);

onMounted(() => {
  hostingStore.fetchHostings(props.applicationId);
});
</script>

<template>
  <div class="fr-card__body">
    <div class="fr-card__content">
      <div v-if="hostings.length === 0" class="fr-text--sm fr-text--italic">Aucun hébergement enregistré.</div>
      <ul v-else class="hosting-list">
        <li v-for="hosting in hostings" :key="hosting.id" class="hosting-item">
          <div class="hosting-details">
            <h4 class="hosting-title">{{ hosting.label || "Hébergement" }}</h4>
            <div class="hosting-info-grid">
              <p v-if="hosting.provider" class="hosting-info">
                <span class="hosting-info-label">Fournisseur:</span> {{ hosting.provider }}
              </p>
              <p v-if="hosting.site" class="hosting-info"><span class="hosting-info-label">Site:</span> {{ hosting.site }}</p>
              <p v-if="hosting.region" class="hosting-info"><span class="hosting-info-label">Région:</span> {{ hosting.region }}</p>
              <p v-if="hosting.nature" class="hosting-info"><span class="hosting-info-label">Nature:</span> {{ hosting.nature }}</p>
              <p v-if="hosting.platform" class="hosting-info"><span class="hosting-info-label">Plateforme:</span> {{ hosting.platform }}</p>
            </div>
          </div>
          <div class="hosting-actions">
            <DsfrButton tertiary size="sm" icon="ri-edit-line" label="Modifier" @click="$emit('edit', hosting)" />
            <DsfrButton tertiary size="sm" icon="ri-delete-bin-line" label="Supprimer" @click="$emit('delete', hosting)" />
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.hosting-list {
  padding: 0;
  list-style: none;
}

.hosting-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--grey-925-125);
}

.hosting-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.hosting-details {
  flex: 1;
}

.hosting-title {
  font-size: 1rem;
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.hosting-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.hosting-info {
  margin: 0;
  font-size: 0.875rem;
}

.hosting-info-label {
  font-weight: bold;
}

.hosting-actions {
  display: flex;
  gap: 0.5rem;
}
</style>
