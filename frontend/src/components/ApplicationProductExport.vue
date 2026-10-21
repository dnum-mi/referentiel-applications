<script setup lang="ts">
import { ref } from "vue";
import { useApplicationStore } from "@/stores/applicationStore";
import { useToasterStore } from "@/stores/toasterStore";
import { useBetaFeatures } from "@/composables/use-beta-features";
import { FeatureId, Permission } from "@/client";
import BetaBadge from "@/components/BetaBadge.vue";

const props = defineProps<{ applicationId: string }>();
const applicationStore = useApplicationStore();
const toaster = useToasterStore();
const { canAccess, isBeta, authorize, refreshAccess } = useBetaFeatures();
const isExporting = ref(false);
const exportingFormat = ref<"PowerPoint" | "HTML" | null>(null);

async function exportProduct(format: "PowerPoint" | "HTML") {
  const feature = format === "PowerPoint" ? FeatureId.PRODUCT_POWERPOINT_EXPORT : FeatureId.PRODUCT_HTML_EXPORT;
  if (isExporting.value || !canAccess(feature)) return;
  isExporting.value = true;
  exportingFormat.value = format;
  try {
    if (!(await authorize(feature, [Permission.APP_READ]))) return;
    if (format === "PowerPoint") await applicationStore.downloadProductPowerpoint(props.applicationId);
    else await applicationStore.downloadProductHtml(props.applicationId);
  } catch (error) {
    await refreshAccess();
    console.error("Erreur lors de l'export de la fiche produit", error);
    toaster.addErrorMessage(`Impossible d'exporter la fiche produit en ${format}. Veuillez réessayer.`);
  } finally {
    isExporting.value = false;
    exportingFormat.value = null;
  }
}
</script>

<template>
  <div
    v-if="canAccess(FeatureId.PRODUCT_POWERPOINT_EXPORT) || canAccess(FeatureId.PRODUCT_HTML_EXPORT)"
    class="product-exports"
    role="group"
    aria-label="Exporter la fiche produit"
  >
    <DsfrButton
      v-if="canAccess(FeatureId.PRODUCT_POWERPOINT_EXPORT)"
      type="button"
      class="fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-download-line"
      data-testid="application-export-powerpoint-btn"
      :aria-disabled="isExporting"
      :aria-busy="isExporting"
      @click="exportProduct('PowerPoint')"
    >
      Exporter la fiche produit en PowerPoint
      <BetaBadge v-if="isBeta(FeatureId.PRODUCT_POWERPOINT_EXPORT)" />
    </DsfrButton>
    <DsfrButton
      v-if="canAccess(FeatureId.PRODUCT_HTML_EXPORT)"
      type="button"
      class="fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-download-line"
      data-testid="application-export-html-btn"
      :aria-disabled="isExporting"
      :aria-busy="isExporting"
      @click="exportProduct('HTML')"
    >
      Exporter la fiche produit en HTML
      <BetaBadge v-if="isBeta(FeatureId.PRODUCT_HTML_EXPORT)" />
    </DsfrButton>
    <output class="fr-sr-only" aria-live="polite">
      {{ exportingFormat ? `Préparation ${exportingFormat === "PowerPoint" ? "du PowerPoint" : "de la fiche HTML"}…` : "" }}
    </output>
  </div>
</template>

<style scoped>
.product-exports {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.product-exports .fr-btn[aria-disabled="true"] {
  color: var(--text-disabled-grey);
  cursor: progress;
}
</style>
