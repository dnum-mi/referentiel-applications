<script setup lang="ts">
defineOptions({ name: "FilterWithHelp" });
</script>

<template>
  <div class="filter-with-help">
    <slot />
    <div class="filter-with-help__help"><slot name="help" /></div>
  </div>
</template>

<style scoped>
.filter-with-help {
  position: relative;
}

.filter-with-help :deep(.fr-label) {
  padding-inline-end: 2rem;
}

.filter-with-help__help {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
}
</style>
