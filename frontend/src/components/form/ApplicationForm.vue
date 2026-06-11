<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToasterStore } from "@/stores/toasterStore";
import { useApplicationStore } from "@/stores/applicationStore";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import MarkdownEditor from "@/components/MarkdownEditor.vue";
import TagSearchSelect from "@/components/common/TagSearchSelect.vue";
import OrganizationSearchSelect from "@/components/common/OrganizationSearchSelect.vue";
import { statusApplicationDictionary, priorityRestartLabelsOptions, typeApplicationDictionary } from "@/constants/dictionary";
import api from "@/api/index";
import {
  type ApplicationDto,
  type ApplicationStatus,
  type CreateApplicationDto,
  type CreateApplicationStatusDto,
  type CreateActorDto,
  type ApplicationType,
  type BusinessDivisionDto,
  Permission,
} from "@/client/types.gen";
import type { ApplicationFormInitialData } from "@/models/Application";
import { useUserStore } from "@/stores/userStore";

interface Props {
  mode?: "create" | "edit";
  initialData: ApplicationFormInitialData;
}

// Champs garantis présents dans le formulaire (initialisés avec des valeurs par défaut).
type FormState = Omit<CreateApplicationDto, "purposes" | "targetPopulations" | "status"> & {
  purposes: string[];
  targetPopulations: string[];
  status: CreateApplicationStatusDto;
};

// Le statut peut arriver sous forme d'objet (création) ou de chaîne (édition).
function toStatusDto(status: CreateApplicationStatusDto | ApplicationStatus | undefined): CreateApplicationStatusDto {
  if (!status) return { status: "to_validate" as ApplicationStatus };
  return typeof status === "string" ? { status } : status;
}

const props = withDefaults(defineProps<Props>(), {
  mode: "create",
});

const emit = defineEmits<{
  success: [application: ApplicationDto];
  cancel: [];
}>();

const toaster = useToasterStore();
const applicationStore = useApplicationStore();
const actorTypeStore = useActorTypeStore();
const router = useRouter();
const isSubmitting = ref(false);
const labelError = ref<string | undefined>(undefined);
const descriptionError = ref<string | undefined>(undefined);
const moaError = ref<string | undefined>(undefined);
const moeError = ref<string | undefined>(undefined);
const moaOrganizationError = ref<string | undefined>(undefined);
const moeOrganizationError = ref<string | undefined>(undefined);
const moaEmailError = ref<string | undefined>(undefined);
const moeEmailError = ref<string | undefined>(undefined);
const moaFirstnameError = ref<string | undefined>(undefined);
const moaLastnameError = ref<string | undefined>(undefined);
const moeFirstnameError = ref<string | undefined>(undefined);
const moeLastnameError = ref<string | undefined>(undefined);
const cancelModalOpen = ref(false);

const steps = ["Informations principales", "Détails de l'application", "Contact MOA", "Contact MOE"];
const currentStep = ref(1);

const moaActor = ref<CreateActorDto>({
  actorTypeId: "",
  organizationId: undefined,
  email: "",
  firstname: "",
  lastname: "",
});

const moeActor = ref<CreateActorDto>({
  actorTypeId: "",
  organizationId: undefined,
  email: "",
  firstname: "",
  lastname: "",
});

const isCreateMode = computed(() => props.mode === "create");
const userStore = useUserStore();

const canEditBase = computed(
  () => isCreateMode.value || userStore.hasPermissions([Permission.APP_WRITE], Array.from(props.initialData?.myPerms ?? [])),
);
const canEditPriorityRestart = computed(
  () => isCreateMode.value || userStore.hasPermissions([Permission.APP_WRITE_PRIORITY], Array.from(props.initialData?.myPerms ?? [])),
);

const moaOrganizationId = computed({
  get: () => moaActor.value.organizationId ?? undefined,
  set: (value) => {
    moaActor.value.organizationId = value ?? undefined;
  },
});

const moeOrganizationId = computed({
  get: () => moeActor.value.organizationId ?? undefined,
  set: (value) => {
    moeActor.value.organizationId = value ?? undefined;
  },
});

