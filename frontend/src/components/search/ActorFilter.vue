<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useApplicationSearchStore } from "@/stores/applicationSearchStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import { DsfrInput } from "@gouvminint/vue-dsfr";
import { useOrganizationStore } from "@/stores/organizationStore";
import type { OrganizationDto } from "@/client/types.gen";

const searchStore = useApplicationSearchStore();
const actorTypeStore = useActorTypeStore();
const organizationStore = useOrganizationStore();

const organizations = ref<OrganizationDto[]>([]);

const selectedActorTypeId = computed({
  get: () => {
    const currentCode = searchStore.filters.actorType;
    if (!currentCode) return "";

    const match = actorTypeStore.actorTypes.find(actor => actor.code === currentCode);
    return match?.id ?? "";
  },
  set: (value: string) => {
    if (!value) {
      searchStore.setFilter({ actorType: undefined, page: 0 });
      return;
    }

    const selected = actorTypeStore.actorTypes.find(actor => actor.id === value);
    if (selected) {
      searchStore.setFilter({ actorType: selected.code, page: 0 });
    }
  },
});

const actorTypeOptions = computed(() => [
  { text: "Tous", value: "" },
  ...actorTypeStore.actorTypes.map(actor => ({
    text: actor.label,
    value: actor.id,
  })),
]);

const actorEmailValue = computed({
  get: () => searchStore.filters.actorEmail || "",
  set: (value: string) => {
    searchStore.setFilter({
      actorEmail: value || undefined,
      page: 0,
    });
  },
});

const organizationValue = computed({
  get: () => searchStore.filters.organization || "",
  set: (value: string) => {
    searchStore.setFilter({ organization: value || undefined, page: 0 });
  },
});

onMounted(() => {
  actorTypeStore.fetchAll();
});

watch(
  () => searchStore.filters.organization,
  async (searchTerm) => {
    organizations.value = await organizationStore.find(searchTerm, true);
  },
  { immediate: true },
);
</script>

<template>
  <DsfrSelect v-model="selectedActorTypeId" :options="actorTypeOptions" label="Type d'acteur" data-testid="actor-filter-select" />

  <DsfrInput v-model="actorEmailValue" label-visible label="Email" type="email" data-testid="actor-email-filter-input" class="fr-mb-2w" />

  <DsfrInput
    v-model="organizationValue"
    label-visible
    label="Nom de l'organisation"
    list="organizationSuggestionsList"
    placeholder="Rechercher une organisation"
    data-testid="organization-filter-input"
  />
  <datalist id="organizationSuggestionsList" data-testid="organization-suggestions-list">
    <option v-for="organization in organizations" :key="organization.id" :data-testid="`organization-option-${organization.id}`">
      {{ organization.label }}
    </option>
  </datalist>
</template>
