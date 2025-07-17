<script setup lang="ts">
import { ref, onMounted } from "vue";
import useToaster from "@/composables/use-toaster";
import Users from "@/api/user";

const toaster = useToaster();
const user = ref(null);

onMounted(async () => {
  await fetchUserProfile();
});

async function fetchUserProfile() {
  try {
    user.value = await Users.getUser();
  } catch (_err) {
    toaster.addErrorMessage("Échec du chargement du profil utilisateur");
  }
}
</script>

<template>
  <div class="fr-grid-row fr-grid-row--center">
    <div class="fr-col-12 fr-col-md-8">
      <div v-if="user" class="fr-card">
        <div class="fr-card__body fr-mt-2w">
          <h2 class="fr-h4">Informations personnelles</h2>
          <div class="fr-table">
            <table>
              <tbody>
                <tr>
                  <th scope="row">ID Keycloak</th>
                  <td>{{ user.keycloakId }}</td>
                </tr>
                <tr>
                  <th scope="row">Email</th>
                  <td>{{ user.email }}</td>
                </tr>
                <tr>
                  <th scope="row">Permissions</th>
                  <td>
                    <span v-for="(permission, index) in user.permissions.split(',')" :key="index" class="fr-badge fr-badge--info fr-mr-1w">
                      {{ permission.trim() }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
