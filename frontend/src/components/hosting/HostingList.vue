<script setup lang="ts">
import type { HostingDto } from "@/client/types.gen";
import type { DsfrBadgeProps } from "@gouvminint/vue-dsfr";

defineProps<{ hostings: HostingDto[]; canEdit: boolean }>();
const emit = defineEmits(["edit", "delete"]);

function handleEdit(hosting: HostingDto) {
  emit("edit", hosting);
}

function handleDelete(hosting: HostingDto) {
  emit("delete", hosting);
}

const getActiveBadgeProps = (
  hosting: HostingDto,
): Pick<DsfrBadgeProps, "label"> & { type: Extract<DsfrBadgeProps["type"], "success" | "warning" | "info"> } => {
  if (hosting.isActive === null) {
    return { label: "Non renseigné", type: "warning" };
  }
  return hosting.isActive ? { label: "Actif", type: "success" } : { label: "Passif", type: "info" };
};
</script>

<template>
  <div v-if="hostings.length === 0" class="fr-text--sm fr-text--italic" data-testid="hosting-empty">Aucun hébergement enregistré.</div>
  <div v-else>
    <div
      v-for="hosting in hostings"
      :key="hosting.id"
      class="fr-mb-2w fr-pb-1w fr-border--bottom"
      :data-testid="`hosting-item-${hosting.id}`"
    >
      <div class="fr-grid-row fr-grid-row--middle">
        <div class="fr-col">
          <p class="fr-mb-0">
            <strong>{{ hosting.label || "Hébergement" }}</strong>
            <DsfrBadge v-bind="getActiveBadgeProps(hosting)" small class="fr-ml-1w" data-testid="hosting-active-badge" />
          </p>
          <div class="fr-text--sm fr-mt-1w">
            <!-- Location info -->
            <p v-if="hosting.hostingOption?.site || hosting.hostingOption?.building || hosting.hostingOption?.room" class="fr-mb-0">
              <span class="fr-icon-map-pin-2-line fr-mr-1w" aria-hidden="true" />
              {{ [hosting.hostingOption?.site, hosting.hostingOption?.building, hosting.hostingOption?.room].filter(Boolean).join(" - ") }}
            </p>

            <!-- Platform & Provider info -->
            <p v-if="hosting.hostingOption?.platform || hosting.hostingOption?.provider" class="fr-mb-0">
              <span class="fr-icon-server-line fr-mr-1w" aria-hidden="true" />
              {{ hosting.hostingOption?.platform || "" }}
              {{ hosting.hostingOption?.provider ? `(${hosting.hostingOption.provider})` : "" }}
            </p>
          </div>
        </div>
        <div class="fr-col-auto">
          <DsfrButton
            tertiary
            size="sm"
            icon="fr-icon-edit-line"
            title="Modifier"
            class="fr-mr-1w"
            data-testid="hosting-edit-btn"
            :disabled="!canEdit"
            @click="handleEdit(hosting)"
          />
          <DsfrButton
            tertiary
            size="sm"
            icon="fr-icon-delete-bin-line"
            title="Supprimer"
            data-testid="hosting-delete-btn"
            :disabled="!canEdit"
            @click="handleDelete(hosting)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
