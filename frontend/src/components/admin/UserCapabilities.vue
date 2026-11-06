<script setup lang="ts">
import { Permission, Roles } from "@/client/types.gen";
import { RolesWording } from "@/utils/roles-utils";
import type { DsfrCheckboxProps } from "@gouvminint/vue-dsfr";
import { computed } from "vue";

const props = defineProps<{ role: Roles; canGrantBeta: boolean }>();
const permissions = defineModel<Permission[]>({ required: true });

// Miroir des capacités héritées dans backend/src/permissions/role-to-permissions.ts.
const inheritedPermissions = computed<Permission[]>(() => {
  switch (props.role) {
    case Roles.ADMIN:
      return [
        Permission.MDIT_LIST,
        Permission.CREATE_APPLICATION,
        Permission.CREATE_GLOBAL_REPORT,
        Permission.DATA_EXPORT,
        Permission.TECHNOLOGY_LIST,
      ];
    case Roles.CONTRIBUTOR:
      return [Permission.MDIT_LIST, Permission.CREATE_APPLICATION, Permission.CREATE_GLOBAL_REPORT];
    case Roles.READER:
      return [Permission.MDIT_LIST];
    default:
      return [];
  }
});
const displayedAdditionalPermissions = computed<Permission[]>({
  get: () => [...new Set([...permissions.value, ...inheritedPermissions.value])],
  set: (selected) => {
    // Les droits hérités ne deviennent pas des délégations ; conserver celles déjà explicites.
    permissions.value = selected.filter(
      (permission) => !inheritedPermissions.value.includes(permission) || permissions.value.includes(permission),
    );
  },
});
const additionalPermissionsOptions = computed<Omit<DsfrCheckboxProps, "modelValue">[]>(() =>
  [
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
      label: "Accéder aux fonctionnalités bêta",
      value: Permission.BETA_FEATURES,
      name: "capability-beta-features",
      disabled: !props.canGrantBeta,
      hint: "Accès accordé explicitement, y compris pour les administrateurs. Les droits habituels de chaque fonctionnalité restent nécessaires.",
    },
    {
      label: "Voir les données MDIT",
      value: Permission.MDIT_LIST,
      name: "capability-mdit-view",
    },
    {
      label: "Gérer les campagnes de mise en qualité",
      value: Permission.QUALITY_CAMPAIGN_MANAGE,
      name: "capability-quality-campaign-manage",
    },
    {
      label: "Gérer les campagnes dette IT",
      value: Permission.MDIT_CAMPAIGN_MANAGE,
      name: "capability-mdit-campaign-manage",
    },
    {
      label: "Consulter les technologies",
      value: Permission.TECHNOLOGY_LIST,
      name: "capability-technology-list",
      disabled: props.role === Roles.VISITOR,
      hint: "Disponible pour les niveaux Lecture totale, Écriture totale et Administrateur, dans leur périmètre.",
    },
  ].map((option) => ({
    ...option,
    disabled: option.disabled || inheritedPermissions.value.includes(option.value),
    hint: inheritedPermissions.value.includes(option.value)
      ? `Accès inclus dans le rôle ${RolesWording[props.role]}, dans son périmètre.`
      : option.hint,
  })),
);
</script>

<template>
  <DsfrCheckboxSet
    v-model="displayedAdditionalPermissions"
    legend="Capacités"
    :options="additionalPermissionsOptions"
    name="additional-permissions-checkbox"
    data-testid="additional-permissions-checkbox"
  />
</template>
