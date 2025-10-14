<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import type { PropType } from "vue";
import type { Application } from "@/models/Application";
import type { OrganizationDto, ActorTypeDto, CreateActorDto } from "@/client/types.gen.js";
import OrganizationSearchSelect from "../common/OrganizationSearchSelect.vue";
import { useOrganizationStore } from "@/stores/organizationStore";

const props = defineProps({
  initialData: Object as PropType<CreateActorDto>,
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
const initialOrganization = ref<OrganizationDto | null>(null);

const form = ref<CreateActorDto>({
  actorTypeId: "",
  ...props.initialData,
  applicationId: props.application.id,
});

const actorTypeOptions = props.actorTypes.map(type => ({
  text: type.label,
  value: type.id,
}));

// Handle organization ID with proper typing
const organizationId = computed({
  get: () => form.value.organizationId || "",
  set: (value: string) => {
    form.value.organizationId = value === "" ? null : value;
  },
});

// Load initial organization if actor has one
onMounted(async () => {
  if (props.initialData?.organizationId) {
    try {
      const org = await organizationStore.getById(props.initialData.organizationId);
      if (org) {
        initialOrganization.value = org;
      }
    } catch (error) {
      console.error("Error loading initial organization:", error);
    }
  }
});

const isFormValid = computed(() => {
  return form.value.actorTypeId && form.value.actorTypeId !== ""
    && organizationId.value && organizationId.value !== "";
});

function handleSubmit() {
  const formData = {
    ...form.value,
    email: form.value.email?.trim() || "",
    firstname: form.value.firstname?.trim() || undefined,
    lastname: form.value.lastname?.trim() || undefined,
  };
  emit("submit", formData);
}
</script>

<template>
  <form data-testid="actor-form" @submit.prevent="handleSubmit">
    <DsfrSelect
      v-model="form.actorTypeId"
      label="Type d'acteur"
      required
      :options="actorTypeOptions"
      data-testid="actor-type-select"
      class="fr-mb-3w"
    />

    <OrganizationSearchSelect
      v-model="organizationId"
      :initial-organization="initialOrganization"
      data-testid="actor-organization"
      class="fr-mb-3w"
      required
    />

    <DsfrInput
      v-model="form.email"
      label="Email"
      label-visible
      type="email"
      placeholder="exemple@domaine.com"
      data-testid="actor-email-input"
      class="fr-mb-3w"
    />

    <DsfrInput
      v-model="form.firstname"
      label="Prénom"
      label-visible
      placeholder="Prénom"
      data-testid="actor-firstname-input"
      class="fr-mb-3w"
    />

    <DsfrInput
      v-model="form.lastname"
      label="Nom"
      label-visible
      placeholder="Nom de famille"
      data-testid="actor-lastname-input"
      class="fr-mb-3w"
    />

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="actor-cancel-btn" @click="$emit('cancel')" />
      <DsfrButton
        type="submit"
        :disabled="isSubmitting || !isFormValid"
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
