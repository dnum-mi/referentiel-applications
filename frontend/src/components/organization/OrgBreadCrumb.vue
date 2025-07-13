<script setup lang="ts">
import { computed, ref } from "vue";
import { useOrganizationStore } from "@/stores/organizationStore";
import type { Organization } from "@/models/organization";

const orgStore = useOrganizationStore();
const props = withDefaults(
  defineProps<{
    organizationId: string;
    hideHierarchy?: boolean;
    clickable?: boolean;
  }>(),
  {
    hideHierarchy: false,
    clickable: true,
  },
);
const organization = computed<Organization | undefined>(() => {
  orgStore.getById(props.organizationId);
  return orgStore.organizations[props.organizationId];
});

const unfold = ref(false);
</script>
<template>
  <template v-if="!hideHierarchy && organization?.parentId">
    <template v-if="unfold">
      <OrgBreadCrumb :organizationId="organization.parentId"> <a @click="unfold = false" class="fr-link" href="#"> - </a> </OrgBreadCrumb
      >&nbsp;
    </template>
    <template v-else>
      <a @click="unfold = true" class="fr-link" href="#" title="Voir le parent"> + </a>
    </template>
  </template>
  <template v-else></template>
  <a v-if="unfold" @click="unfold = false" target="" href="#" title="Refermer l'arborescence">–</a>
  <template v-if="organization">
    <template v-if="!hideHierarchy && organization?.parentId"> &nbsp; </template>
    <template v-if="clickable">
      <a v-if="organization.url" :href="organization.url" target="_blank">{{ organization.label }}</a>
      <a v-else target="" href="#">{{ organization.label }}</a>
    </template>
    <template v-else>
      <span target="" href="#">{{ organization.label }}</span>
    </template>
  </template>
</template>
