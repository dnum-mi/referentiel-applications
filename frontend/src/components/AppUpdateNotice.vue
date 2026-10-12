<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{ available: boolean; update: () => Promise<void> }>();
const postponed = ref(false);
const updating = ref(false);
const error = ref("");
watch(
  () => props.available,
  () => {
    postponed.value = false;
    error.value = "";
  },
);

async function applyUpdate() {
  updating.value = true;
  error.value = "";
  try {
    await props.update();
  } catch {
    error.value = "La mise à jour a échoué. Vous pouvez réessayer après avoir enregistré vos modifications.";
  } finally {
    updating.value = false;
  }
}
</script>

<template>
  <div class="fr-container" role="status" aria-live="polite" aria-atomic="true">
    <section v-if="available && !postponed" class="fr-notice fr-notice--info update-notice" aria-labelledby="app-update-title">
      <h2 id="app-update-title" class="fr-h6 fr-mb-1w">Une nouvelle version est disponible</h2>
      <p>Enregistrez vos modifications avant de mettre à jour l’application. La mise à jour rechargera cette page.</p>
      <div class="fr-btns-group fr-btns-group--inline-sm">
        <button type="button" class="fr-btn" :disabled="updating" @click="applyUpdate">
          {{ updating ? "Mise à jour en cours…" : "Mettre à jour" }}
        </button>
        <button type="button" class="fr-btn fr-btn--secondary" :disabled="updating" @click="postponed = true">Plus tard</button>
      </div>
      <p v-if="error" class="fr-error-text">{{ error }}</p>
    </section>
  </div>
</template>

<style scoped>
.update-notice {
  padding: 1rem;
  margin-top: 1rem;
}
</style>
