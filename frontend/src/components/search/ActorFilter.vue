<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import { DsfrInput, DsfrSelect } from "@gouvminint/vue-dsfr";
import { useOrganizationStore } from "@/stores/organizationStore";
import { watchDebounced } from "@vueuse/core";
import type { OrganizationDto } from "@/client/types.gen";

const { filters, setFilter } = useApplicationSearch();
const actorTypeStore = useActorTypeStore();
const organizationStore = useOrganizationStore();

const organizations = ref<OrganizationDto[]>([]);

const actorTypeOptions = computed(() => [
  { text: "Tous", value: "" },
  ...[...actorTypeStore.actorTypes]
    .sort((a, b) => a.label.localeCompare(b.label, "fr"))
    .map((actor) => ({ text: actor.label, value: actor.id })),
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

watchDebounced(
  () => filters.value.organization,
  async (searchTerm) => {
    organizations.value = await organizationStore.find(searchTerm, true);
  },
  { debounce: 300, immediate: true },
);
</script>

<template>
  <DsfrSelect
    v-model="selectedActorTypeId"
    :options="actorTypeOptions"
    aria-describedby="actor-type-tooltip-desc"
    data-testid="actor-filter-select"
  >
    <template #label>
      <span style="display: inline-flex; align-items: center; gap: 0.25rem">
        Type d'acteur
        <DsfrTooltip
          id="actor-type-tooltip-desc"
          content="Filtre les applications selon le type d'acteur associé (maîtrise d'ouvrage, maîtrise d'œuvre…), ou selon l'absence de MOA ou de MOE."
        />
      </span>
    </template>
  </DsfrSelect>

  <DsfrInput
    :model-value="filters.actorEmail || ''"
    label-visible
    type="email"
    aria-describedby="actor-email-tooltip-desc"
    data-testid="actor-email-filter-input"
    class="fr-mb-2w"
    @update:model-value="setFilter({ actorEmail: $event ? String($event) : undefined, page: 0 })"
  >
    <template #label>
      <span style="display: inline-flex; align-items: center; gap: 0.25rem">
        Email
        <DsfrTooltip
          id="actor-email-tooltip-desc"
          content="Recherche les applications ayant un acteur dont l'adresse email contient le texte saisi."
        />
      </span>
    </template>
  </DsfrInput>

  <DsfrInput
    :model-value="filters.organization || ''"
    label-visible
    list="organizationSuggestionsList"
    placeholder="Rechercher une organisation"
    aria-describedby="actor-organization-tooltip-desc"
    data-testid="organization-filter-input"
    @update:model-value="setFilter({ organization: $event ? String($event) : undefined, page: 0 })"
  >
    <template #label>
      <span style="display: inline-flex; align-items: center; gap: 0.25rem">
        Nom de l'organisation
        <DsfrTooltip
          id="actor-organization-tooltip-desc"
          content="Recherche les applications rattachées à une organisation dont le nom contient le texte saisi."
        />
      </span>
    </template>
  </DsfrInput>
  <datalist id="organizationSuggestionsList" data-testid="organization-suggestions-list">
    <option v-for="organization in organizations" :key="organization.id" :data-testid="`organization-option-${organization.id}`">
      {{ organization.path }}
    </option>
  </datalist>
</template>
