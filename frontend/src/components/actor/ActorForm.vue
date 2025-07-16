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

const actorTypeOptions = props.actorTypes.map((type) => ({
  text: type.label,
  value: type.id,
}));

const handleSubmit = () => {
  emit("submit", form.value);
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="fr-input-group fr-mt-3w">
      <DsfrSelect v-model="form.actorTypeId" label="Type d'acteur" required :options="actorTypeOptions" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <OrganizationFilter
        v-model="form.organizationId"
        label="Organisation"
        @select="form.organizationId = $event?.id"
        :preselected="actorOrganization"
      />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="email">Email</label>
      <input type="email" id="email" v-model="form.email" class="fr-input" placeholder="exemple@domaine.com" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="firstname">Prénom (Optionnel)</label>
      <input type="text" id="firstname" v-model="form.firstname" class="fr-input" placeholder="Prénom" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="lastname">Nom (Optionnel)</label>
      <input type="text" id="lastname" v-model="form.lastname" class="fr-input" placeholder="Nom de famille" />
    </div>

    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" @click="$emit('cancel')" />
      <DsfrButton type="submit" :disabled="isSubmitting" :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'">
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm">
            <span class="fr-loading__icon" aria-hidden="true"></span>
          </span>
        </template>
      </DsfrButton>
    </div>
  </form>
</template>
