<script setup lang="ts">
import SearchApplications from "@/components/SearchApplications.vue";
import CreateApplication from "@/components/CreateApplication.vue";
</script>

<template>
  <div>
    <CreateApplication class="button-right" />
    <h2>Rechercher une Application</h2>
    <SearchApplications />
  </div>
</template>
