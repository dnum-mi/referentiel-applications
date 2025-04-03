<script setup lang="ts">
import { defineEmits, computed, ref, PropType, reactive, onBeforeMount } from "vue";
import type { Actor } from "@/models/Application";
import { actorTypeMapping } from "@/composables/use-dictionary";
import { Organization } from "@/models/organization";
import SuggestionsInput from "../SuggestionsInput.vue";

const props = defineProps({
  initialData: {
    type: Object as PropType<Actor>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
  organizations: {
    type: Object as PropType<Organization>,
    required: false,
  },
});

const form = ref({
  id: props.initialData?.id ?? "",
  role: props.initialData?.role ?? "",
  type: props.initialData?.type ?? "",
  email: props.initialData?.email ?? "",
  firstname: props.initialData?.firstname ?? "",
  lastname: props.initialData?.lastname ?? "",
  userId: props.initialData?.userId ?? "",
  organizationId: props.initialData?.organizationId ?? "",
  applicationId: props.initialData?.applicationId ?? "",
});

let organizationsList = reactive([]);

const actorTypes = computed(() => [
  { value: "", text: "Choisir un type d'acteur" },
  ...Object.entries(actorTypeMapping).map(([key, label]) => ({
    value: key,
    text: label,
  })),
]);

const emit = defineEmits(["update:application", "submit", "cancel"]);

function loadOrganizations() {
  const org = props.organizations.flat();

  organizationsList = org.map((organization: Organization) => ({
    id: organization.id,
    label: organization.label,
  }));
}

const handleSubmit = () => {
  emit("submit", form.value);
};

onBeforeMount(() => {
  loadOrganizations();
});
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="actorType">Type d'acteur</label>
      <DsfrSelect v-model="form.type" :options="actorTypes" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <SuggestionsInput :searchData="organizationsList" v-model:returnData="form.organizationId" label="Organisation" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="email">Email</label>
      <input type="email" id="email" v-model="form.email" class="fr-input" required placeholder="exemple@domaine.com" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="firstname">Prénom (Optionel)</label>
      <input type="text" id="firstname" v-model="form.firstname" class="fr-input" placeholder="Prénom" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="lastname">Nom (Optionel)</label>
      <input type="text" id="lastname" v-model="form.lastname" class="fr-input" placeholder="Nom de Famille" />
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
