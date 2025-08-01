<script setup lang="ts">
import { computed, ref } from "vue";
import { useOrganizationStore } from "@/stores/organizationStore";
import type { Organization } from "@/models/organization";

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
const organization = computed<Organization | undefined>(() => {
  orgStore.getById(props.organizationId);
  return orgStore.organizations[props.organizationId];
});

const unfold = ref(false);
</script>

<template>
  <template v-if="!hideHierarchy && organization?.parentId">
    <template v-if="unfold">
      <OrgBreadCrumb :organization-id="organization.parentId">
        <a class="fr-link" href="#" @click="unfold = false"> - </a>
      </OrgBreadCrumb>&nbsp;
    </template>
    <template v-else>
      <a class="fr-link" href="#" title="Voir le parent" @click="unfold = true"> + </a>
    </template>
  </template>
  <template v-else />
  <a v-if="unfold" target="" href="#" title="Refermer l'arborescence" @click="unfold = false">–</a>
  <template v-if="organization">
    <template v-if="!hideHierarchy && organization?.parentId">
&nbsp;
    </template>
    <template v-if="clickable">
      <a v-if="organization.url" :href="organization.url" target="_blank">{{ organization.label }}</a>
      <a v-else target="" href="#">{{ organization.label }}</a>
    </template>
    <template v-else>
      <span target="" href="#">{{ organization.label }}</span>
    </template>
  </template>
</template>
