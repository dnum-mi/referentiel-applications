import { useMaiaRequest } from "@/composables/use-maia-request";
import { isApiSuccess } from "@/api/api-result";
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
  isFormVisible: () => boolean = () => false,
) {
  const toaster = useToasterStore();
  const applicationStore = useApplicationStore();
  const organizationStore = useOrganizationStore();
  const isSubmitting = ref(false);
  const saveError = ref("");
  const moaRequest = useMaiaRequest([() => getData().moa, () => getData().moa.email, getId]);
  const moeRequest = useMaiaRequest([() => getData().moe, () => getData().moe.email, getId]);
  const moaSyncing = moaRequest.isSyncing;
  const moeSyncing = moeRequest.isSyncing;
  const initialMoaOrganization = ref<OrganizationDto | null>(null);
  const initialMoeOrganization = ref<OrganizationDto | null>(null);

  function reportSaveError(message: string) {
    saveError.value = message;
    if (!isFormVisible()) toaster.addErrorMessage(message);
  }

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
    if (!isApiSuccess(response)) throw response.error;
  }

  async function save(): Promise<ApplicationDto | undefined> {
    if (isSubmitting.value || moaSyncing.value || moeSyncing.value) return;
    saveError.value = "";
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
        if (!isApiSuccess(response) || !response.data) throw response.error;
        const created = response.data;
        try {
          await createActor(created.id, moa);
          await createActor(created.id, moe);
        } catch {
          reportSaveError("Application créée mais erreur lors de l'ajout des acteurs MOA/MOE. Vous pouvez les ajouter manuellement.");
          return;
        }
        toaster.addSuccessMessage("Application créée avec succès !");
        return created;
      } catch (error) {
        reportSaveError(backendErrorMessage(error) ?? "Une erreur est survenue");
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
    const request = (role === "moa" ? moaRequest : moeRequest).begin();
    if (!request) return;
    try {
      const response = await api.userControllerSyncOrganizationFromMaiaByEmail({ path: { email } });
      if (!request.isCurrent()) return;
      if (!isApiSuccess(response) || !response.data) {
        toaster.addErrorMessage("Erreur lors de la synchronisation MAIA (email non trouvé)");
        return;
      }
      const { organizationId, firstName, lastName } = response.data;
      const organization = organizationId ? await organizationStore.getById(organizationId) : null;
      if (!request.isCurrent()) return;
      contact.firstname = firstName;
      contact.lastname = lastName;
      if (organizationId) {
        initialOrganization.value = organization ?? null;
        contact.organizationId = organizationId;
        toaster.addSuccessMessage(`Organisation ${role.toUpperCase()} synchronisée depuis MAIA`);
      }
    } catch {
      if (request.isCurrent()) toaster.addErrorMessage("Erreur lors de la synchronisation MAIA");
    } finally {
      request.finish();
    }
  }

  function cancelMaia() {
    moaRequest.invalidate();
    moeRequest.invalidate();
  }

  return { cancelMaia, save, isSubmitting, saveError, syncContact, moaSyncing, moeSyncing, initialMoaOrganization, initialMoeOrganization };
}
