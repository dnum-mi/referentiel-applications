<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { PropType } from "vue";
import type { Application } from "@/models/Application";
import type { OrganizationDto, ActorTypeDto } from "@/client/types.gen.js";
import type { Actor } from "@/models/Actor";
import { useOrganizationStore } from "@/stores/organizationStore";

const props = defineProps({
  initialData: Object as PropType<Actor>,
  isSubmitting: Boolean,
  application: {
    type: Object as PropType<Application>,
    required: true,
  },
  actorTypes: {
    type: Array as PropType<ActorTypeDto[]>,
    required: true,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const organizationStore = useOrganizationStore();
const organizations = ref<OrganizationDto[]>([]);
const organizationInputValue = ref("");

const form = ref<Actor>({
  email: "",
  ...props.initialData,
  applicationId: props.application.id,
});

const actorTypeOptions = props.actorTypes.map(type => ({
  text: type.label,
  value: type.id,
}));

onMounted(async () => {
  const orgId = props.initialData?.organizationId;
  if (orgId) {
    const org = await organizationStore.getById(orgId);
    if (org) {
      organizationInputValue.value = org.label;
      organizations.value = [org];
    }
  }
});

// Handle organization input changes
async function handleOrganizationInput(search: string) {
  organizationInputValue.value = search;

  // Find matching organization and update form
  const response = await organizationStore.find(search);
  organizations.value = response;
  const matchingOrg = organizations.value.find(org => org.label === organizationInputValue.value);
  form.value.organizationId = matchingOrg?.id || "";
}

function handleSubmit() {
  emit("submit", form.value);
}
</script>

<template>
  <form data-testid="actor-form" @submit.prevent="handleSubmit">
    <div class="fr-input-group fr-mt-3w">
      <DsfrSelect v-model="form.actorTypeId" label="Type d'acteur" required :options="actorTypeOptions" data-testid="actor-type-select" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <DsfrInput
        :model-value="organizationInputValue"
        label-visible
        label="Organisation"
        list="organizationSuggestionsList"
        placeholder="Rechercher une organisation"
        data-testid="actor-organization"
        @update:model-value="handleOrganizationInput"
      />
      <datalist id="organizationSuggestionsList" data-testid="organization-suggestions-list">
        <option
          v-for="organization in organizations"
          :key="organization.id"
          :value="organization.label"
          :data-testid="`organization-option-${organization.id}`"
        >
          {{ organization.label }}
        </option>
      </datalist>
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="email">Email</label>
      <input
        v-model="form.email"
        type="email"
        class="fr-input"
        placeholder="exemple@domaine.com"
        data-testid="actor-email-input"
        required
      >
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="firstname">Prénom (Optionnel)</label>
      <input v-model="form.firstname" type="text" class="fr-input" placeholder="Prénom" data-testid="actor-firstname-input">
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="lastname">Nom (Optionnel)</label>
      <input v-model="form.lastname" type="text" class="fr-input" placeholder="Nom de famille" data-testid="actor-lastname-input">
    </div>

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="actor-cancel-btn" @click="$emit('cancel')" />
      <DsfrButton
        type="submit"
        :disabled="isSubmitting"
        :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'"
        data-testid="actor-submit-btn"
      >
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm" data-testid="actor-submit-loading">
            <span class="fr-loading__icon" aria-hidden="true" />
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
