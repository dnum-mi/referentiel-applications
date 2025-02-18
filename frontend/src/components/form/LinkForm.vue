<script setup lang="ts">
import { ref } from "vue";
import type { Link } from "@/core/application/dto/ApplicationDTO";
import type { ExternalRessource } from "@/models/Application";
import useToaster from "@/composables/use-toaster";
import { defineProps, defineEmits } from "vue";
import Applications from "@/api/application";

const toaster = useToaster();

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
    type: Object as PropType<Link>,
    required: false,
  },
  isSubmitting: {
    type: Boolean,
    required: false,
  },
});

const emit = defineEmits(["update:application"]);

const localLinks = ref<ExternalRessource[]>(
  Array.isArray(props.application?.externalRessource) ? [...props.application.externalRessource] : [],
);
const selectedLink = ref<ExternalRessource | null>(null); // pour gérer l'élément sélectionné pour l'édition
const showModal = ref(false); // pour contrôler l'affichage du modal
const isLinkModalOpen = ref(false);
const loading = ref(false);

const linkTypesDict = {
  documentation: "Documentation",
  supervision: "Supervision",
  service: "Service",
};

const linkTypes = computed(() => [
  { value: "", text: "choisir un type de lien" },
  ...Object.entries(linkTypesDict).map(([key, label]) => ({
    value: key,
    text: label,
  })),
]);

const form = ref({
  id: props.initialData?.id ?? "",
  type: props.initialData?.type ?? "",
  link: props.initialData?.link ?? "",
  description: props.initialData?.description ?? "",
});

const handleSubmit = () => {
  saveAll();
};

function formatLink(url: string): string {
  return url.startsWith("http") ? url : "http://" + url;
}

function getTypeLabel(value: string): string {
  return value ? linkTypesDict[value] || "Type inconnu" : "Aucun type sélectionné";
}

async function saveAll() {
  for (const link of localLinks.value) {
    if (!link.link.trim()) {
      toaster.addErrorMessage("Le lien est requis pour tous les liens.");
      return;
    }
  }
  console.log(localLinks);
  if (form.value) {
    const index = localLinks.value.findIndex((link) => link.id === form.value?.id);
    if (index !== -1) {
      localLinks.value[index] = { ...localLinks.value[index], ...form.value }; // Correction
    } else {
      localLinks.value.push({ ...form.value }); // Ajout si inexistant
    }
  }

  const existingIds = new Set((props.application.externalRessource || []).map((l: ExternalRessource) => l.id));
  const linksToSave = localLinks.value.map((link) => (existingIds.has(link.id) ? link : { ...link, id: undefined }));

  loading.value = true;
  try {
    const updatedApplication = await Applications.patchApplication({
      ...props.application,
      externalRessource: linksToSave,
    });
    emit("update:application", updatedApplication);
    toaster.addSuccessMessage("Lien sauvegardé avec succès !");
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la sauvegarde des liens.");
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <form @submit.prevent="handleSubmit">
    <div class="fr-input-group">
      <label class="fr-label" for="type">Type de lien</label>
      <DsfrSelect v-model="form.type" :options="linkTypes" />
    </div>

    <div class="fr-input-group fr-mt-3w">
      <label class="fr-label" for="url">URL</label>
      <input type="url" id="url" v-model="form.link" class="fr-input" required placeholder="https://" />
    </div>

    <DsfrInputGroup class="fr-mt-3w" label="Description" v-model="form.description" required>
      <DsfrInput v-model="form.description" is-textarea required />
    </DsfrInputGroup>

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
