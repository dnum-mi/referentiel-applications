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
      <ul class="hosting-list">
        <li v-for="hosting in hostings" :key="hosting.id" class="hosting-item">
          <span class="hosting-label"> {{ hosting.site }} - {{ hosting.region }} - {{ hosting.platform }} </span>
          <div class="hosting-actions">
            <DsfrButton tertiary size="sm" label="Modifier" @click="$emit('edit', hosting)" />
            <DsfrButton tertiary size="sm" label="Supprimer" @click="$emit('delete', hosting)" />
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
  margin-bottom: 1rem;
}
</style>
