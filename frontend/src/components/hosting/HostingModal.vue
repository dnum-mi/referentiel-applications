<template>
  <DsfrModal :opened="true" :title="props.initialHosting ? 'Modifier un hébergement' : 'Créer un hébergement'" @close="$emit('close')">
    <div v-if="isLoadingOptions" class="fr-text--center fr-mb-2w">
      <span class="fr-loading fr-loading--sm">
        <span class="fr-loading__icon" aria-hidden="true"></span>
      </span>
      Chargement des options...
    </div>

    <div v-else class="fr-form-group">
      <DsfrInput label-visible label="Label" v-model="hostingForm.label" class="fr-mb-3w" />

      <!-- HostingOption selection -->
      <DsfrSelect
        v-model="hostingForm.hostingOptionId"
        label="Option d'hébergement"
        :options="hostingOptionsFormatted"
        class="fr-mb-3w"
        required
      />
    </div>
    <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton secondary label="Annuler" @click="$emit('close')" />
      <DsfrButton
        type="button"
        :disabled="isSubmitting || isLoadingOptions"
        :label="props.initialHosting ? 'Modifier' : 'Créer'"
        @click="handleSubmit"
      >
        <template v-if="isSubmitting">
          <span class="fr-loading fr-loading--sm">
            <span class="fr-loading__icon" aria-hidden="true"></span>
          </span>
        </template>
      </DsfrButton>
    </div>
  </DsfrModal>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, watch, onMounted, computed } from "vue";
import type { Hosting, HostingOption } from "@/models/Hosting";
import { useHostingStore } from "@/stores/hostingStore";
import useToaster from "@/composables/use-toaster";
import HostingOptions from "@/api/hosting-options";

const props = defineProps<{
  applicationId: string;
  initialHosting?: Hosting;
}>();

const emit = defineEmits(["close", "hosting-created", "hosting-updated"]);

// Form fields
const hostingForm = ref({
  hostingOptionId: "",
  label: "",
});

const hostingOptionsList = ref<HostingOption[]>([]);
const isLoadingOptions = ref(false);

const isSubmitting = ref(false);
const hostingStore = useHostingStore();
const toaster = useToaster();

const hostingOptionsFormatted = computed(() => {
  return [
    { value: "", text: "Sélectionner une option d'hébergement" },
    ...hostingOptionsList.value.map((option) => ({
      value: option.id,
      text: `${option.provider} - ${option.platform} - ${option.site}${option.building ? ` - ${option.building}` : ""}`,
    })),
  ];
});

const fetchHostingOptions = async () => {
  try {
    isLoadingOptions.value = true;
    hostingOptionsList.value = await HostingOptions.getAll();
  } catch (error) {
    console.error("Error fetching hosting options:", error);
    toaster.addErrorMessage("Erreur lors du chargement des options d'hébergement.");
  } finally {
    isLoadingOptions.value = false;
  }
};

onMounted(() => {
  fetchHostingOptions();
});

// Handle initial hosting data if provided for editing
watch(
  () => props.initialHosting,
  (newVal) => {
    if (newVal) {
      hostingForm.value = {
        hostingOptionId: newVal.hostingOptionId || "",
        label: newVal.label || "",
      };
    } else {
      // Reset for new hosting
      hostingForm.value = {
        hostingOptionId: "",
        label: "",
      };
    }
  },
  { immediate: true },
);

const handleSubmit = async () => {
  isSubmitting.value = true;
  try {
    const formData: Partial<Hosting> = {
      label: hostingForm.value.label,
      region: props.initialHosting?.region || "Default",
      nature: props.initialHosting?.nature || "NON_DEFINIE",
    };

    // Only include hostingOptionId if it's not empty
    if (hostingForm.value.hostingOptionId) {
      formData.hostingOptionId = hostingForm.value.hostingOptionId;
    }

    if (props.initialHosting) {
      const updatedHosting = await hostingStore.updateHosting(props.applicationId, {
        ...formData,
        id: props.initialHosting.id,
        applicationId: props.applicationId,
      } as Hosting);
      emit("hosting-updated", updatedHosting);
    } else {
      const newHosting = await hostingStore.createHosting(props.applicationId, {
        ...formData,
        applicationId: props.applicationId,
      } as Hosting);
      emit("hosting-created", newHosting);
    }
    emit("close");
  } catch (err) {
    console.error(err);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
