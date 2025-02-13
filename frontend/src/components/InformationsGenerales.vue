<script setup lang="ts">
import { ref } from "vue";
import type { Application } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import Applications from "@/api/application";
import AppDate from "./AppDate.vue";

const props = defineProps<{ application: Application }>();
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

function startAddingTag() {
  isAddingTag.value = true;
  newTag.value = "";
}

function addTag() {
  const tag = newTag.value.trim();
  if (tag) {
    application.tags.push(tag);
  }
  isAddingTag.value = false;
}

function cancelTag() {
  isAddingTag.value = false;
}

function removeTag(index: number) {
  application.tags.splice(index, 1);
}

function removePurpose(index: number) {
  application.purposes.splice(index, 1);
}

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
  <div class="general-info">
    <h2 class="general-info-title">Informations générales</h2>

    <div class="info-card">
      <!-- Champs de base -->
      <div class="input-group">
        <DsfrInput v-model="application.id" label="Identifiant unique" label-visible disabled />
      </div>
      <div class="input-group">
        <DsfrInput v-model="application.label" label="Nom" label-visible required />
      </div>
      <div class="input-group">
        <DsfrInput v-model="application.shortName" label="Nom abrégé" label-visible required />
      </div>
      <div class="input-group">
        <DsfrInput v-model="application.description" label="Description" label-visible required isTextarea :rows="10" />
      </div>

      <div v-if="application.parent || application.lifecycle" class="sub-section">
        <div v-if="application.parent" class="sub-section-group">
          <h3 class="sub-section-title">Application Parent</h3>
          <div class="parent-info">
            <div class="input-group">
              <DsfrInput v-model="application.parent.id" label="Identifiant parent" label-visible disabled />
            </div>
            <div class="input-group">
              <DsfrInput v-model="application.parent.label" label="Nom parent" label-visible />
            </div>
          </div>
        </div>
        <div v-if="application.lifecycle" class="sub-section-group">
          <h3 class="sub-section-title">Cycle de vie</h3>
          <div class="lifecycle-info">
            <div class="input-group">
              <DsfrSelect v-model="application.lifecycle.status" label="Statut" :options="lifecycleStatuses" />
            </div>
            <div class="input-group">
              <AppDate v-model="application.lifecycle.firstProductionDate" label="Date de première production" />
            </div>
            <div class="input-group">
              <AppDate v-model="application.lifecycle.plannedDecommissioningDate" label="Date de décommission prévue" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">Finalités</h3>
      <div class="objectives-list">
        <div v-for="(purpose, index) in application.purposes" :key="index" class="purpose-item">
          <div class="purpose-item-wrapper">
            <DsfrInput v-model="application.purposes[index]" label-visible />
            <DsfrButton secondary label="Supprimer" @click="removePurpose(index)" />
          </div>
        </div>
      </div>
      <div class="actions-inline">
        <DsfrButton secondary label="Ajouter une finalités" @click="application.purposes.push('')" />
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">Tags</h3>
      <div class="tags-info">
        <small>Survolez un tag pour voir l'option de suppression</small>
      </div>
      <div class="tags-container">
        <div class="tags-list">
          <div v-for="(tag, index) in application.tags" :key="index" class="tag-item">
            <DsfrTag :label="tag" />

            <span class="delete-icon" title="Cliquez pour supprimer ce tag" @click.stop="removeTag(index)">
              <v-icon name="ri-delete-bin-line" />
            </span>
          </div>
        </div>
      </div>
      <div class="actions-inline">
        <div v-if="isAddingTag" class="tag-add-form">
          <DsfrInput v-model="newTag" label="Nouveau tag" label-visible />
          <div class="tag-add-actions">
            <DsfrButton secondary label="Confirmer" @click="addTag" />
            <DsfrButton secondary label="Annuler" @click="cancelTag" />
          </div>
        </div>
        <div v-else>
          <DsfrButton secondary label="Ajouter un tag" @click="startAddingTag" />
        </div>
      </div>
    </div>

    <div class="actions">
      <DsfrButton label="Sauvegarder" primary @click="patchApplication" :disabled="loading" />
    </div>
  </div>
</template>

<style scoped>
.general-info {
  padding: 1.5rem;
  background-color: #f8f9fb;
  border-radius: 8px;
  max-width: 1200px;
  margin: 0 auto;
}

.general-info-title {
  text-align: center;
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
  color: #2c3e50;
}

.info-card {
  background: #fff;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.input-group {
  margin-bottom: 1rem;
}

.sub-section {
  border-top: 1px solid #e0e6ed;
  margin-top: 1.5rem;
  padding-top: 1rem;
}

.sub-section-group {
  margin-bottom: 1.5rem;
}

.sub-section-title {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: #005ea8;
  border-bottom: 1px solid #e0e6ed;
  padding-bottom: 0.5rem;
}

.parent-info,
.lifecycle-info {
  display: grid;
  gap: 1rem;
}

.section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: #005ea8;
  border-bottom: 1px solid #e0e6ed;
  padding-bottom: 0.5rem;
}

.actions-inline {
  text-align: right;
  margin-top: 0.5rem;
}

.tags-container {
  padding: 0.5rem 0;
}

.purpose-item-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tag-item {
  position: relative;
  display: inline-block;
}

.delete-icon {
  display: none;
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 50%;
  padding: 2px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.tag-item:hover .delete-icon {
  display: block;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.tag-add-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.tag-add-actions {
  display: flex;
  gap: 0.5rem;
}

.actions {
  text-align: center;
  margin-top: 1.5rem;
}
</style>
