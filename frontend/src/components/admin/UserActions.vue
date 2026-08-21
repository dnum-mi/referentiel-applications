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
const canEditUser = computed(
  () => userStore.hasPermissions([Permission.ADMIN_PANEL_MANAGE]) && userStore.isWithinScope(props.user.organization?.path),
);

// On peut impersonner tout utilisateur humain, sauf soi-même — et pour un
// admin scopé, seulement dans son périmètre (même règle que canEditUser, #2217).
const canImpersonate = computed(
  () => props.user.type !== "bot" && props.user.id !== userStore.user?.id && userStore.isWithinScope(props.user.organization?.path),
);
const isImpersonating = ref(false);

// On ne peut pas bloquer son propre accès (cf. UserService.block côté back).
const canToggleBlock = computed(() => canEditUser.value && props.user.id !== userStore.user?.id);
const isBlockModalOpen = ref(false);
const isTogglingBlock = ref(false);

function openBlockModal() {
  if (!canToggleBlock.value) return;
  isBlockModalOpen.value = true;
}

function closeBlockModal() {
  isBlockModalOpen.value = false;
}

async function toggleBlock() {
  isTogglingBlock.value = true;
  try {
    const response = props.user.isBlocked
      ? await api.userControllerUnblock({ path: { id: props.user.id } })
      : await api.userControllerBlock({ path: { id: props.user.id } });

    if (!response.error && response.data) {
      toaster.addSuccessMessage(props.user.isBlocked ? "Accès de l'utilisateur rétabli" : "Accès de l'utilisateur bloqué");
      closeBlockModal();
      emit("userUpdated", response.data);
    } else {
      const errorMessage = (response.error as { message: string })?.message ?? "Une erreur est survenue";
      toaster.addErrorMessage(errorMessage);
      console.error(response.error);
    }
  } catch (err) {
    toaster.addErrorMessage("Une erreur est survenue");
    console.error(err);
  } finally {
    isTogglingBlock.value = false;
  }
}

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
  if (!canEditUser.value) return;

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
        :disabled="!canEditUser"
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
      <DsfrButton
        v-if="canToggleBlock"
        :label="user.isBlocked ? 'Débloquer' : 'Bloquer'"
        size="sm"
        :secondary="user.isBlocked"
        :danger="!user.isBlocked"
        data-testid="admin-user-block-btn"
        :title="user.isBlocked ? `Rétablir l'accès de cet utilisateur` : `Bloquer l'accès de cet utilisateur`"
        :aria-label="user.isBlocked ? `Rétablir l'accès de cet utilisateur` : `Bloquer l'accès de cet utilisateur`"
        @click="openBlockModal"
      />
    </div>

    <DsfrModal
      :opened="isBlockModalOpen"
      :title="user.isBlocked ? `Rétablir l'accès de l'utilisateur` : `Bloquer l'accès de l'utilisateur`"
      data-testid="admin-block-user-modal"
      @close="closeBlockModal"
    >
      <DsfrAlert
        v-if="!user.isBlocked"
        title="Cette action empêchera toute connexion"
        :description="`Êtes-vous sûr de vouloir bloquer l'accès de ${user.email} ? Cet utilisateur ne pourra plus se connecter tant que son accès n'aura pas été rétabli.`"
        type="warning"
        small
        class="fr-mb-3w alert-multiline"
        data-testid="user-block-alert"
      />
      <p v-else class="alert-multiline" data-testid="user-unblock-confirm-text">
        Rétablir l'accès de <strong>{{ user.email }}</strong> ?
      </p>

      <template #footer>
        <DsfrButtonGroup :inline-layout-when="true" :reverse="true">
          <DsfrButton
            label="Annuler"
            secondary
            data-testid="admin-block-user-cancel-btn"
            title="Annuler"
            aria-label="Annuler"
            @click="closeBlockModal"
          />
          <DsfrButton
            :label="user.isBlocked ? 'Rétablir' : 'Bloquer'"
            :danger="!user.isBlocked"
            :disabled="isTogglingBlock"
            data-testid="admin-block-user-confirm-btn"
            title="Confirmer"
            aria-label="Confirmer"
            @click="toggleBlock"
          />
        </DsfrButtonGroup>
      </template>
    </DsfrModal>

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

<style scoped>
.alert-multiline {
  white-space: normal;
  overflow-wrap: break-word;
}
</style>
