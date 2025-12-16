<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useApplicationSearch, type Filters } from "@/composables/use-application-search";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import { DsfrInput, DsfrSelect } from "@gouvminint/vue-dsfr";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useDebouncedFn } from "@/composables/use-debouncefn";
import type { OrganizationDto } from "@/client/types.gen";

const { filters, setFilter } = useApplicationSearch();
const actorTypeStore = useActorTypeStore();
const organizationStore = useOrganizationStore();

const organizations = ref<OrganizationDto[]>([]);

const actorTypeOptions = computed(() => [
  { text: "Tous", value: "" },
  ...actorTypeStore.actorTypes.map((actor) => ({ text: actor.label, value: actor.id })),
  { text: "Sans Maîtrise d'Ouvrage (MOA)", value: "missingMoa" },
  { text: "Sans Maîtrise d'Œuvre (MOE)", value: "missingMoe" },
]);

const selectedActorTypeId = computed({
  get: () => {
    if (filters.value.missingMoa) return "missingMoa";
    if (filters.value.missingMoe) return "missingMoe";
    const currentCode = filters.value.actorType;
    if (!currentCode) return "";
    return actorTypeStore.actorTypes.find((actor) => actor.code === currentCode)?.id ?? "";
  },
  set: (value: string) => {
    if (!value) {
      setFilter({ actorType: undefined, missingMoa: undefined, missingMoe: undefined, page: 0 });
      return;
    }
    if (value === "missingMoa") {
      setFilter({ actorType: undefined, missingMoa: true, missingMoe: undefined, page: 0 });
      return;
    }
    if (value === "missingMoe") {
      setFilter({ actorType: undefined, missingMoa: undefined, missingMoe: true, page: 0 });
      return;
    }
    const selected = actorTypeStore.actorTypes.find((actor) => actor.id === value);
    if (selected) setFilter({ actorType: selected.code, missingMoa: undefined, missingMoe: undefined, page: 0 });
  },
});

onMounted(() => actorTypeStore.fetchAll());

const { run: debouncedOrganizationSearch } = useDebouncedFn(async (searchTerm: string | undefined) => {
  organizations.value = await organizationStore.find(searchTerm, true);
}, 300);

watch(() => filters.value.organization, debouncedOrganizationSearch, { immediate: true });
</script>

<template>
  <DsfrSelect v-model="selectedActorTypeId" :options="actorTypeOptions" label="Type d'acteur" data-testid="actor-filter-select" />

  <DsfrInput
    :model-value="filters.actorEmail || ''"
    label-visible
    label="Email"
    type="email"
    data-testid="actor-email-filter-input"
    class="fr-mb-2w"
    @update:model-value="setFilter({ actorEmail: $event || undefined, page: 0 })"
  />

  <DsfrInput
    :model-value="filters.organization || ''"
    label-visible
    label="Nom de l'organisation"
    list="organizationSuggestionsList"
    placeholder="Rechercher une organisation"
    data-testid="organization-filter-input"
    @update:model-value="setFilter({ organization: $event || undefined, page: 0 })"
  />
  <datalist id="organizationSuggestionsList" data-testid="organization-suggestions-list">
    <option v-for="organization in organizations" :key="organization.id" :data-testid="`organization-option-${organization.id}`">
      {{ organization.path }}
    </option>
  </datalist>
</template>
