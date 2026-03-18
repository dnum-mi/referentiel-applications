<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useHostingStore } from "@/stores/hostingStore";
import { useToasterStore } from "@/stores/toasterStore";
import type { CreateHostingDto, HostingDto, HostingOptionDto } from "@/client/types.gen";

const props = defineProps<{
  applicationId: string;
  initialHosting?: HostingDto;
  errorMessage: string;
}>();

const emit = defineEmits(["close", "hostingCreated", "hostingUpdated"]);

const hostingForm = ref<Required<Omit<CreateHostingDto, "applicationId">>>({
  hostingOptionId: "",
  label: "",
  isActive: null,
});

const hostingOptionsList = ref<HostingOptionDto[]>([]);
const isLoadingOptions = ref(false);
const hostingOptionSearch = ref("");
const isSubmitting = ref(false);
const hostingStore = useHostingStore();
const toaster = useToasterStore();

function formatOptionText(option: HostingOptionDto): string {
  return [option.provider, option.platform, option.site, option.building || "", option.room || ""].filter(Boolean).join(" - ");
}

const isFormValid = computed(() => {
  const exactMatch = hostingOptionsList.value.some((option) => formatOptionText(option) === hostingOptionSearch.value);

  return !!hostingForm.value.hostingOptionId && exactMatch;
});

watch(hostingOptionSearch, (newValue) => {
  const matchedOption = hostingOptionsList.value.find((option) => formatOptionText(option) === newValue);

  hostingForm.value.hostingOptionId = matchedOption?.id || "";
});

async function fetchHostingOptions() {
  try {
    isLoadingOptions.value = true;
    hostingOptionsList.value = await hostingStore.getAllHostingOptions();
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
    hostingForm.value = { hostingOptionId: "", label: "", isActive: null };
    hostingOptionSearch.value = "";
    return;
  }

  hostingForm.value = {
    hostingOptionId: props.initialHosting.hostingOptionId || "",
    label: props.initialHosting.label || "",
    isActive: props.initialHosting.isActive,
  };

  if (props.initialHosting.hostingOptionId && hostingOptionsList.value.length > 0) {
    const selectedOption = hostingOptionsList.value.find((option) => option.id === props.initialHosting?.hostingOptionId);
    if (selectedOption) {
      hostingOptionSearch.value = formatOptionText(selectedOption);
    }
  }
}

watch(() => props.initialHosting, setInitialValues, { immediate: true });
watch(hostingOptionsList, setInitialValues, { immediate: true });

async function handleSubmit() {
  console.log("Submitting hosting form", hostingForm.value);
  isSubmitting.value = true;
  try {
    const formData = {
      label: hostingForm.value.label,
      hostingOptionId: hostingForm.value.hostingOptionId,
      applicationId: props.applicationId,
      isActive: hostingForm.value.isActive,
    };

    if (props.initialHosting) {
      await hostingStore.updateHosting(props.applicationId, props.initialHosting.id, formData);
      emit("hostingUpdated");
    } else {
      await hostingStore.createHosting(props.applicationId, formData);
      emit("hostingCreated");
    }
    emit("close");
  } catch (err) {
    console.error("Error submitting hosting form:", err);
    toaster.addErrorMessage("Une erreur est survenue lors de l'enregistrement de l'hébergement");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <DsfrModal
    :opened="true"
    :title="props.initialHosting ? 'Modifier un hébergement' : 'Créer un hébergement'"
    data-testid="hosting-modal"
    @close="$emit('close')"
  >
    <DsfrAlert
      v-show="props.initialHosting && props.errorMessage.length > 0"
      class="mb-4"
      tabindex="-1"
      type="error"
      role="alert"
      aria-live="assertive"
      title="Une erreur est survenue"
      :description="props.errorMessage"
    />
    <form data-testid="hosting-form" @submit.prevent="handleSubmit">
      <div v-if="isLoadingOptions" class="fr-text--center fr-mb-2w" data-testid="hosting-options-loading">
        <span class="fr-loading fr-loading--sm" data-testid="hosting-options-spinner">
          <span class="fr-loading__icon" aria-hidden="true" />
        </span>
        Chargement des options...
      </div>
      <div v-else class="fr-form-group">
        <DsfrInput v-model="hostingForm.label" label-visible label="Label" class="fr-mb-3w" data-testid="hosting-label-input" />
        <DsfrInput
          v-model="hostingOptionSearch"
          label-visible
          label="Option d'hébergement"
          hint="Commencez à taper pour rechercher"
          list="hostingOptionsList"
          required
          class="fr-mb-3w"
          data-testid="hosting-option-search-input"
        />
        <datalist id="hostingOptionsList" data-testid="hosting-options-list">
          <option v-for="option in hostingOptionsList" :key="option.id" :data-testid="`hosting-option-${option.id}`">
            {{ formatOptionText(option) }}
          </option>
        </datalist>
        <DsfrSelect
          :model-value="hostingForm.isActive === null ? 'null' : String(hostingForm.isActive)"
          @update:model-value="hostingForm.isActive = $event === 'null' ? null : $event === 'true'"
          label="Statut de l'hébergement"
          data-testid="hosting-is-active-toggle"
          :options="[
            { value: 'null', text: 'Non renseigné' },
            { value: 'true', text: 'Actif' },
            { value: 'false', text: 'Passif' },
          ]"
        />
      </div>
      <div class="fr-btns-group fr-btns-group--right fr-mt-4w">
        <DsfrButton type="button" secondary label="Annuler" data-testid="hosting-cancel-btn" @click="$emit('close')" />
        <DsfrButton
          type="submit"
          :disabled="isSubmitting || isLoadingOptions || !isFormValid"
          :label="props.initialHosting ? 'Modifier' : 'Créer'"
          data-testid="hosting-submit-btn"
        >
          <template v-if="isSubmitting">
            <span class="fr-loading fr-loading--sm" data-testid="hosting-submit-loading">
              <span class="fr-loading__icon" aria-hidden="true" />
            </span>
          </template>
        </DsfrButton>
      </div>
    </form>
  </DsfrModal>
</template>
