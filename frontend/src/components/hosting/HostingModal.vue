<script setup lang="ts">
import { ref, defineProps, defineEmits, watch, onMounted, computed } from "vue";
import type { Hosting, HostingOption } from "@/models/Hosting";
import { useHostingStore } from "@/stores/hostingStore";
import useToaster from "@/composables/use-toaster";
import HostingOptions from "@/api/hosting-options";

const props = defineProps<{
  applicationId: string
  initialHosting?: Hosting
}>();

const emit = defineEmits(["close", "hosting-created", "hosting-updated"]);

const hostingForm = ref({
  hostingOptionId: "",
  label: "",
});

const hostingOptionsList = ref<HostingOption[]>([]);
const isLoadingOptions = ref(false);
const hostingOptionSearch = ref("");
const isSubmitting = ref(false);
const hostingStore = useHostingStore();
const toaster = useToaster();

function formatOptionText(option: HostingOption): string {
  return [option.provider, option.platform, option.site, option.building || "", option.room || ""].filter(Boolean).join(" - ");
}

const isFormValid = computed(() => {
  const exactMatch = hostingOptionsList.value.some(option => formatOptionText(option) === hostingOptionSearch.value);

  return !!hostingForm.value.hostingOptionId && exactMatch;
});

watch(hostingOptionSearch, (newValue) => {
  const matchedOption = hostingOptionsList.value.find(option => formatOptionText(option) === newValue);

  hostingForm.value.hostingOptionId = matchedOption?.id || "";
});

async function fetchHostingOptions() {
  try {
    isLoadingOptions.value = true;
    hostingOptionsList.value = await HostingOptions.getAll();
  } catch (error) {
    console.error("Error fetching hosting options:", error);
    toaster.addErrorMessage("Erreur lors du chargement des options d'hébergement.");
  } finally {
    isLoadingOptions.value = false;
  }
}

onMounted(fetchHostingOptions);

function setInitialValues() {
  if (!props.initialHosting) {
    hostingForm.value = { hostingOptionId: "", label: "" };
    hostingOptionSearch.value = "";
    return;
  }

  hostingForm.value = {
    hostingOptionId: props.initialHosting.hostingOptionId || "",
    label: props.initialHosting.label || "",
  };

  if (props.initialHosting.hostingOptionId && hostingOptionsList.value.length > 0) {
    const selectedOption = hostingOptionsList.value.find(option => option.id === props.initialHosting?.hostingOptionId);
    if (selectedOption) {
      hostingOptionSearch.value = formatOptionText(selectedOption);
    }
  }
}

watch(() => props.initialHosting, setInitialValues, { immediate: true });
watch(hostingOptionsList, setInitialValues, { immediate: true });

function handleSubmit() {
  console.log("Submitting hosting form", hostingForm.value);
  isSubmitting.value = true;
  try {
    const formData = {
      label: hostingForm.value.label,
      hostingOptionId: hostingForm.value.hostingOptionId,
      applicationId: props.applicationId,
      ...(props.initialHosting ? { id: props.initialHosting.id } : {}),
    };

    let result;
    if (props.initialHosting) {
      result = hostingStore.updateHosting(props.applicationId, formData as Hosting);
      emit("hosting-updated", result);
    } else {
      result = hostingStore.createHosting(props.applicationId, formData as Hosting);
      emit("hosting-created", result);
    }
    // emit("close");
  } catch (err) {
    console.error(err);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DsfrModal :opened="true" :title="props.initialHosting ? 'Modifier un hébergement' : 'Créer un hébergement'" @close="$emit('close')">
    <form @submit.prevent="handleSubmit">
      <div v-if="isLoadingOptions" class="fr-text--center fr-mb-2w">
        <span class="fr-loading fr-loading--sm">
          <span class="fr-loading__icon" aria-hidden="true" />
        </span>
        Chargement des options...
      </div>
      <div v-else class="fr-form-group">
        <DsfrInput v-model="hostingForm.label" label-visible label="Label" class="fr-mb-3w" />
        <DsfrInput
          v-model="hostingOptionSearch"
          label-visible
          label="Option d'hébergement"
          hint="Commencez à taper pour rechercher"
          list="hostingOptionsList"
          required
          class="fr-mb-3w"
        />
        <datalist id="hostingOptionsList">
          <option v-for="option in hostingOptionsList" :key="option.id">
            {{ formatOptionText(option) }}
          </option>
        </datalist>
      </div>
      <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
        <DsfrButton type="button" secondary label="Annuler" @click="$emit('close')" />
        <DsfrButton
          type="submit"
          :disabled="isSubmitting || isLoadingOptions || !isFormValid"
          :label="props.initialHosting ? 'Modifier' : 'Créer'"
        >
          <template v-if="isSubmitting">
            <span class="fr-loading fr-loading--sm">
              <span class="fr-loading__icon" aria-hidden="true" />
            </span>
          </template>
        </DsfrButton>
      </div>
    </form>
  </DsfrModal>
</template>
