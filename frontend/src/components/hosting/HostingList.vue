<script setup lang="ts">
import { defineProps, defineEmits } from "vue";
import type { Hosting } from "@/models/Hosting";

defineProps<{ hostings: Hosting[] }>();
const emit = defineEmits(["edit", "delete"]);

function handleEdit(hosting: Hosting) {
  emit("edit", hosting);
}

function handleDelete(hosting: Hosting) {
  emit("delete", hosting);
}
</script>

<template>
  <div v-if="hostings.length === 0" class="fr-text--sm fr-text--italic">Aucun hébergement enregistré.</div>
  <div v-else>
    <div v-for="hosting in hostings" :key="hosting.id" class="fr-mb-2w fr-pb-1w fr-border--bottom">
      <div class="fr-grid-row fr-grid-row--middle">
        <div class="fr-col">
          <p class="fr-mb-0">
            <strong>{{ hosting.label || "Hébergement" }}</strong>
          </p>
          <div class="fr-text--sm fr-mt-1w">
            <!-- Location info -->
            <p class="fr-mb-0" v-if="hosting.hostingOption?.site || hosting.hostingOption?.building || hosting.hostingOption?.room">
              <span class="fr-icon-map-pin-2-line fr-mr-1w" aria-hidden="true"></span>
              {{ [hosting.hostingOption?.site, hosting.hostingOption?.building, hosting.hostingOption?.room].filter(Boolean).join(" - ") }}
            </p>

            <!-- Platform & Provider info -->
            <p class="fr-mb-0" v-if="hosting.hostingOption?.platform || hosting.hostingOption?.provider">
              <span class="fr-icon-server-line fr-mr-1w" aria-hidden="true"></span>
              {{ hosting.hostingOption?.platform || "" }}
              {{ hosting.hostingOption?.provider ? `(${hosting.hostingOption.provider})` : "" }}
            </p>
          </div>
        </div>
        <div class="fr-col-auto">
          <DsfrButton tertiary size="sm" icon="fr-icon-edit-line" title="Modifier" @click="handleEdit(hosting)" class="fr-mr-1w" />
          <DsfrButton tertiary size="sm" icon="fr-icon-delete-bin-line" title="Supprimer" @click="handleDelete(hosting)" />
        </div>
      </div>
    </div>
  </div>
</template>