const filterEmpty = (arr: string[] | undefined) => arr?.filter((item) => item.trim() !== "") ?? [];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailValid(email: string): boolean {
  return emailPattern.test(email.trim());
}

const statusOptions = computed(() =>
  Object.entries(statusApplicationDictionary).map(([value, text]) => ({
    value: value as ApplicationStatus,
    text,
  })),
);

const TypeOptions = computed(() =>
  Object.entries(typeApplicationDictionary).map(([value, text]) => ({
    value: value as ApplicationType,
    text,
  })),
);

const form = ref<FormState>({
  label: props.initialData?.label ?? "",
  shortName: props.initialData?.shortName ?? "",
  description: props.initialData?.description ?? "",
  logo: props.initialData?.logo ?? "",
  status: toStatusDto(props.initialData?.status),
  purposes: props.initialData?.purposes ?? [],
  targetPopulations: props.initialData?.targetPopulations ?? [],
  priorityRestart: props.initialData?.priorityRestart,
  type: props.initialData?.type,
  tags: props.initialData?.tags ?? [],
  businessDivisionId: props?.initialData?.businessDivision?.id ?? null,
});
const initialStatusValue = ref(form.value.status?.status);

const isCreateFormDirty = computed(() => {
  if (!isCreateMode.value) {
    return false;
  }

  const hasText = (value?: string) => (value ?? "").trim() !== "";
  const hasArrayValue = (values?: string[]) => values?.some((value) => value.trim() !== "") ?? false;
  const statusChanged = form.value.status?.status !== initialStatusValue.value;

  return (
    hasText(form.value.label) ||
    hasText(form.value.shortName) ||
    hasText(form.value.description) ||
    hasText(form.value.logo) ||
    hasArrayValue(form.value.purposes) ||
    hasArrayValue(form.value.targetPopulations) ||
    form.value.priorityRestart !== undefined ||
    form.value.type !== undefined ||
    (form.value.tags?.length ?? 0) > 0 ||
    form.value?.businessDivisionId ||
    statusChanged ||
    !!moaActor.value.organizationId ||
    hasText(moaActor.value.email) ||
    hasText(moaActor.value.firstname) ||
    hasText(moaActor.value.lastname) ||
    !!moeActor.value.organizationId ||
    hasText(moeActor.value.email) ||
    hasText(moeActor.value.firstname) ||
    hasText(moeActor.value.lastname)
  );
});

function validateStep1(): boolean {
  labelError.value = undefined;
  descriptionError.value = undefined;

  if (form.value.label === "") {
    labelError.value = "Le nom de l'application est obligatoire.";
    return false;
  }
  if (form.value.description === "") {
    descriptionError.value = "La description est obligatoire.";
    return false;
  }
  return true;
}

function validateStep2(): boolean {
  return true;
}

function validateStep3(): boolean {
  moaError.value = undefined;
  moaOrganizationError.value = undefined;
  moaEmailError.value = undefined;
  moaFirstnameError.value = undefined;
  moaLastnameError.value = undefined;
  const moaErrors: string[] = [];

  if (!moaActor.value.organizationId) {
    moaErrors.push("L'organisation MOA est obligatoire.");
    moaOrganizationError.value = "L'organisation MOA est obligatoire.";
  }
  if (!moaActor.value.email) {
    moaErrors.push("L'email du contact MOA est obligatoire.");
    moaEmailError.value = "L'email du contact MOA est obligatoire.";
  } else if (!isEmailValid(moaActor.value.email)) {
    moaErrors.push("L'email du contact MOA est invalide.");
    moaEmailError.value = "L'email du contact MOA est invalide.";
  }
  if (!moaActor.value.firstname) {
    moaErrors.push("Le prénom du contact MOA est obligatoire.");
    moaFirstnameError.value = "Le prénom du contact MOA est obligatoire.";
  }
  if (!moaActor.value.lastname) {
    moaErrors.push("Le nom du contact MOA est obligatoire.");
    moaLastnameError.value = "Le nom du contact MOA est obligatoire.";
  }

  if (moaErrors.length > 0) {
    moaError.value = moaErrors.join(" ");
    return false;
  }
  return true;
}

