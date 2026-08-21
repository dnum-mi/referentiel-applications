<script setup lang="ts">
import type { EolProductDto, TechnologyDto } from "@/client/types.gen";
import type { PropType } from "vue";
import { computed, ref } from "vue";

const props = defineProps({
  initialData: Object as PropType<TechnologyDto>,
  isSubmitting: Boolean,
  eolProducts: {
    type: Array as PropType<EolProductDto[]>,
    default: () => [],
  },
});

const emit = defineEmits(["submit", "cancel"]);

const form = ref<{
  technology: string;
  product: string;
  version: string;
  docUrl: string;
}>({
  technology: props.initialData?.technology ?? "",
  product: props.initialData?.product ?? "",
  version: props.initialData?.version ?? "",
  docUrl: props.initialData?.docUrl ?? "",
});

const isFormValid = computed(() => form.value.technology.trim() !== "" && form.value.product.trim() !== "");

// Miroir de la normalisation backend (normalizeProductKey) : les alias avec
// tirets/points du catalogue couvrent ainsi les saisies « SQL Server », etc.
function normalizeProductKey(product: string): string {
  return product
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const productOptions = computed(() =>
  [...new Set(props.eolProducts.map((product) => product.label || product.name))].sort((a, b) => a.localeCompare(b, "fr")),
);

const knownProductKeys = computed(() => {
  const keys = new Set<string>();
  for (const product of props.eolProducts) {
    keys.add(normalizeProductKey(product.name));
    if (product.label) keys.add(normalizeProductKey(product.label));
    for (const alias of product.aliases ?? []) keys.add(normalizeProductKey(alias));
  }
  return keys;
});

// Avertissement non bloquant : le catalogue peut être indisponible (liste vide,
// on ne sait pas) et la saisie d'un produit hors catalogue reste autorisée.
const productUnknown = computed(() => {
  const key = normalizeProductKey(form.value.product);
  return key !== "" && knownProductKeys.value.size > 0 && !knownProductKeys.value.has(key);
});

function handleSubmit() {
  emit("submit", {
    id: props.initialData?.id,
    technology: form.value.technology.trim(),
    product: form.value.product.trim(),
    version: form.value.version?.trim() || null,
    docUrl: form.value.docUrl?.trim() || null,
  });
}
</script>

<template>
  <form data-testid="technology-form" @submit.prevent="handleSubmit">
    <DsfrInput
      v-model="form.technology"
      label="Technologie"
      label-visible
      required
      placeholder="ex : Base de données, Langage"
      data-testid="technology-name-input"
      class="fr-mb-3w"
    />

    <DsfrInput
      v-model="form.product"
      label="Produit"
      label-visible
      required
      placeholder="ex : PostgreSQL, Node.js"
      hint="La fin de vie est vérifiée automatiquement via endoflife.date"
      list="technology-product-options"
      data-testid="technology-product-input"
      :class="productUnknown ? 'fr-mb-1w' : 'fr-mb-3w'"
    />
    <datalist id="technology-product-options">
      <option v-for="option in productOptions" :key="option" :value="option"></option>
    </datalist>
    <p v-if="productUnknown" class="fr-hint-text fr-mb-3w" data-testid="technology-product-unknown-hint">
      Produit non suivi par endoflife.date : la fin de vie ne pourra pas être vérifiée automatiquement.
    </p>

    <DsfrInput
      v-model="form.version"
      label="Version"
      label-visible
      placeholder="ex : 20.11"
      data-testid="technology-version-input"
      class="fr-mb-3w"
    />

    <DsfrInput
      v-model="form.docUrl"
      label="Documentation"
      label-visible
      type="url"
      placeholder="ex : https://www.postgresql.org/docs/"
      data-testid="technology-docurl-input"
      class="fr-mb-3w"
    />

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="technology-cancel-btn" @click="$emit('cancel')" />
      <DsfrButton
        type="submit"
        :disabled="isSubmitting || !isFormValid"
        :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'"
        data-testid="technology-submit-btn"
      />
    </div>
  </form>
</template>
