<script setup lang="ts">
import { ref } from "vue";
import { defineProps, defineEmits } from "vue";
import type { Actor } from "@/models/Application";

const props = defineProps({
  application: {
    type: Object,
    required: true,
  },
  title: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "",
  },
  initialData: {
    type: Object as PropType<Actor>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
});

const form = ref({
  id: props.initialData?.id ?? "",
  role: props.initialData?.role ?? "",
  actorType: props.initialData?.actorType ?? "",
  email: props.initialData?.email ?? "",
  userId: props.initialData?.userId ?? "",
  organizationId: props.initialData?.organizationId ?? "",
  applicationId: props.initialData?.applicationId ?? "",
});

const actorTypes = computed(() => [
  { value: "", text: "Choisir un type d'acteur" },
  ...Object.entries(actorTypeMapping).map(([key, label]) => ({
    value: key,
    text: label,
  })),
]);

const actorTypeMapping: Record<string, string> = {
  Responsable: "Responsable",
  Exploitation: "Exploitation",
  ResponsableAutre: "Autre responsable",
  Hebergement: "Hébergement",
  ArchitecteApplicatif: "Architecte Applicatif",
  ArchitecteInfra: "Architecte Infra",
  RepresentantSSI: "Représentant SSI",
  Autre: "Autre",
};
const emit = defineEmits(["update:application", "submit"]);

const handleSubmit = () => {
  emit("submit", form.value);
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div class="fr-input-group">
      <label class="fr-label" for="role">Rôle</label>
      <input type="text" id="role" v-model="form.role" class="fr-input" required placeholder="Exemple : Responsable" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="actorType">Type d'acteur</label>
      <DsfrSelect v-model="form.actorType" :options="actorTypes" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="email">Email</label>
      <input type="email" id="email" v-model="form.email" class="fr-input" required placeholder="exemple@domaine.com" />
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