function validateStep4(): boolean {
  moeError.value = undefined;
  moeOrganizationError.value = undefined;
  moeEmailError.value = undefined;
  moeFirstnameError.value = undefined;
  moeLastnameError.value = undefined;
  const moeErrors: string[] = [];

  if (!moeActor.value.organizationId) {
    moeErrors.push("L'organisation MOE est obligatoire.");
    moeOrganizationError.value = "L'organisation MOE est obligatoire.";
  }
  if (!moeActor.value.email) {
    moeErrors.push("L'email du contact MOE est obligatoire.");
    moeEmailError.value = "L'email du contact MOE est obligatoire.";
  } else if (!isEmailValid(moeActor.value.email)) {
    moeErrors.push("L'email du contact MOE est invalide.");
    moeEmailError.value = "L'email du contact MOE est invalide.";
  }
  if (!moeActor.value.firstname) {
    moeErrors.push("Le prénom du contact MOE est obligatoire.");
    moeFirstnameError.value = "Le prénom du contact MOE est obligatoire.";
  }
  if (!moeActor.value.lastname) {
    moeErrors.push("Le nom du contact MOE est obligatoire.");
    moeLastnameError.value = "Le nom du contact MOE est obligatoire.";
  }

  if (moeErrors.length > 0) {
    moeError.value = moeErrors.join(" ");
    return false;
  }
  return true;
}

function validateCurrentStep(): boolean {
  if (!isCreateMode.value) {
    return isFormValid();
  }

  switch (currentStep.value) {
    case 1:
      return validateStep1();
    case 2:
      return validateStep2();
    case 3:
      return validateStep3();
    case 4:
      return validateStep4();
    default:
      return false;
  }
}

function nextStep() {
  if (validateCurrentStep() && currentStep.value < steps.length) {
    currentStep.value++;
  }
}

