import { computed, onMounted, ref } from "vue";
import type { CreateActorDto } from "@/client/types.gen";
import type { ApplicationFormInitialData } from "@/models/Application";
import { useActorTypeStore } from "@/stores/actorTypeStore";
import type { ApplicationFormMode, ApplicationFormState } from "./application-form.types";

export function useApplicationFormState(initialData: ApplicationFormInitialData, getMode: () => ApplicationFormMode) {
  const status = initialData.status;
  const form = ref<ApplicationFormState>({
    label: initialData.label ?? "",
    shortName: initialData.shortName ?? "",
    description: initialData.description ?? "",
    logo: initialData.logo ?? "",
    status: typeof status === "string" ? { status } : { ...(status ?? { status: "to_validate" }) },
    purposes: [...(initialData.purposes ?? [])],
    targetPopulations: [...(initialData.targetPopulations ?? [])],
    priorityRestart: initialData.priorityRestart ?? undefined,
    type: initialData.type,
    tags: [...(initialData.tags ?? [])],
    businessDivisionIds: initialData.businessDivisions?.map((division) => division.id) ?? [],
  });
  const createContact = (): CreateActorDto => ({ actorTypeId: "", isGroup: false, email: "", firstname: "", lastname: "" });
  const moa = ref(createContact());
  const moe = ref(createContact());
  const actorTypeStore = useActorTypeStore();

  onMounted(async () => {
    if (getMode() !== "create") return;
    if (actorTypeStore.actorTypes.length === 0) await actorTypeStore.fetchAll();
    moa.value.actorTypeId = actorTypeStore.actorTypes.find((type) => type.code === "MOA")?.id ?? "";
    moe.value.actorTypeId = actorTypeStore.actorTypes.find((type) => type.code === "MOE")?.id ?? "";
  });

  const snapshot = () =>
    JSON.stringify({
      application: form.value,
      contacts:
        getMode() === "create"
          ? [moa.value, moe.value].map((contact) => ({
              isGroup: contact.isGroup,
              email: contact.email,
              firstname: contact.firstname,
              lastname: contact.lastname,
              organizationId: contact.organizationId || undefined,
            }))
          : [],
    });
  const initialSnapshot = ref(snapshot());
  const isFormDirty = computed(() => snapshot() !== initialSnapshot.value);
  const markSaved = () => {
    initialSnapshot.value = snapshot();
  };

  const getData = () => ({ application: form.value, moa: moa.value, moe: moe.value });
  return { form, moa, moe, isFormDirty, markSaved, getData };
}
