<script setup lang="ts">
import api from "@/api/index";
import { type UpdateUserDto, type UserEntity, Permission, Roles as RolesType } from "@/client/types.gen";
import { Roles } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import { RolesOptions } from "@/utils/roles-utils";
import type { DsfrCheckboxProps } from "@gouvminint/vue-dsfr";
import { ref } from "vue";
import OrganizationSearchSelect from "../common/OrganizationSearchSelect.vue";

const props = defineProps<{ user: Required<UserEntity> }>();

const emit = defineEmits<{
  userUpdated: [user: UserEntity];
}>();

const toaster = useToasterStore();

const isEditModalOpen = ref(false);
const isSaving = ref(false);
const editingUserRole = ref<RolesType>(Roles.VISITOR);
const editingOrganizationId = ref<string>("");
const editingAdditionalPermissions = ref<Permission[]>([]);

async function openEditModal() {
  editingUserRole.value = props.user.role;
  editingOrganizationId.value = props.user.organizationId || "";
  editingAdditionalPermissions.value = props.user.additionalPermissions ? [...props.user.additionalPermissions] : [];
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  editingUserRole.value = Roles.VISITOR;
  editingOrganizationId.value = "";
}

async function saveUser() {
  isSaving.value = true;
  try {
    const response = await api.userControllerUpdate({
      path: { id: props.user.id },
      body: {
        role: editingUserRole.value,
        organizationId: editingOrganizationId.value === "" ? null : editingOrganizationId.value,
        additionalPermissions: editingAdditionalPermissions.value,
      } as UpdateUserDto,
    });
    if (!response.error && response.data) {
      toaster.addSuccessMessage("Utilisateur mis à jour avec succès");
      closeEditModal();
      emit("userUpdated", response.data);
    } else {
      toaster.addErrorMessage("Erreur lors de la mise à jour de l'utilisateur");
      console.error(response.error);
    }
  } catch (err) {
    toaster.addErrorMessage("Erreur lors de la mise à jour de l'utilisateur");
    console.error(err);
  } finally {
    isSaving.value = false;
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
</script>

<template>
  <div>
    <DsfrButton
      label="Modifier"
      size="sm"
      secondary
      data-testid="admin-user-edit-btn"
      title="Modifier les permissions de l'utilisateur"
      aria-label="Modifier les permissions de l'utilisateur"
      @click="openEditModal"
    />

    <DsfrModal :opened="isEditModalOpen" title="Modifier l'utilisateur" data-testid="admin-edit-user-modal" @close="closeEditModal">
      <p><strong>Utilisateur :</strong> {{ user.email }}</p>

      <OrganizationSearchSelect
        v-model="editingOrganizationId"
        class="fr-mb-2w"
        description="Recherchez et sélectionnez une organisation pour cet utilisateur"
        :initial-organization="user.organization"
        data-testid="user-organization-search"
      />
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
          label="Sauvegarder"
          title="Sauvegarder les modifications"
          aria-label="Sauvegarder les modifications"
          :disabled="isSaving"
          data-testid="admin-save-perms-btn"
          @click="saveUser"
        />
      </template>
    </DsfrModal>
  </div>
</template>
