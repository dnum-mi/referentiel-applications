<script setup lang="ts">
import api from "@/api/index";
import { Roles, type ContactAdminDto } from "@/client/types.gen";
import { profileAuthLevelText } from "@/composables/use-auth-level";
import { useUserStore } from "@/stores/userStore";
import { computed, ref, onMounted, nextTick, useTemplateRef } from "vue";

const userStore = useUserStore();

const CONTACT_ADMIN_SOURCE_LABELS: Record<ContactAdminDto["source"], string> = {
  local: "administrateur de votre périmètre",
  global: "administrateur global",
  support: "support",
};

// Administrateur à contacter, résolu à partir de l'organisation de l'utilisateur (même règle que
// le contact admin d'une fiche, #2593). Seul un administrateur global n'a personne au-dessus de
// lui : un admin scopé voit la ligne (le backend l'exclut de la résolution). Un échec de
// chargement n'est pas bloquant pour le profil.
const contactAdmin = ref<ContactAdminDto>();
const isGlobalAdmin = computed(() => userStore.userRole === Roles.ADMIN && !userStore.user?.scopeOrganization);

async function loadContactAdmin() {
  try {
    const response = await api.userControllerGetMyContactAdmin();
    contactAdmin.value = response.data;
  } catch (error) {
    console.error("Error fetching contact admin:", error);
    contactAdmin.value = undefined;
  }
}

// #1985 : ligne « Niveau d'authentification », même table de motifs que le bandeau.
const authLevelText = computed(() => profileAuthLevelText(userStore.authLevel));
const isUpdating = ref(false);
const emailNotificationsEnabled = ref(true);
const successMessage = ref("");
const errorMessage = ref("");
const toggleRef = useTemplateRef<{ $el?: HTMLElement } | null>("toggleRef");

async function handleToggleEmailNotifications() {
  isUpdating.value = true;
  successMessage.value = "";
  errorMessage.value = "";

  const SUCCESS_MESSAGE_TIMEOUT = 3000;

  try {
    await userStore.updateEmailPreferences(emailNotificationsEnabled.value);
    successMessage.value = "Vos préférences de notification ont été mises à jour avec succès.";

    setTimeout(() => {
      successMessage.value = "";
    }, SUCCESS_MESSAGE_TIMEOUT);
  } catch (error) {
    console.error("Error updating email preferences:", error);
    errorMessage.value = "Erreur lors de la mise à jour de vos préférences. Veuillez réessayer.";

    emailNotificationsEnabled.value = !emailNotificationsEnabled.value;
  } finally {
    isUpdating.value = false;
    // 12.8 : conserver le focus sur le champ après l'opération (le :disabled le retire pendant la requête).
    await nextTick();
    toggleRef.value?.$el?.querySelector("input")?.focus();
  }
}

onMounted(async () => {
  await userStore.fetchUser();
  if (!isGlobalAdmin.value) await loadContactAdmin();
});
</script>

<template>
  <div v-if="userStore.user" class="fr-mt-3w" data-testid="user-profile-card">
    <!-- RGAA-072 : tableau clé/valeur à en-têtes de ligne, sans <thead> vide → table native dans le conteneur DSFR. -->
    <div class="fr-table fr-table--bordered user-profile-table" data-testid="user-profile-table">
      <table>
        <caption class="fr-sr-only">
          Informations personnelles
        </caption>
        <tbody>
          <tr>
            <th scope="row">Organisation</th>
            <td data-testid="user-profile-organization">
              {{ userStore.user.organization?.path || "Non renseignée" }}
            </td>
          </tr>
          <tr>
            <th scope="row">Email</th>
            <td data-testid="user-profile-email">
              {{ userStore.user.email }}
            </td>
          </tr>
          <tr v-if="contactAdmin && !isGlobalAdmin">
            <th scope="row">Administrateur</th>
            <td data-testid="user-profile-contact-admin">
              <a :href="`mailto:${contactAdmin.email}`" data-testid="user-profile-contact-admin-link">{{ contactAdmin.email }}</a>
              <span class="fr-text--xs fr-ml-1w" data-testid="user-profile-contact-admin-source"
                >({{ CONTACT_ADMIN_SOURCE_LABELS[contactAdmin.source] }})</span
              >
            </td>
          </tr>
          <tr v-if="authLevelText">
            <th scope="row">Niveau d'authentification</th>
            <td data-testid="user-profile-auth-level">
              <span
                v-if="userStore.isAuthDowngraded"
                class="fr-badge fr-badge--warning fr-badge--sm fr-mr-1w"
                data-testid="user-profile-auth-level-badge"
                >Limitée</span
              >
              {{ authLevelText }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="fr-mt-4w">
      <UserPermissions :user="userStore.user" />
    </div>
    <div class="fr-mt-4w">
      <h2 class="fr-h6">Préférences de notification</h2>
      <DsfrToggleSwitch
        ref="toggleRef"
        v-model="emailNotificationsEnabled"
        label="Recevoir les notifications par email"
        aria-label="Recevoir des notifications par email lorsque des changements sont apportés à vos applications suivies."
        data-testid="user-profile-email-notifications-checkbox"
        :disabled="isUpdating"
        @update:model-value="handleToggleEmailNotifications"
      />
    </div>
  </div>
</template>

<style scoped>
/* `fr-table--bordered` (DSFR) ne trace que des séparateurs horizontaux entre les lignes : on
   encadre chaque cellule, et on retire ces séparateurs pour ne pas doubler la bordure. */
.user-profile-table.fr-table--bordered > table {
  border-collapse: collapse;
}

.user-profile-table.fr-table--bordered > table tbody tr {
  background-image: none;
}

.user-profile-table.fr-table--bordered > table th,
.user-profile-table.fr-table--bordered > table td {
  border: 1px solid var(--border-default-grey);
}
</style>
