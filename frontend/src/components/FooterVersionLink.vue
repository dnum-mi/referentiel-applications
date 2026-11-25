<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ version: string }>();
const repositoryUrl = "https://github.com/dnum-mi/referentiel-applications";
const versionLanguage = computed(() => (["development", "main", "dev"].includes(props.version) ? "en" : undefined));
const href = computed(() => {
  // Les premières versions publiées portaient un tag numérique sans préfixe « v ».
  const isRelease = /^(?:v\w[\w.-]*|\d+\.\d+\.\d+)$/.test(props.version);
  return isRelease ? `${repositoryUrl}/releases/tag/${props.version}` : repositoryUrl;
});
</script>

<template>
  <a :href="href" target="_blank" rel="noopener noreferrer" class="fr-link fr-link--sm">
    <span
      >Version : <span :lang="versionLanguage">{{ version }}</span> sur GitHub</span
    >
    <span class="fr-sr-only">(nouvelle fenêtre)</span>
  </a>
</template>
