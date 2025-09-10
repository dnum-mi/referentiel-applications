<script setup lang="ts">
import { computed, ref } from "vue";
import { useOrganizationStore } from "@/stores/organizationStore";
import type { OrganizationDto } from "@/client/types.gen";

const props = withDefaults(
  defineProps<{
    organizationId: string
    hideHierarchy?: boolean
    clickable?: boolean
  }>(),
  {
    hideHierarchy: false,
    clickable: true,
  },
);
const orgStore = useOrganizationStore();

onMounted(() => {
  orgStore.getById(props.organizationId);
});
const organization = computed<OrganizationDto | undefined>(() => {
  return orgStore.organizations[props.organizationId];
});

const unfold = ref(false);
</script>

<template>
  <template v-if="!hideHierarchy && organization?.parentId">
    <template v-if="unfold">
      <OrgBreadCrumb :organization-id="organization.parentId">
        <a class="fr-link" href="#" data-testid="org-breadcrumb-collapse" @click="unfold = false"> - </a>
      </OrgBreadCrumb>&nbsp;
    </template>
    <template v-else>
      <a class="fr-link" href="#" title="Voir le parent" data-testid="org-breadcrumb-expand" @click="unfold = true"> + </a>
    </template>
  </template>
  <template v-else />
  <a v-if="unfold" target="" href="#" title="Refermer l'arborescence" data-testid="org-breadcrumb-close" @click="unfold = false">–</a>
  <template v-if="organization">
    <template v-if="!hideHierarchy && organization?.parentId">
&nbsp;
    </template>
    <template v-if="clickable">
      <a v-if="organization.url" :href="organization.url" target="_blank" data-testid="org-breadcrumb-link">{{ organization.label }}</a>
      <a v-else target="" href="#" data-testid="org-breadcrumb-link">{{ organization.label }}</a>
    </template>
    <template v-else>
      <span target="" href="#" data-testid="org-breadcrumb-label">{{ organization.label }}</span>
    </template>
  </template>
</template>
