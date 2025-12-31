<script setup lang="ts">
import { ref } from "vue";
import api from "@/api/index";
import type { UserEntity, UpdateUserDto, UserCapabilities } from "@/client/types.gen";
import { useToasterStore } from "@/stores/toasterStore";
import { AdminLevel } from "@/models/user";
import { AdminLevelOptions } from "@/utils/admin-level-utils";
import OrganizationSearchSelect from "../common/OrganizationSearchSelect.vue";
import type { DsfrCheckboxProps } from "@gouvminint/vue-dsfr";

const props = defineProps<{ user: Required<UserEntity> }>();

const emit = defineEmits<{
  userUpdated: [user: UserEntity];
}>();

const toaster = useToasterStore();

const isEditModalOpen = ref(false);
const isSaving = ref(false);
const editingAdminLevel = ref<AdminLevel>(AdminLevel.NONE);
const editingOrganizationId = ref<string>("");
const editingCapabilities = ref<UserCapabilities[]>([]);

async function openEditModal() {
  editingAdminLevel.value = props.user.adminLevel;
  editingOrganizationId.value = props.user.organizationId || "";
  editingCapabilities.value = props.user.capabilities ? [...props.user.capabilities] : [];
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  editingAdminLevel.value = AdminLevel.NONE;
  editingOrganizationId.value = "";
}

async function saveUser() {
  isSaving.value = true;
  try {
    const response = await api.userControllerUpdate({
      path: { id: props.user.id },
      body: {
        adminLevel: editingAdminLevel.value,
        organizationId: editingOrganizationId.value === "" ? null : editingOrganizationId.value,
        capabilities: editingCapabilities.value,
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

const capabilitiesOptions: Omit<DsfrCheckboxProps, "modelValue">[] = [
  {
    label: "Créer une application",
    value: "CreateApplication",
    name: "capability-create-application",
  },
  {
    label: "Créer un signalement global",
    value: "CreateGlobalAnomalyNotification" as UserCapabilities,
    name: "capability-create-global-anomaly-notification",
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
        v-model="editingCapabilities"
        legend="Capacités"
        :options="capabilitiesOptions"
        name="capabilities-checkbox"
        data-testid="capabilities-checkbox"
      />
      <DsfrRadioButtonSet
        v-model="editingAdminLevel"
        legend="Niveau de privilège"
        :options="AdminLevelOptions"
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

<style scoped>
.truncate {
  display: inline-block;
  max-width: 60ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
