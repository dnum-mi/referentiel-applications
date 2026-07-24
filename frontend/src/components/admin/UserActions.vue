<script setup lang="ts">
import api from "@/api/index";
import {
  type MaiaOrganizationSuggestionDto,
  type UpdateUserDto,
  type UserEntity,
  Permission,
  Roles as RolesType,
} from "@/client/types.gen";
import { Roles } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import { useUserStore } from "@/stores/userStore";
import { RolesOptions, RolesScopes } from "@/utils/roles-utils";
import type { DsfrCheckboxProps } from "@gouvminint/vue-dsfr";
import { useMemoize } from "@vueuse/core";
import { computed, nextTick, ref } from "vue";
import OrganizationSearchSelect from "../common/OrganizationSearchSelect.vue";

const props = defineProps<{ user: Required<UserEntity> }>();

const emit = defineEmits<{
  userUpdated: [user: UserEntity];
}>();

const toaster = useToasterStore();
const userStore = useUserStore();

// On peut impersonner tout utilisateur humain, sauf soi-même.
const canImpersonate = computed(() => props.user.type !== "bot" && props.user.id !== userStore.user?.id);
const isImpersonating = ref(false);

async function impersonate() {
  isImpersonating.value = true;
  try {
    await userStore.startImpersonation(props.user);
  } catch (err) {
    toaster.addErrorMessage("Impossible d'impersonner cet utilisateur");
    console.error(err);
    isImpersonating.value = false;
  }
}

const isEditModalOpen = ref(false);
const isSaving = ref(false);
const isSyncingFromMaia = ref(false);
// Snapshot de l'utilisateur au moment de l'ouverture : si l'instance est réutilisée par la
// table avec un AUTRE utilisateur pendant que le modal est ouvert (refetch qui réordonne),
// l'enregistrement doit viser l'utilisateur AFFICHÉ à l'ouverture, jamais `props.user`
// courant — sinon on écrirait le formulaire d'un compte sur l'id d'un autre (#1830).
const editingUser = ref<Required<UserEntity> | null>(null);
const editingUserRole = ref<RolesType>(Roles.VISITOR);
const editingOrganizationId = ref<string>("");
const editingAdditionalPermissions = ref<Permission[]>([]);
const editingScopePermissions = ref<string>("");
const maiaSuggestion = ref<MaiaOrganizationSuggestionDto | null>(null);
const isFetchingMaiaSuggestion = ref(false);

async function openEditModal() {
  editingUser.value = props.user;
  editingUserRole.value = props.user.role;
  editingOrganizationId.value = props.user.organizationId || "";
  editingAdditionalPermissions.value = props.user.additionalPermissions ? [...props.user.additionalPermissions] : [];
  editingScopePermissions.value = props.user.scopeOrganizationId || "";
  maiaSuggestion.value = null;
  isEditModalOpen.value = true;
  fetchMaiaSuggestion();
}

const fetchMaiaSuggestionCached = useMemoize(async (email: string) => {
  const response = await api.userControllerSyncOrganizationFromMaiaByEmail({ path: { email } });
  if (response.response.ok && response.data) return response.data;
  return null;
});

async function fetchMaiaSuggestion() {
  if (!props.user.email) return;
  isFetchingMaiaSuggestion.value = true;
  try {
    maiaSuggestion.value = await fetchMaiaSuggestionCached(props.user.email);
  } catch {
    // On ignore les erreurs pour la suggestion MAIA, ce n'est pas critique pour l'édition de l'utilisateur
  } finally {
    isFetchingMaiaSuggestion.value = false;
  }
}

function closeEditModal() {
  isEditModalOpen.value = false;
  editingUser.value = null;
  editingUserRole.value = Roles.VISITOR;
  editingOrganizationId.value = "";
  editingScopePermissions.value = "";
  maiaSuggestion.value = null;
}

// RGAA-088 (7.5 / 12.8) : confirmation restituée aux TA + focus rendu au bouton « Modifier ».
const editBtn = ref<{ $el?: HTMLElement } | null>(null);
const confirmationMessage = ref("");
function focusOpener() {
  nextTick(() => {
    const el = editBtn.value?.$el;
    const btn = el instanceof HTMLButtonElement ? el : (el?.querySelector?.("button") ?? null);
    btn?.focus();
  });
}

async function saveUser() {
  const target = editingUser.value;
  if (!target) return;
  isSaving.value = true;
  try {
    const response = await api.userControllerUpdate({
      path: { id: target.id },
      body: {
        role: editingUserRole.value,
        organizationId: editingOrganizationId.value === "" ? null : editingOrganizationId.value,
        additionalPermissions: editingAdditionalPermissions.value,
        scopeOrganizationId: editingScopePermissions.value === "" ? null : editingScopePermissions.value,
      } as UpdateUserDto,
    });
    if (!response.error && response.data) {
      confirmationMessage.value = "Utilisateur mis à jour avec succès";
      toaster.addSuccessMessage("Utilisateur mis à jour avec succès");
      closeEditModal();
      emit("userUpdated", response.data);
      focusOpener();
    } else {
      const errorMessage =
        (response.error as { message: string })?.message ?? "Une erreur est survenue lors de la mise à jour de l'utilisateur";
      toaster.addErrorMessage(errorMessage);
      console.error(response.error);
    }
  } catch (err) {
    toaster.addErrorMessage("Une erreur est survenue lors de la mise à jour de l'utilisateur");
    console.error(err);
  } finally {
    isSaving.value = false;
  }
}

