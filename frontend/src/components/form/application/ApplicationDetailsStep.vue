<script setup lang="ts">
import { nextTick, ref } from "vue";
import TagSearchSelect from "@/components/common/TagSearchSelect.vue";
import { priorityRestartLabelsOptions } from "@/constants/dictionary";
import type { ApplicationFormState } from "./application-form.types";
import { applicationFormSteps } from "./application-form.types";

defineProps<{ isCreateMode: boolean; canEditBase: boolean; canEditPriorityRestart: boolean }>();
const form = defineModel<ApplicationFormState>({ required: true });
const container = ref<HTMLElement | null>(null);

function focusByTestId(testId: string) {
  container.value?.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.focus();
}

async function addPurpose() {
  form.value.purposes.push("");
  await nextTick();
  focusByTestId(`application-purpose-${form.value.purposes.length - 1}`);
}

async function removePurpose(index: number) {
  form.value.purposes.splice(index, 1);
  await nextTick();
  focusByTestId(form.value.purposes.length > 0 ? "application-purpose-0" : "application-purpose-add");
}

async function addPopulation() {
  form.value.targetPopulations.push("");
  await nextTick();
  focusByTestId(`application-population-${form.value.targetPopulations.length - 1}`);
}

async function removePopulation(index: number) {
  form.value.targetPopulations.splice(index, 1);
  await nextTick();
  focusByTestId(form.value.targetPopulations.length > 0 ? "application-population-0" : "application-population-add");
}
</script>

<template>
  <div ref="container" class="fr-card fr-mt-3w fr-p-3w">
    <h3 tabindex="-1" class="fr-mb-3w" data-testid="application-step-title-2">
      <template v-if="isCreateMode">Étape 2 sur {{ applicationFormSteps.length }} — </template>Détails de l'application
    </h3>

    <DsfrSelect
      v-model="form.priorityRestart"
      :disabled="!canEditPriorityRestart"
      :options="priorityRestartLabelsOptions"
      label="Priorité de redémarrage"
      default-unselected-text="Sélectionner une priorité"
      data-testid="application-priority-restart"
    />

    <fieldset class="fr-fieldset fr-mt-3w">
      <!-- #2054 : conserver le hint dans la légende et les champs dans un fr-fieldset__element. -->
      <legend class="fr-fieldset__legend fr-label">
        Populations
        <span class="fr-hint-text">Indiquez ici le public cible concerné (ex. : RH, agents publics, entreprises...)</span>
      </legend>
      <div class="fr-fieldset__element fr-mt-2w">
        <div v-for="(_targetPopulation, index) in form.targetPopulations" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput
              v-model.trim="form.targetPopulations[index]"
              :disabled="!canEditBase"
              :title="`Population cible champ numéro ${index + 1}`"
              :data-testid="`application-population-${index}`"
            />
          </div>
          <div class="fr-col-auto">
            <DsfrButton
              type="button"
              tertiary
              size="sm"
              icon="delete-line"
              label="Supprimer"
              :title="`Supprimer le champ de la population numéro ${index + 1}`"
              :aria-label="`Supprimer le champ de la population numéro ${index + 1}`"
              :disabled="!canEditBase"
              :data-testid="`application-population-remove-${index}`"
              @click="removePopulation(index)"
            />
          </div>
        </div>
        <DsfrButton
          type="button"
          secondary
          icon="add-line"
          label="Ajouter une population"
          title="Ajouter une nouvelle population"
          aria-label="Ajouter une population"
          :disabled="!canEditBase"
          data-testid="application-population-add"
          @click="addPopulation"
        />
      </div>
    </fieldset>

    <fieldset class="fr-fieldset fr-mt-3w">
      <legend class="fr-fieldset__legend fr-label">Objectifs</legend>
      <div class="fr-fieldset__element fr-mt-2w">
        <div v-for="(_purpose, index) in form.purposes" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
          <div class="fr-col">
            <DsfrInput
              v-model.trim="form.purposes[index]"
              :disabled="!canEditBase"
              :title="`Objectif champ numéro ${index + 1}`"
              :data-testid="`application-purpose-${index}`"
            />
          </div>
          <div class="fr-col-auto">
            <DsfrButton
              type="button"
              tertiary
              size="sm"
              icon="delete-line"
              label="Supprimer"
              :title="`Supprimer le champ de l'objectif numéro ${index + 1}`"
              :aria-label="`Supprimer le champ de l'objectif numéro ${index + 1}`"
              :disabled="!canEditBase"
              :data-testid="`application-purpose-remove-${index}`"
              @click="removePurpose(index)"
            />
          </div>
        </div>
        <DsfrButton
          type="button"
          secondary
          icon="add-line"
          label="Ajouter un objectif"
          title="Ajouter un nouvel objectif"
          aria-label="Ajouter un objectif"
          :disabled="!canEditBase"
          data-testid="application-purpose-add"
          @click="addPurpose"
        />
      </div>
    </fieldset>

    <!-- #2054 : TagSearchSelect fournit déjà son fieldset et sa légende. -->
    <div class="fr-mt-3w">
      <TagSearchSelect v-model:tags="form.tags" />
    </div>
  </div>
</template>
