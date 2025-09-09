<script setup lang="ts">
import { ref } from "vue";
import type { PropType } from "vue";
import type { Application } from "@/models/Application";
import type { Organization } from "@/models/organization";
import type { ActorType } from "@/models/ActorType";
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
    type: Array as PropType<ActorType[]>,
    required: true,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const organizationStore = useOrganizationStore();
const form = ref<Actor>({
  ...props.initialData,
  applicationId: props.application.id,
});

const actorOrganization = ref<Organization>(organizationStore.organizations[props.initialData?.organizationId ?? ""]);

const actorTypeOptions = props.actorTypes.map(type => ({
  text: type.label,
  value: type.id,
}));

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
      <OrganizationFilter
        v-model="form.organizationId"
        label="Organisation"
        :preselected="actorOrganization"
        data-testid="actor-organization"
        @select="form.organizationId = $event?.id"
      />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="email">Email</label>
      <input id="email" v-model="form.email" type="email" class="fr-input" placeholder="exemple@domaine.com" data-testid="actor-email-input" required>
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="firstname">Prénom (Optionnel)</label>
      <input id="firstname" v-model="form.firstname" type="text" class="fr-input" placeholder="Prénom" data-testid="actor-firstname-input">
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="lastname">Nom (Optionnel)</label>
      <input id="lastname" v-model="form.lastname" type="text" class="fr-input" placeholder="Nom de famille" data-testid="actor-lastname-input">
    </div>

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="actor-cancel-btn" @click="$emit('cancel')" />
      <DsfrButton type="submit" :disabled="isSubmitting" :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'" data-testid="actor-submit-btn">
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm" data-testid="actor-submit-loading">
            <span class="fr-loading__icon" aria-hidden="true" />
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
