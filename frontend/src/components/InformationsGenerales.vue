<script setup lang="ts">
import { ref } from "vue";
import type { Application } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import Applications from "@/api/application";
import AppDate from "./AppDate.vue";

defineEmits<{
  (e: "edit"): void;
}>();

const props = defineProps<{
  application: Application;
  noBorder?: boolean;
  tags: string[];
  small?: boolean;
}>();
const application = props.application;
const loading = ref(false);
const toaster = useToaster();

const isAddingTag = ref(false);
const newTag = ref("");

const lifecycleStatusesDict = {
  under_construction: " en construction",
  in_production: "en production",
  decommissioned: "décomissioné",
  decommissioning: "en décomissionnement",
};

const lifecycleStatuses = computed(() => Object.entries(lifecycleStatusesDict).map(([value, text]) => ({ value, text })));

async function patchApplication() {
  loading.value = true;
  try {
    await Applications.patchApplication(application);
    toaster.addSuccessMessage("Application mise à jour avec succès");
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la mise à jour de l'application");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-12">
      <div class="fr-card" :class="{ 'fr-card--no-border': noBorder }">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <slot>
              <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
                <div class="fr-col">
                  <h3 class="fr-mb-0">Informations générales</h3>
                </div>
                <div class="fr-col-auto">
                  <DsfrButton tertiary size="sm" icon="edit-line" label="Modifier" @click="$emit('edit')" />
                </div>
              </div>

              <h4>Description</h4>
              <p>{{ application.description }}</p>

              <h4 class="fr-mt-3w">Objectifs</h4>
              <ul>
                <li v-for="purpose in application.purposes" :key="purpose">
                  {{ purpose }}
                </li>
              </ul>

              <h4 class="fr-mt-3w">Tags</h4>
              <ul class="fr-tags-group">
                <li v-for="tag in application.tags" :key="tag">
                  <DsfrTag :label="tag" :small="small" />
                </li>
              </ul>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fr-card {
  height: 100%;
}

.fr-card__content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.fr-tags-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag-item {
  position: relative;
  display: inline-block;
}
</style>