async function syncFromMaia() {
  isSyncingFromMaia.value = true;
  try {
    const response = await api.userControllerSyncOrganizationFromMaia({ path: { id: props.user.id } });
    if (response.response.ok && response.data) {
      toaster.addSuccessMessage("Organisation synchronisée depuis MAIA");
      emit("userUpdated", response.data);
    } else {
      toaster.addErrorMessage("Erreur lors de la synchronisation MAIA");
      console.error(response.error);
    }
  } catch (error) {
    toaster.addErrorMessage("Erreur lors de la synchronisation MAIA");
    console.error(error);
  } finally {
    isSyncingFromMaia.value = false;
  }
}

const additionalPermissionsOptions: Omit<DsfrCheckboxProps, "modelValue">[] = [
  {
    label: "Créer une application",
    value: Permission.CREATE_APPLICATION,
    name: "capability-create-application",
  },
  {
    label: "Créer un signalement global",
    value: Permission.CREATE_GLOBAL_REPORT,
    name: "capability-create-global-report",
  },
  {
    label: "Export les données",
    value: Permission.DATA_EXPORT,
    name: "capability-create-data-export",
  },
  {
    label: "Voir les données MDIT",
    value: Permission.MDIT_LIST,
    name: "capability-mdit-view",
  },
];

const isNotValidated = computed(() => {
  if (!maiaSuggestion.value?.organizationId) return false;
  return editingOrganizationId.value !== maiaSuggestion.value.organizationId;
});

const labelScope = computed(() => {
  const scope = RolesScopes[editingUserRole.value];
  return scope ? `${scope}` : "Organisation du périmètre";
});
const isScopeDisabled = computed(() => {
  return editingUserRole.value === Roles.VISITOR;
});
</script>

<template>
  <div>
    <div class="fr-btns-group fr-btns-group--inline fr-btns-group--sm">
      <DsfrButton
        :label="isSyncingFromMaia ? 'MAIA...' : 'MAIA'"
        size="sm"
        tertiary
        :disabled="isSyncingFromMaia"
        data-testid="admin-user-sync-maia-btn"
        title="Synchroniser l'organisation depuis MAIA"
        aria-label="Synchroniser l'organisation depuis MAIA"
        @click="syncFromMaia"
      />
      <DsfrButton
        ref="editBtn"
        label="Modifier"
        size="sm"
        secondary
        data-testid="admin-user-edit-btn"
        title="Modifier les permissions de l'utilisateur"
        aria-label="Modifier les permissions de l'utilisateur"
        @click="openEditModal"
      />

      <div aria-live="polite" aria-atomic="true" class="fr-sr-only" data-testid="admin-user-edit-status">
        <p v-if="confirmationMessage">{{ confirmationMessage }}</p>
      </div>
      <DsfrButton
        v-if="canImpersonate"
        :label="isImpersonating ? '...' : 'Se connecter en tant que'"
        size="sm"
        tertiary
        :disabled="isImpersonating"
        data-testid="admin-user-impersonate-btn"
        title="Se connecter en tant que cet utilisateur"
        aria-label="Se connecter en tant que cet utilisateur"
        @click="impersonate"
      />
    </div>

    <DsfrModal :opened="isEditModalOpen" title="Modifier l'utilisateur" data-testid="admin-edit-user-modal" @close="closeEditModal">
      <p><strong>Utilisateur :</strong> {{ editingUser?.email ?? user.email }}</p>

      <!-- RGAA-086 (11.5) : regroupement des champs organisation de même nature. -->
      <fieldset class="fr-fieldset">
        <legend class="fr-fieldset__legend">Organisations</legend>
        <OrganizationSearchSelect
          v-model="editingOrganizationId"
          class="fr-mb-1w"
          description="Recherchez et sélectionnez une organisation pour cet utilisateur"
          :initial-organization="user.organization"
          data-testid="user-organization-search"
        />

        <div class="fr-mb-2w">
          <p v-if="isFetchingMaiaSuggestion" class="fr-text--sm fr-text-mention--grey fr-mb-0">Récupération de la suggestion MAIA…</p>
          <template v-else-if="maiaSuggestion?.organizationPath">
            <p class="fr-text--sm fr-mb-1v">
              <span class="fr-text-mention--grey">Organisation MAIA : </span>
              <strong>{{ maiaSuggestion.organizationPath }}</strong>
            </p>
            <p v-if="isNotValidated" class="fr-badge fr-badge--error fr-badge--no-icon fr-mb-0" data-testid="user-org-not-validated-badge">
              NON VALIDÉE
            </p>
            <p v-else class="fr-badge fr-badge--success fr-badge--no-icon fr-mb-0" data-testid="user-org-not-validated-badge">VALIDÉE</p>
          </template>
        </div>

        <OrganizationSearchSelect
          v-show="!isScopeDisabled"
          v-model="editingScopePermissions"
          class="fr-mb-2w"
          :label="labelScope"
          :initial-organization="user.scopeOrganization"
          data-testid="user-organization-search-scope"
        />
      </fieldset>

      <DsfrCheckboxSet
        v-model="editingAdditionalPermissions"
        legend="Capacités"
        :options="additionalPermissionsOptions"
        name="additional-permissions-checkbox"
        data-testid="additional-permissions-checkbox"
      />

      <DsfrRadioButtonSet
        v-model="editingUserRole"
        legend="Niveau de privilège"
        :options="RolesOptions"
        name="admin-level-radio"
        data-testid="admin-level-radio"
      />

      <template #footer>
        <DsfrButton
          label="Annuler"
          secondary
          data-testid="admin-cancel-btn"
          title="Annuler la modification"
          aria-label="Annuler la modification"
          @click="closeEditModal"
        />
        <DsfrButton
          label="Enregistrer"
          title="Enregistrer les modifications"
          aria-label="Enregistrer les modifications"
          :disabled="isSaving"
          data-testid="admin-save-perms-btn"
          @click="saveUser"
        />
      </template>
    </DsfrModal>
  </div>
</template>
