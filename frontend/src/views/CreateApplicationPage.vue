<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import ApplicationForm from "@/components/form/ApplicationForm.vue";
import { routeNames } from "@/router/route-names";
import type { ApplicationDto } from "@/client/types.gen";
import type { ApplicationFormInitialData } from "@/models/Application";

const router = useRouter();
const emptyApplication = ref<ApplicationFormInitialData>({
  label: "",
  shortName: "",
  description: "",
  logo: "",
  status: { status: "to_validate" as const },
  purposes: [],
  targetPopulations: [],
  priorityRestart: undefined,
  tags: [],
  myPerms: new Set(),
});

function handleSuccess(application: ApplicationDto) {
  router.push({ name: routeNames.PROFILEAPP, params: { id: application.id } });
}

function handleCancel() {
  router.push({ name: routeNames.SEARCHAPP });
}
</script>

<template>
  <div class="fr-container">
    <div class="fr-grid-row">
      <div class="fr-col-12">
        <h1>Créer une application</h1>
        <ApplicationForm
          mode="create"
          :initial-data="emptyApplication"
          data-testid="create-application-form"
          @success="handleSuccess"
          @cancel="handleCancel"
        />
      </div>
    </div>
  </div>
</template>
