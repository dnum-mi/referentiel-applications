<script setup lang="ts">
import { ref } from "vue";
import type { PropType } from "vue";
import type { Actor, Application } from "@/models/Application";
import type { Organization } from "@/models/organization";
import type { ActorType } from "@/models/ActorType";
import { useActorStore } from "@/stores/actorStore";
import SuggestionsInput from "../SuggestionsInput.vue";

const props = defineProps({
  initialData: Object as PropType<Actor>,
  isSubmitting: Boolean,
  application: {
    type: Object as PropType<Application>,
    required: true,
  },
  organizations: {
    type: Array as PropType<Organization[]>,
    required: true,
  },
  actorTypes: {
    type: Array as PropType<ActorType[]>,
    required: true,
  },
});

const emit = defineEmits(["submit", "cancel"]);

const store = useActorStore();

const form = ref<Actor>({
  id: props.initialData?.id ?? "",
  role: props.initialData?.role ?? "",
  email: props.initialData?.email ?? "",
  firstname: props.initialData?.firstname ?? "",
  lastname: props.initialData?.lastname ?? "",
  userId: props.initialData?.userId ?? "",
  organizationId: props.initialData?.organizationId ?? "",
  actorTypeId: props.initialData?.actorTypeId ?? "",
  applicationId: props.application.id,
});

const handleSubmit = () => {
  const isNew = !form.value.id;
  store.saveActor(form.value, isNew).then((savedActor) => {
    emit("submit", savedActor);
  });
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="fr-input-group fr-mt-3w">
      <label for="actorTypeId" class="fr-label">Type d'acteur</label>
      <select id="actorTypeId" v-model="form.actorTypeId" class="fr-select" required>
        <option value="" disabled>Sélectionner un type</option>
        <option v-for="type in props.actorTypes" :key="type.id" :value="type.id">
          {{ type.label }}
        </option>
      </select>
    </div>

    <div class="fr-input-group fr-mt-3w">
      <SuggestionsInput :searchData="props.organizations" v-model:returnData="form.organizationId" label="Organisation" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="email">Email</label>
      <input type="email" id="email" v-model="form.email" class="fr-input" required placeholder="exemple@domaine.com" />
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
      <DsfrButton secondary label="Annuler" @click="$emit('cancel')" />
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
