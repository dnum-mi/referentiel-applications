<script setup lang="ts">
import { ref } from "vue";
import { useApplicationStore } from "@/stores/applicationStore";
import { useToasterStore } from "@/stores/toasterStore";

const props = defineProps<{ applicationId: string }>();
const applicationStore = useApplicationStore();
const toaster = useToasterStore();
const isExporting = ref(false);

async function exportPowerpoint() {
  if (isExporting.value) return;
  isExporting.value = true;
  try {
    await applicationStore.downloadProductPowerpoint(props.applicationId);
  } catch (error) {
    console.error("Erreur lors de l'export de la fiche produit", error);
    toaster.addErrorMessage("Impossible d'exporter la fiche produit en PowerPoint. Veuillez réessayer.");
  } finally {
    isExporting.value = false;
  }
}
</script>

<template>
  <DsfrButton
    class="fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-download-line"
    data-testid="application-export-powerpoint-btn"
    :disabled="isExporting"
    :aria-busy="isExporting"
    @click="exportPowerpoint"
  >
    {{ isExporting ? "Préparation du PowerPoint…" : "Exporter la fiche produit en PowerPoint" }}
  </DsfrButton>
</template>
