<script setup lang="ts">
import api from "@/api/index.js";
import type { ActorTypeDto, CreateActorDto, OrganizationDto } from "@/client/types.gen.js";
import type { Application } from "@/models/Application";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useToasterStore } from "@/stores/toasterStore";
import type { PropType } from "vue";
import { computed, onMounted, ref } from "vue";
import OrganizationSearchSelect from "../common/OrganizationSearchSelect.vue";

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
const toaster = useToasterStore();
const initialOrganization = ref<OrganizationDto | null>(null);
const isSyncingFromMaia = ref(false);

async function syncFromMaiaByEmail() {
  isSyncingFromMaia.value = true;
  if (!form.value.email) {
    toaster.addErrorMessage("L'email est requis pour synchroniser depuis MAIA");
    isSyncingFromMaia.value = false;
    return;
  }
  try {
    const response = await api.userControllerSyncOrganizationFromMaiaByEmail({ path: { email: form.value.email } });
    if (response.response.ok && response.data) {
      const { organizationId: newOrgId, firstName, lastName } = response.data;
      form.value.firstname = firstName;
      form.value.lastname = lastName;
      if (newOrgId) {
        const org = await organizationStore.getById(newOrgId);
        if (org) {
          initialOrganization.value = org;
        }
        organizationId.value = newOrgId;

        toaster.addSuccessMessage("Organisation synchronisée depuis MAIA");
      }
    } else {
      toaster.addErrorMessage("Erreur lors de la synchronisation MAIA (email non trouvé)");
    }
  } catch (error) {
    console.error("Erreur lors de la synchronisation MAIA:", error);
    toaster.addErrorMessage("Erreur lors de la synchronisation MAIA");
  } finally {
    isSyncingFromMaia.value = false;
  }
}

const form = ref<CreateActorDto>({
  actorTypeId: "",
  isGroup: false,
  ...props.initialData,
  applicationId: props.application.id,
});

const actorTypeOptions = props.actorTypes.map((type) => ({
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
  return form.value.actorTypeId && form.value.actorTypeId !== "" && organizationId.value && organizationId.value !== "";
});

const isGroup = computed(() => !!form.value.isGroup);

function handleSubmit() {
  const formData = {
    ...form.value,
    email: form.value.email?.trim() || "",
    firstname: isGroup.value ? null : (form.value.firstname?.trim() ?? undefined),
    lastname: isGroup.value ? null : (form.value.lastname?.trim() ?? undefined),
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

    <DsfrInput
      v-model="form.email"
      label="Email"
      label-visible
      type="email"
      placeholder="exemple@domaine.com"
      data-testid="actor-email-input"
      class="fr-mb-3w"
    />
    <DsfrButton
      type="button"
      label="Synchroniser depuis MAIA (par email)"
      size="sm"
      tertiary
      :disabled="isSyncingFromMaia || !form.email"
      data-testid="admin-user-sync-maia-btn"
      title="Synchroniser l'organisation depuis MAIA"
      aria-label="Synchroniser l'organisation depuis MAIA"
      @click="syncFromMaiaByEmail"
      style="margin-bottom: 1rem"
    />

    <OrganizationSearchSelect
      v-model="organizationId"
      :initial-organization="initialOrganization"
      data-testid="actor-organization"
      class="fr-mb-3w"
      required
    />

    <DsfrCheckbox
      v-model="form.isGroup"
      name="isGroup"
      :value="true"
      label="Cet acteur est rattaché(e) à une entité"
      data-testid="actor-is-group-checkbox"
      class="fr-mb-3w"
    />

    <template v-if="!isGroup">
      <fieldset class="fr-fieldset fr-mb-3w" aria-labelledby="actor-identity-legend">
        <legend id="actor-identity-legend" class="fr-fieldset__legend">Identité de l'acteur</legend>
        <div class="fr-fieldset__element">
          <DsfrInput v-model="form.firstname" label="Prénom" label-visible placeholder="Prénom" data-testid="actor-firstname-input" />
        </div>
        <div class="fr-fieldset__element">
          <DsfrInput v-model="form.lastname" label="Nom" label-visible placeholder="Nom de famille" data-testid="actor-lastname-input" />
        </div>
      </fieldset>
    </template>

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
