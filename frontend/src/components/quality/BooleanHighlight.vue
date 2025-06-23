<script setup lang="ts">
defineProps<{
  label: string;
  value: boolean;
  small?: boolean;
}>();
</script>

<template>
  <DsfrHighlight :text="`${label} : ${value ? 'oui' : 'non'}`" :color="value ? 'green-emeraude' : 'red-marianne'" :small="small" />
</template>
