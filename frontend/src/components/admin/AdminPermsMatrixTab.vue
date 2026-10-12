<script setup lang="ts">
import { isApiSuccess } from "@/api/api-result";
import { ref, onMounted } from "vue";
import api from "@/api";
import type { AppPermsDto } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import AppPermsMatrix from "@/components/admin/AppPermsMatrix.vue";

const toaster = useToasterStore();
const loading = ref(false);
const error = ref<string | null>(null);
const appPermsMatrix = ref<AppPermsDto[] | null>(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.actorTypeControllerGetMatrix();
    if (!isApiSuccess(res) || !res.data) throw res.error ?? new Error("HTTP error");
    appPermsMatrix.value = res.data;
  } catch (e) {
    error.value = "Erreur lors du chargement de la matrice des permissions";
    console.error(e);
  } finally {
    loading.value = false;
  }
}
async function save(body: AppPermsDto[]) {
  loading.value = true;
  try {
    const res = await api.actorTypeControllerUpdateMatrix({ body });
    if (!isApiSuccess(res)) throw res.error ?? new Error("HTTP error");
    toaster.addSuccessMessage("Matrice des permissions mise à jour avec succès");
    await load();
  } catch (e) {
    toaster.addErrorMessage("Erreur lors de la mise à jour de la matrice des permissions");
    console.error(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>

<template>
  <div>
    <output v-if="loading" class="matrix-loading-status fr-alert fr-alert--info" aria-live="polite" aria-atomic="true">Chargement…</output>
    <div v-else-if="error" class="fr-alert fr-alert--error" role="alert">
      {{ error }}
      <DsfrButton size="sm" class="fr-ml-2w" @click="load"> Réessayer </DsfrButton>
    </div>
    <AppPermsMatrix v-else-if="appPermsMatrix" :app-perms-matrix="appPermsMatrix" @reload="load" @update:app-perms-matrix="save" />
  </div>
</template>

<style scoped>
.matrix-loading-status {
  display: block;
}
</style>
