<script setup lang="ts">
import type { OrganizationDto } from "@/client/types.gen";
import { useOrganizationStore } from "@/stores/organizationStore";
import { computed, onMounted } from "vue";

const props = defineProps<{
  organizationId: string;
}>();

const orgStore = useOrganizationStore();

const organization = computed<OrganizationDto | undefined>(() => {
  return orgStore.organizations[props.organizationId];
});

onMounted(() => {
  if (!orgStore.organizations[props.organizationId]) {
    orgStore.fetchById(props.organizationId);
  }
});
</script>

<template>
  <a v-if="organization?.url" :href="organization.url" target="_blank" data-testid="org-link">{{ organization.path }}</a>
  <span v-else data-testid="org-link">{{ organization?.path ?? "" }}</span>
</template>
