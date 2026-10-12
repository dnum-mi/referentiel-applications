<script setup lang="ts">
import { ref } from "vue";
import { useApplicationStore } from "@/stores/applicationStore";
import { useToasterStore } from "@/stores/toasterStore";

const props = defineProps<{ applicationId: string }>();
const applicationStore = useApplicationStore();
const toaster = useToasterStore();
const isExporting = ref(false);
const exportingFormat = ref<"PowerPoint" | "HTML" | null>(null);

async function exportProduct(format: "PowerPoint" | "HTML") {
  if (isExporting.value) return;
  isExporting.value = true;
  exportingFormat.value = format;
  try {
    if (format === "PowerPoint") await applicationStore.downloadProductPowerpoint(props.applicationId);
    else await applicationStore.downloadProductHtml(props.applicationId);
  } catch (error) {
    console.error("Erreur lors de l'export de la fiche produit", error);
    toaster.addErrorMessage(`Impossible d'exporter la fiche produit en ${format}. Veuillez réessayer.`);
  } finally {
    isExporting.value = false;
    exportingFormat.value = null;
  }
}
</script>

<template>
  <div class="product-exports" role="group" aria-label="Exporter la fiche produit">
    <DsfrButton
      class="fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-download-line"
      data-testid="application-export-powerpoint-btn"
      :disabled="isExporting"
      :aria-busy="isExporting"
      @click="exportProduct('PowerPoint')"
    >
      Exporter la fiche produit en PowerPoint
    </DsfrButton>
    <DsfrButton
      class="fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-download-line"
      data-testid="application-export-html-btn"
      :disabled="isExporting"
      :aria-busy="isExporting"
      @click="exportProduct('HTML')"
    >
      Exporter la fiche produit en HTML
    </DsfrButton>
    <p class="fr-sr-only" role="status" aria-live="polite">
      {{ exportingFormat ? `Préparation ${exportingFormat === "PowerPoint" ? "du PowerPoint" : "de la fiche HTML"}…` : "" }}
    </p>
  </div>
</template>

<style scoped>
.product-exports {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