function submitCurrentStep() {
  if (validateCurrentStep()) {
    handleSubmit();
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
}

function handleCancel() {
  if (isCreateFormDirty.value) {
    cancelModalOpen.value = true;
    return;
  }

  emit("cancel");
}

function confirmCancel() {
  cancelModalOpen.value = false;
  emit("cancel");
}

function closeCancelModal() {
  cancelModalOpen.value = false;
}

function isFormValid(): boolean {
  labelError.value = undefined;
  descriptionError.value = undefined;
  moaError.value = undefined;
  moeError.value = undefined;
  moaOrganizationError.value = undefined;
  moeOrganizationError.value = undefined;
  moaEmailError.value = undefined;
  moeEmailError.value = undefined;
  moaFirstnameError.value = undefined;
  moaLastnameError.value = undefined;
  moeFirstnameError.value = undefined;
  moeLastnameError.value = undefined;
  let hasError = false;

  if (form.value.label === "") {
    labelError.value = "Le nom de l'application est obligatoire.";
    hasError = true;
  }
  if (form.value.description === "") {
    descriptionError.value = "La description est obligatoire.";
    hasError = true;
  }

  if (isCreateMode.value) {
    const moaErrors: string[] = [];
    const moeErrors: string[] = [];

    if (!moaActor.value.organizationId) {
      moaErrors.push("L'organisation MOA est obligatoire.");
      moaOrganizationError.value = "L'organisation MOA est obligatoire.";
    }
    if (!moaActor.value.email) {
      moaErrors.push("L'email du contact MOA est obligatoire.");
      moaEmailError.value = "L'email du contact MOA est obligatoire.";
    } else if (!isEmailValid(moaActor.value.email)) {
      moaErrors.push("L'email du contact MOA est invalide.");
      moaEmailError.value = "L'email du contact MOA est invalide.";
    }
    if (!moaActor.value.firstname) {
      moaErrors.push("Le prénom du contact MOA est obligatoire.");
      moaFirstnameError.value = "Le prénom du contact MOA est obligatoire.";
    }
    if (!moaActor.value.lastname) {
      moaErrors.push("Le nom du contact MOA est obligatoire.");
      moaLastnameError.value = "Le nom du contact MOA est obligatoire.";
    }
    if (!moeActor.value.organizationId) {
      moeErrors.push("L'organisation MOE est obligatoire.");
      moeOrganizationError.value = "L'organisation MOE est obligatoire.";
    }
    if (!moeActor.value.email) {
      moeErrors.push("L'email du contact MOE est obligatoire.");
      moeEmailError.value = "L'email du contact MOE est obligatoire.";
    } else if (!isEmailValid(moeActor.value.email)) {
      moeErrors.push("L'email du contact MOE est invalide.");
      moeEmailError.value = "L'email du contact MOE est invalide.";
    }
    if (!moeActor.value.firstname) {
      moeErrors.push("Le prénom du contact MOE est obligatoire.");
      moeFirstnameError.value = "Le prénom du contact MOE est obligatoire.";
    }
    if (!moeActor.value.lastname) {
      moeErrors.push("Le nom du contact MOE est obligatoire.");
      moeLastnameError.value = "Le nom du contact MOE est obligatoire.";
    }
    if (moeErrors.length > 0 || moaErrors.length > 0) {
      hasError = true;
    }

    moaError.value = moaErrors.length > 0 ? moaErrors.join(" ") : undefined;
    moeError.value = moeErrors.length > 0 ? moeErrors.join(" ") : undefined;
  }

  return !hasError;
}

async function handleSubmit() {
  if (!isFormValid()) {
    return;
  }

  isSubmitting.value = true;

  form.value.purposes = filterEmpty(form.value.purposes);
  form.value.targetPopulations = filterEmpty(form.value.targetPopulations);

  try {
    if (isCreateMode.value) {
      await handleCreate();
    } else {
      await handleUpdate();
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function handleCreate() {
  try {
    const response = await api.applicationControllerCreate({ body: form.value });

    if (!response.response.ok || !response.data) {
      throw response.error;
    }

    const application = response.data as ApplicationDto;

    try {
      await createActors(application.id);
    } catch (actorError) {
      toaster.addErrorMessage("Application créée mais erreur lors de l'ajout des acteurs MOA/MOE. Vous pouvez les ajouter manuellement.");
      throw actorError;
    }

    toaster.addSuccessMessage("Application créée avec succès !");
    emit("success", application);
    router.push({ name: "application", params: { id: application.id } });
  } catch (error: any) {
    const message = error.message?.join?.(", ") || "Une erreur est survenue";
    toaster.addErrorMessage(message);
  }
}

async function createActors(applicationId: string) {
  const moaPayload: CreateActorDto = {
    actorTypeId: moaActor.value.actorTypeId,
    organizationId: moaActor.value.organizationId || undefined,
    email: moaActor.value.email || undefined,
    firstname: moaActor.value.firstname || undefined,
    lastname: moaActor.value.lastname || undefined,
    applicationId,
  };

  await api.applicationActorsControllerCreate({
    path: { applicationId },
    body: moaPayload,
  });

  const moePayload: CreateActorDto = {
    actorTypeId: moeActor.value.actorTypeId,
    organizationId: moeActor.value.organizationId || undefined,
    email: moeActor.value.email || undefined,
    firstname: moeActor.value.firstname || undefined,
    lastname: moeActor.value.lastname || undefined,
    applicationId,
  };

  await api.applicationActorsControllerCreate({
    path: { applicationId },
    body: moePayload,
  });
}

async function handleUpdate() {
  const applicationId = props.initialData.id;
  if (!applicationId) return;
  try {
    const updatedApp = await applicationStore.patchApplication({ ...form.value, id: applicationId });
    applicationStore.applicationsById[applicationId] = updatedApp;

    toaster.addSuccessMessage("Application mise à jour avec succès !");
    emit("success", props.initialData as ApplicationDto);
  } catch (error) {
    const raw = error && typeof error === "object" && "message" in error ? (error as { message?: unknown }).message : undefined;
    const message = Array.isArray(raw) ? raw.join(", ") : typeof raw === "string" ? raw : "Une erreur est survenue";
    toaster.addErrorMessage(message);
  }
}

function addPurpose() {
  form.value.purposes.push("");
}

function removePurpose(index: number) {
  form.value.purposes.splice(index, 1);
}

function addPopulation() {
  form.value.targetPopulations.push("");
}

function removePopulation(index: number) {
  form.value.targetPopulations.splice(index, 1);
}

const updateBusinessDivision = (payload: BusinessDivisionDto | null) => {
  form.value.businessDivisionId = payload?.id;
};

onMounted(async () => {
  if (isCreateMode.value) {
    if (actorTypeStore.actorTypes.length === 0) {
      await actorTypeStore.fetchAll();
    }

    const moaType = actorTypeStore.actorTypes.find((t) => t.code === "MOA");
    const moeType = actorTypeStore.actorTypes.find((t) => t.code === "MOE");

    if (moaType) {
      moaActor.value.actorTypeId = moaType.id;
    }
    if (moeType) {
      moeActor.value.actorTypeId = moeType.id;
    }
  }
});
</script>

<template>
  <!-- Stepper for create mode -->
  <DsfrStepper v-if="isCreateMode" :steps="steps" :current-step="currentStep" class="fr-mb-4w" />

  <form data-testid="application-form" @submit.prevent="handleSubmit">
    <!-- Step 1: Informations principales de l'application -->
    <div v-if="!isCreateMode || currentStep === 1" class="fr-card fr-p-3w">
      <h3 class="fr-mb-3w">Informations principales</h3>

      <DsfrInputGroup
        v-model.trim="form.label"
        :disabled="!canEditBase"
        hint="Doit contenir au moins une lettre.
Seuls les lettres (avec accents), chiffres, espaces, points et tirets sont autorisés.
Aucun espace en début ou en fin."
        label="Nom de l'application"
        label-visible
        required
        :error-message="labelError"
        data-testid="application-label"
      />

      <DsfrInputGroup
        v-model.trim="form.shortName"
        :disabled="!canEditBase"
        class="fr-mt-3w"
        label="Nom court"
        label-visible
        hint="Optionnel - Un nom court pour identifier rapidement l'application"
        data-testid="application-shortname"
      />

      <DsfrSelect
        v-if="isCreateMode"
        v-model="form.status.status"
        :options="statusOptions"
        label="Status de l'application"
        default-unselected-text="Sélectionner un status"
        data-testid="application-status"
      />

      <BusinessDivisionSearch
        :business-division-id="initialData.businessDivision?.id"
        @update="updateBusinessDivision"
        label="Rechercher une direction de metier"
      />

      <DsfrSelect
        v-model="form.type"
        :options="TypeOptions"
        :disabled="!canEditBase"
        label="Type d'application"
        default-unselected-text="Sélectionner un type"
        data-testid="application-type"
      />

      <DsfrInputGroup class="fr-mt-3w" label="Description" label-visible required :error-message="descriptionError">
        <MarkdownEditor
          v-model.trim="form.description"
          :disabled="!canEditBase"
          aria-label="Description"
          data-testid="application-description"
        />
      </DsfrInputGroup>

      <DsfrInputGroup
        v-if="!isCreateMode"
        v-model.trim="form.logo"
        :disabled="!canEditBase"
        class="fr-mt-3w"
        label="URL du logo"
        label-visible
        hint="Optionnel - URL d'une image représentant l'application"
        data-testid="application-logo"
      />
    </div>

    <!-- Step 2: Détails de l'application -->
    <div v-if="!isCreateMode || currentStep === 2" class="fr-card fr-mt-3w fr-p-3w">
      <h3 class="fr-mb-3w">Détails de l'application</h3>

      <DsfrSelect
        v-model="form.priorityRestart"
        :disabled="!canEditPriorityRestart"
        :options="priorityRestartLabelsOptions"
        label="Priorité de redémarrage"
        default-unselected-text="Sélectionner une priorité"
        data-testid="application-priority-restart"
      />

      <div class="fr-form-group fr-mt-3w">
        <legend class="fr-label">Populations</legend>
        <p class="fr-hint-text">Indiquez ici le public cible concerné (ex. : RH, agents publics, entreprises...)</p>
        <div class="fr-mt-2w">
          <div v-for="(_targetPopulation, index) in form.targetPopulations" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
            <div class="fr-col">
              <DsfrInput
                v-model.trim="form.targetPopulations[index]"
                :disabled="!canEditBase"
                :data-testid="`application-population-${index}`"
              />
            </div>
            <div class="fr-col-auto">
              <DsfrButton
                type="button"
                tertiary
                size="sm"
                icon="delete-line"
                label="Supprimer"
                title="Supprimer cette population"
                aria-label="Supprimer cette population"
                :disabled="!canEditBase"
                :data-testid="`application-population-remove-${index}`"
                @click="removePopulation(index)"
              />
            </div>
          </div>
          <DsfrButton
            type="button"
            secondary
            icon="add-line"
            label="Ajouter une population"
            title="Ajouter une nouvelle population"
            aria-label="Ajouter une population"
            :disabled="!canEditBase"
            data-testid="application-population-add"
            @click="addPopulation"
          />
        </div>
      </div>

      <div class="fr-form-group fr-mt-3w">
        <legend class="fr-label">Objectifs</legend>
        <div class="fr-mt-2w">
          <div v-for="(_purpose, index) in form.purposes" :key="index" class="fr-grid-row fr-grid-row--gutters fr-mb-2w">
            <div class="fr-col">
              <DsfrInput
                v-model.trim="form.purposes[index]"
                :disabled="!canEditBase"
                :placeholder="`Objectif ${index + 1}`"
                :data-testid="`application-purpose-${index}`"
              />
            </div>
            <div class="fr-col-auto">
              <DsfrButton
                type="button"
                tertiary
                size="sm"
                icon="delete-line"
                label="Supprimer"
                title="Supprimer cet objectif"
                aria-label="Supprimer cet objectif"
                :disabled="!canEditBase"
                :data-testid="`application-purpose-remove-${index}`"
                @click="removePurpose(index)"
              />
            </div>
          </div>
          <DsfrButton
            type="button"
            secondary
            icon="add-line"
            label="Ajouter un objectif"
            title="Ajouter un nouvel objectif"
            aria-label="Ajouter un objectif"
            :disabled="!canEditBase"
            data-testid="application-purpose-add"
            @click="addPurpose"
          />
        </div>
      </div>

      <div class="fr-form-group fr-mt-3w autocomplete-tags">
        <legend class="fr-label">Tags</legend>
        <div class="fr-mt-2w fr-col">
          <TagSearchSelect v-model:tags="form.tags" />
        </div>
      </div>
    </div>

    <!-- Step 3: MOA Section -->
    <div v-if="isCreateMode && currentStep === 3" class="fr-card fr-mt-3w fr-p-3w">
      <h3 class="fr-mb-3w">MOA (Maîtrise d'Ouvrage)</h3>
      <p class="fr-text--sm fr-mb-3w">
        <span class="fr-icon-information-line fr-mr-1w" aria-hidden="true" />
        Toutes les informations du contact MOA sont obligatoires.
      </p>
      <OrganizationSearchSelect
        v-model="moaOrganizationId"
        label="Organisation MOA"
        class="fr-mb-3w"
        required
        :error-message="moaOrganizationError"
        data-testid="application-moa-organization"
      />
      <DsfrInputGroup
        v-model.trim="moaActor.email"
        label="Email du contact MOA"
        label-visible
        required
        type="email"
        :error-message="moaEmailError"
        data-testid="application-moa-email"
      />
      <div class="fr-grid-row fr-grid-row--gutters">
        <div class="fr-col-6">
          <DsfrInputGroup
            v-model.trim="moaActor.firstname"
            label="Prénom du contact MOA"
            label-visible
            required
            :error-message="moaFirstnameError"
            data-testid="application-moa-firstname"
          />
        </div>
        <div class="fr-col-6">
          <DsfrInputGroup
            v-model.trim="moaActor.lastname"
            label="Nom du contact MOA"
            label-visible
            required
            :error-message="moaLastnameError"
            data-testid="application-moa-lastname"
          />
        </div>
      </div>
    </div>

    <!-- Step 4: MOE Section -->
    <div v-if="isCreateMode && currentStep === 4" class="fr-card fr-mt-3w fr-p-3w">
      <h3 class="fr-mb-3w">MOE (Maîtrise d'Œuvre)</h3>
      <p class="fr-text--sm fr-mb-3w">
        <span class="fr-icon-information-line fr-mr-1w" aria-hidden="true" />
        Toutes les informations du contact MOE sont obligatoires.
      </p>
      <OrganizationSearchSelect
        v-model="moeOrganizationId"
        label="Organisation MOE"
        required
        class="fr-mb-3w"
        :error-message="moeOrganizationError"
        data-testid="application-moe-organization"
      />
      <DsfrInputGroup
        v-model.trim="moeActor.email"
        label="Email du contact MOE"
        label-visible
        required
        type="email"
        :error-message="moeEmailError"
        data-testid="application-moe-email"
      />
      <div class="fr-grid-row fr-grid-row--gutters">
        <div class="fr-col-6">
          <DsfrInputGroup
            v-model.trim="moeActor.firstname"
            label="Prénom du contact MOE"
            label-visible
            required
            :error-message="moeFirstnameError"
            data-testid="application-moe-firstname"
          />
        </div>
        <div class="fr-col-6">
          <DsfrInputGroup
            v-model.trim="moeActor.lastname"
            label="Nom du contact MOE"
            label-visible
            required
            :error-message="moeLastnameError"
            data-testid="application-moe-lastname"
          />
        </div>
      </div>
    </div>

    <!-- Navigation buttons -->
    <div v-if="isCreateMode" class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="application-cancel-btn" @click="handleCancel" />
      <DsfrButton
        v-if="currentStep > 1"
        type="button"
        label="Précédent"
        icon="ri-arrow-left-line"
        data-testid="application-previous-btn"
        @click="previousStep"
      />
      <DsfrButton
        v-if="currentStep < steps.length"
        type="button"
        label="Suivant"
        icon="ri-arrow-right-line"
        icon-right
        data-testid="application-next-btn"
        @click="nextStep"
      />
      <DsfrButton
        v-if="currentStep === steps.length"
        type="button"
        :disabled="isSubmitting"
        :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'"
        data-testid="application-submit-btn"
        @click="submitCurrentStep"
      />
    </div>

    <!-- Edit mode buttons -->
    <div v-else class="fr-btns-group fr-btns-group--right fr-mt-4w">
      <DsfrButton type="button" secondary label="Annuler" data-testid="application-cancel-btn" @click="handleCancel" />
      <DsfrButton
        type="submit"
        :disabled="isSubmitting"
        :label="isSubmitting ? 'Enregistrement...' : 'Enregistrer'"
        data-testid="application-submit-btn"
      />
    </div>
  </form>

  <DsfrModal
    :opened="cancelModalOpen"
    title="Annuler la création de l'application"
    size="sm"
    data-testid="application-cancel-modal"
    @close="closeCancelModal"
  >
    <p>Vous avez commencé à remplir le formulaire. Voulez-vous vraiment annuler et perdre les modifications en cours ?</p>
    <div class="actions">
      <DsfrButton type="button" tertiary data-testid="application-cancel-modal-close" @click="closeCancelModal">Reprendre</DsfrButton>
      <DsfrButton type="button" primary data-testid="application-cancel-modal-confirm" @click="confirmCancel">Confirmer</DsfrButton>
    </div>
  </DsfrModal>
</template>
