<script setup lang="ts">
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
  loading.value = true; error.value = null;
  try {
    const res = await api.actorTypeControllerGetMatrix();
    if (!res.response.ok || !res.data) throw res.error ?? new Error("HTTP error");
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
    if (!res.response.ok) throw res.error ?? new Error("HTTP error");
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
    <div v-if="loading" class="fr-alert fr-alert--info">
      Chargement…
    </div>
    <div v-else-if="error" class="fr-alert fr-alert--error">
      {{ error }}
      <DsfrButton size="sm" class="fr-ml-2w" @click="load">
        Réessayer
      </DsfrButton>
    </div>
    <AppPermsMatrix
      v-else-if="appPermsMatrix"
      :app-perms-matrix="appPermsMatrix"
      @reload="load"
      @update:app-perms-matrix="save"
    />
  </div>
</template>
