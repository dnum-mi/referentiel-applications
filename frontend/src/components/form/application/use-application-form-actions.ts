import { ref } from "vue";
import api from "@/api";
import { withLoading } from "@/api/call-api";
import type { ApplicationDto, CreateActorDto, OrganizationDto } from "@/client/types.gen";
import { useApplicationStore } from "@/stores/applicationStore";
import { useOrganizationStore } from "@/stores/organizationStore";
import { useToasterStore } from "@/stores/toasterStore";
import { backendErrorMessage } from "@/utils/api-error";
import type { ApplicationFormData, ApplicationFormMode, ContactRole } from "./application-form.types";

export function useApplicationFormActions(
  getData: () => ApplicationFormData,
  getMode: () => ApplicationFormMode,
  getId: () => string | undefined,
) {
  const toaster = useToasterStore();
  const applicationStore = useApplicationStore();
  const organizationStore = useOrganizationStore();
  const isSubmitting = ref(false);
  const moaSyncing = ref(false);
  const moeSyncing = ref(false);
  const initialMoaOrganization = ref<OrganizationDto | null>(null);
  const initialMoeOrganization = ref<OrganizationDto | null>(null);

  async function createActor(applicationId: string, contact: CreateActorDto) {
    const response = await api.applicationActorsControllerCreate({
      path: { applicationId },
      body: {
        actorTypeId: contact.actorTypeId,
        isGroup: contact.isGroup,
        organizationId: contact.organizationId || undefined,
        email: contact.email || undefined,
        firstname: contact.isGroup ? undefined : contact.firstname || undefined,
        lastname: contact.isGroup ? undefined : contact.lastname || undefined,
        applicationId,
      },
    });
    if (!response.response.ok) throw response.error;
  }

  async function save(): Promise<ApplicationDto | undefined> {
    if (isSubmitting.value) return;
    return withLoading(isSubmitting, async () => {
      const { application, moa, moe } = getData();
      const body = {
        ...application,
        purposes: application.purposes.filter((value) => value.trim()),
        targetPopulations: application.targetPopulations.filter((value) => value.trim()),
      };
      try {
        if (getMode() === "edit") {
          const id = getId();
          if (!id) return;
          const updated = await applicationStore.patchApplication({ ...body, id });
          applicationStore.applicationsById[id] = updated;
          toaster.addSuccessMessage("Application mise à jour avec succès !");
          return updated;
        }

        const response = await api.applicationControllerCreate({ body });
        if (!response.response.ok || !response.data) throw response.error;
        const created = response.data;
        try {
          await createActor(created.id, moa);
          await createActor(created.id, moe);
        } catch {
          toaster.addErrorMessage(
            "Application créée mais erreur lors de l'ajout des acteurs MOA/MOE. Vous pouvez les ajouter manuellement.",
          );
          return;
        }
        toaster.addSuccessMessage("Application créée avec succès !");
        return created;
      } catch (error) {
        toaster.addErrorMessage(backendErrorMessage(error) ?? "Une erreur est survenue");
      }
    });
  }

  async function syncContact(role: ContactRole) {
    const contact = getData()[role];
    const isSyncing = role === "moa" ? moaSyncing : moeSyncing;
    const initialOrganization = role === "moa" ? initialMoaOrganization : initialMoeOrganization;
    const email = contact.email;
    if (isSyncing.value) return;
    if (!email) {
      toaster.addErrorMessage("L'email est requis pour synchroniser depuis MAIA");
      return;
    }
    await withLoading(isSyncing, async () => {
      try {
        const response = await api.userControllerSyncOrganizationFromMaiaByEmail({ path: { email } });
        if (!response.response.ok || !response.data) {
          toaster.addErrorMessage("Erreur lors de la synchronisation MAIA (email non trouvé)");
          return;
        }
        const { organizationId, firstName, lastName } = response.data;
        contact.firstname = firstName;
        contact.lastname = lastName;
        if (organizationId) {
          initialOrganization.value = (await organizationStore.getById(organizationId)) ?? null;
          contact.organizationId = organizationId;
          toaster.addSuccessMessage(`Organisation ${role.toUpperCase()} synchronisée depuis MAIA`);
        }
      } catch {
        toaster.addErrorMessage("Erreur lors de la synchronisation MAIA");
      }
    });
  }

  return { save, isSubmitting, syncContact, moaSyncing, moeSyncing, initialMoaOrganization, initialMoeOrganization };
}
