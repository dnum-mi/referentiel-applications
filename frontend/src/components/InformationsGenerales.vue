<script setup lang="ts">
import { ref } from "vue";
import type { Application } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import Applications from "@/api/application";
import { computed } from "vue";
import ApplicationForm from "./form/ApplicationForm.vue";
import useModal from "@/composables/use-modal";

const isSubmitting = ref(false);
const toaster = useToaster();

const emit = defineEmits(["update:application"]);

const props = defineProps<{
  application: Application;
  tags: string[];
  small?: boolean;
}>();

const application = ref<Application>({ ...props.application });

const applicationModal = useModal();

async function updateApplication(updatedData) {
  isSubmitting.value = true;
  try {
    const updatedApplication = await Applications.patchApplication({
      ...props.application,
      ...updatedData,
    });

    application.value = updatedApplication;
    emit("update:application", updatedApplication);
    toaster.addSuccessMessage("Application mise à jour avec succès");
    applicationModal.closeModal();
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la mise à jour de l'application");
  } finally {
    isSubmitting.value = false;
  }
}

watch(
  () => props.application,
  (newVal) => {
    application.value = { ...newVal };
  },
  { deep: true, immediate: true },
);
</script>
<template>
  <div class="fr-grid-row fr-grid-row--gutters">
    <div class="fr-col-8">
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <slot>
              <div class="fr-grid-row fr-grid-row--middle fr-mb-3w">
                <div class="fr-col">
                  <h3 class="fr-mb-0">Informations générales</h3>
                </div>
                <div class="fr-col-auto">
                  <DsfrButton
                    tertiary
                    size="sm"
                    class="fr-btn--icon-left fr-icon-edit-line"
                    label="Modifier"
                    @click="applicationModal.openModal()"
                  />
                </div>
              </div>
              <h4>ID de l'application</h4>
              <p>{{ application.id }}</p>
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

    <div v-if="application.parent" class="fr-col-4">
      <div class="fr-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <h3 class="fr-card__title">Parent</h3>
            <p class="fr-card__desc">
              Nom :
              <router-link :to="{ name: 'application', params: { id: application.parent?.id } }">{{
                application.parent?.label
              }}</router-link>
              <br />
              Description : {{ application.parent?.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <DsfrModal :opened="applicationModal.isModalOpen.value" :title="'Modifier l\'application'" @close="applicationModal.closeModal">
    <ApplicationForm
      v-bind="{ initialData: application }"
      :is-submitting="isSubmitting"
      @submit="updateApplication"
      @cancel="applicationModal.closeModal"
    />
  </DsfrModal>
</template>

<style scoped>
.fr-tags-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
