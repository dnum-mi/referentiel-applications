<script setup lang="ts">
import { isApiSuccess } from "@/api/api-result";
import { computed, ref, onMounted } from "vue";
import api from "@/api";
import type { AppPermsDto } from "@/client/types.gen";
import AppPermsMatrix from "@/components/admin/AppPermsMatrix.vue";
import { useSubmissionFocus } from "@/composables/use-submission-focus";

const loading = ref(false);
const isSaving = ref(false);
const error = ref<string | null>(null);
const saveError = ref("");
const confirmationMessage = ref("");
const appPermsMatrix = ref<AppPermsDto[] | null>(null);
useSubmissionFocus(isSaving);
const statusMessage = computed(() =>
  isSaving.value ? "Enregistrement de la matrice des permissions…" : loading.value ? "Chargement…" : confirmationMessage.value,
);

async function load() {
  if (loading.value) return false;
  loading.value = true;
  error.value = null;
  try {
    const res = await api.actorTypeControllerGetMatrix();
    if (!isApiSuccess(res) || !res.data) throw res.error ?? new Error("HTTP error");
    appPermsMatrix.value = res.data;
    return true;
  } catch (e) {
    error.value = "Erreur lors du chargement de la matrice des permissions";
    console.error(e);
    return false;
  } finally {
    loading.value = false;
  }
}
async function reload() {
  if (isSaving.value || loading.value) return;
  confirmationMessage.value = "";
  await load();
}
async function save(body: AppPermsDto[]) {
  if (isSaving.value || loading.value) return;
  isSaving.value = true;
  error.value = null;
  saveError.value = "";
  confirmationMessage.value = "";
  // La saisie reste disponible pendant l'attente : la requête porte uniquement
  // sur le brouillon explicitement soumis, pas sur ses modifications ultérieures.
  const submitted = body.map((row) => ({ ...row }));
  try {
    const res = await api.actorTypeControllerUpdateMatrix({ body: submitted });
    if (!isApiSuccess(res)) throw res.error ?? new Error("HTTP error");
    const reloaded = await load();
    confirmationMessage.value = reloaded
      ? "Matrice des permissions mise à jour avec succès"
      : "Matrice des permissions enregistrée. La relecture n'a pas abouti.";
  } catch (e) {
    saveError.value = "Erreur lors de la mise à jour de la matrice des permissions. Votre saisie est conservée.";
    console.error(e);
  } finally {
    isSaving.value = false;
  }
}
onMounted(load);
</script>

<template>
  <div>
    <output class="matrix-loading-status" aria-live="polite" aria-atomic="true" data-testid="app-perms-matrix-status">{{
      statusMessage
    }}</output>
    <div role="alert" aria-live="assertive" aria-atomic="true" data-testid="app-perms-matrix-error">
      <p v-if="error || saveError" class="fr-error-text">{{ error || saveError }}</p>
      <DsfrButton v-if="error && !loading" size="sm" @click="reload"> Réessayer </DsfrButton>
    </div>
    <div v-if="appPermsMatrix" :aria-busy="loading || isSaving">
      <AppPermsMatrix
        :app-perms-matrix="appPermsMatrix"
        :is-saving="isSaving || loading"
        @reload="reload"
        @update:app-perms-matrix="save"
      />
    </div>
  </div>
</template>

<style scoped>
.matrix-loading-status {
  display: block;
}
</style>
