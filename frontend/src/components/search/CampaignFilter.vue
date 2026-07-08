<script setup lang="ts">
import { computed, onMounted } from "vue";
import { DsfrSelect } from "@gouvminint/vue-dsfr";
import { useApplicationSearch } from "@/composables/use-application-search";
import { useMditCampaigns } from "@/composables/use-mdit-campaigns";

const { filters, setFilter } = useApplicationSearch();
const { campaigns, loadActiveCampaigns } = useMditCampaigns();

const options = computed(() =>
  campaigns.value.map((campaign) => ({ value: String(campaign.year), text: campaign.label || String(campaign.year) })),
);

// La campagne la plus récente est présentée par défaut ; sinon celle choisie.
const selected = computed(() => {
  const current = filters.value.millesime ?? campaigns.value[0]?.year;
  return current == null ? "" : String(current);
});

function onSelect(value: string | number): void {
  const year = Number(value);
  if (!Number.isNaN(year)) {
    setFilter({ millesime: year, page: 0 });
  }
}

onMounted(loadActiveCampaigns);
</script>

<template>
  <div v-if="options.length" class="campaign-filter" data-testid="time-millesime">
    <DsfrSelect
      :model-value="selected"
      :options="options"
      aria-describedby="campaign-millesime-tooltip-desc"
      data-testid="time-millesime-select"
      @update:model-value="onSelect($event)"
    >
      <template #label>
        <span style="display: inline-flex; align-items: center; gap: 0.25rem">
          Campagne dette IT (millésime)
          <DsfrTooltip
            id="campaign-millesime-tooltip-desc"
            content="Sélectionne l’année (millésime) de la campagne de collecte de la dette technique à afficher."
          />
        </span>
      </template>
    </DsfrSelect>
  </div>
</template>

<style scoped>
.campaign-filter {
  margin-bottom: 0.5rem;
}
</style>
