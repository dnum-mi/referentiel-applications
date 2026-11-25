<script setup lang="ts">
import { ref } from "vue";
import api from "@/api";
import { isApiSuccess } from "@/api/api-result";
import type { ActorDto, QualitySummaryDto } from "@/client/types.gen";
import QualityNextActions from "@/components/QualityNextActions.vue";
import RefAppTable from "@/components/RefAppTable.vue";
import OrgaLink from "@/components/organization/OgaLink.vue";

const props = defineProps<{ applicationId: string; applicationLabel: string }>();
const opened = ref(false);
const origin = ref<HTMLElement>();
const summary = ref<QualitySummaryDto>();
const actors = ref<ActorDto[]>([]);
const qualityError = ref("");
const actorError = ref("");
const qualityLoading = ref(false);
const actorsLoading = ref(false);
const actorPage = ref(0);
const actorPageSize = ref(5);
const actorTotal = ref(0);
let actorRequest = 0;

async function loadQuality() {
  qualityLoading.value = true;
  qualityError.value = "";
  summary.value = undefined;
  try {
    const result = await api.applicationControllerGetQualitySummary({ path: { applicationId: props.applicationId } });
    if (!isApiSuccess(result) || !result.data) {
      qualityError.value = result.response?.status === 403 ? "Critères non consultables." : "Impossible de charger les critères.";
      return;
    }
    summary.value = result.data;
  } catch {
    qualityError.value = "Impossible de charger les critères.";
  } finally {
    qualityLoading.value = false;
  }
}
async function loadActors(page = 0, rows = actorPageSize.value) {
  actorPageSize.value = rows;
  const current = ++actorRequest;
  actorsLoading.value = true;
  actorError.value = "";
  actors.value = [];
  actorTotal.value = 0;
  actorPage.value = page;
  try {
    const result = await api.applicationActorsControllerFindAll({
      path: { applicationId: props.applicationId },
      query: { page, pageSize: rows },
    });
    if (current !== actorRequest) return;
    if (!isApiSuccess(result) || !result.data) {
      actorError.value = result.response?.status === 403 ? "Interlocuteurs non consultables." : "Impossible de charger les interlocuteurs.";
      return;
    }
    actors.value = result.data.results;
    actorTotal.value = result.data.total;
  } catch {
    if (current === actorRequest) actorError.value = "Impossible de charger les interlocuteurs.";
  } finally {
    if (current === actorRequest) actorsLoading.value = false;
  }
}
function openDetails(event: MouseEvent) {
  origin.value = event.currentTarget as HTMLElement;
  opened.value = true;
  loadQuality();
  loadActors();
}
</script>

<template>
  <DsfrButton
    label="Voir les détails"
    tertiary
    size="sm"
    aria-haspopup="dialog"
    :aria-controls="`target-details-${applicationId}`"
    @click="openDetails"
  />
  <Teleport to="body">
    <DsfrModal
      :modal-id="`target-details-${applicationId}`"
      :opened="opened"
      :origin="origin"
      :title="`Détails de ${applicationLabel}`"
      size="lg"
      @close="opened = false"
    >
      <p v-if="qualityLoading" role="status">Chargement des critères…</p>
      <div v-if="qualityError" role="alert">
        <p>{{ qualityError }}</p>
        <DsfrButton label="Réessayer les critères" tertiary @click="loadQuality" />
      </div>
      <QualityNextActions v-if="summary" :application-id="applicationId" :summary="summary" />
      <h4>Interlocuteurs référencés</h4>
      <div v-if="actorError" role="alert">
        <p>{{ actorError }}</p>
        <DsfrButton label="Réessayer les interlocuteurs" tertiary @click="loadActors(actorPage)" />
      </div>
      <RefAppTable
        v-else
        :items="actors"
        :columns="[
          { field: 'identity', header: 'Interlocuteur' },
          { field: 'actorType', header: 'Rôle' },
          { field: 'organization', header: 'Organisation' },
        ]"
        :loading="actorsLoading"
        :paginator="true"
        :lazy="true"
        :rows="actorPageSize"
        :first="actorPage * actorPageSize"
        :total-records="actorTotal"
        empty-message="Aucun interlocuteur référencé."
        @page="loadActors($event.page, $event.rows)"
      >
        <template #body-identity="{ data }">
          {{ [data.firstname, data.lastname].filter(Boolean).join(" ") }}
          <span v-if="data.email">{{ data.email }}</span>
          <span v-if="data.isGroup"> (Groupe)</span>
        </template>
        <template #body-actorType="{ data }">{{ data.actorType?.label ?? "—" }}</template>
        <template #body-organization="{ data }"
          ><OrgaLink v-if="data.organizationId" :organization-id="data.organizationId" /><span v-else>—</span></template
        >
      </RefAppTable>
      <template #footer>
        <DsfrButton label="Fermer" secondary @click="opened = false" />
      </template>
    </DsfrModal>
  </Teleport>
</template>
