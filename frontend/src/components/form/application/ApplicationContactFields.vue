<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import type { CreateActorDto } from "@/client/types.gen";
import OrganizationSearchSelect from "@/components/common/OrganizationSearchSelect.vue";
import type { ApplicationContactStepProps, ApplicationFormField, ContactField, ContactRole } from "./application-form.types";

const props = defineProps<ApplicationContactStepProps & { role: ContactRole }>();
const actor = defineModel<CreateActorDto>({ required: true });
const emit = defineEmits<{ sync: [] }>();
const container = ref<HTMLElement | null>(null);
const organizationSearch = ref<InstanceType<typeof OrganizationSearchSelect> | null>(null);
const contactLabel = computed(() => props.role.toUpperCase());
const organizationId = computed({
  get: () => actor.value.organizationId ?? "",
  set: (value: string) => (actor.value.organizationId = value),
});

function fieldId(field: ContactField) {
  return `application-${props.role}-${field === "organizationId" ? "organization" : field}`;
}

function fieldError(field: ContactField) {
  return props.errors[`${props.role}.${field}`];
}

async function focusField(field: ApplicationFormField) {
  if (!field.startsWith(`${props.role}.`)) return;
  await nextTick();
  if (field === `${props.role}.organizationId`) organizationSearch.value?.focus();
  else container.value?.querySelector<HTMLInputElement>(`[id="application-${field.replace(".", "-")}"]`)?.focus();
}

defineExpose({ focusField });
</script>

<template>
  <div ref="container">
    <p class="fr-text--sm fr-mb-3w">
      <span class="fr-icon-information-line fr-mr-1w" aria-hidden="true" />
      Toutes les informations du contact {{ contactLabel }} sont obligatoires.
    </p>
    <DsfrInputGroup
      :id="fieldId('email')"
      v-model.trim="actor.email"
      :label="`Email du contact ${contactLabel} – ex : exemple@mail.fr`"
      label-visible
      required
      type="email"
      :description-id="`${fieldId('email')}-error`"
      :error-message="fieldError('email')"
      :aria-invalid="fieldError('email') ? true : undefined"
      :data-testid="fieldId('email')"
      class="fr-mb-2w"
    />
    <DsfrButton
      type="button"
      label="Synchroniser depuis MAIA (par email)"
      size="sm"
      tertiary
      :disabled="isSyncing || !actor.email"
      :data-testid="`application-${role}-sync-maia-btn`"
      :title="`Synchroniser l'organisation ${contactLabel} depuis MAIA`"
      :aria-label="`Synchroniser l'organisation ${contactLabel} depuis MAIA`"
      class="fr-mb-3w"
      @click="emit('sync')"
    />
    <OrganizationSearchSelect
      ref="organizationSearch"
      v-model="organizationId"
      :initial-organization="initialOrganization"
      :label="role === 'moa' ? 'Organisation MOA *' : 'Organisation MOE'"
      :input-id="`${fieldId('organizationId')}-search`"
      :select-id="`${fieldId('organizationId')}-select`"
      :description-id="`${fieldId('organizationId')}-error`"
      class="fr-mb-3w"
      required
      :error-message="fieldError('organizationId')"
      :data-testid="fieldId('organizationId')"
    />
    <div v-if="role === 'moa'" class="moa-is-group-checkbox">
      <DsfrCheckbox v-model="actor.isGroup" name="moaIsGroup" :value="true" data-testid="application-moa-is-group">
        <template #label>
          <span style="display: inline-flex; align-items: center; gap: 0.25rem">
            Cet acteur est rattaché(e) à une entité
            <DsfrTooltip content="Établir le lien entre une personne physique et une boîte e-mail fonctionnelle (ex: equipe, service)" />
          </span>
        </template>
      </DsfrCheckbox>
    </div>
    <DsfrCheckbox
      v-else
      v-model="actor.isGroup"
      name="moeIsGroup"
      :value="true"
      label="Cet acteur est rattaché(e) à une entité"
      data-testid="application-moe-is-group"
      class="fr-mb-3w"
    />
    <div v-if="!actor.isGroup" class="fr-grid-row fr-grid-row--gutters">
      <div class="fr-col-6">
        <DsfrInputGroup
          :id="fieldId('firstname')"
          v-model.trim="actor.firstname"
          :label="`Prénom du contact ${contactLabel}`"
          label-visible
          required
          :description-id="`${fieldId('firstname')}-error`"
          :error-message="fieldError('firstname')"
          :aria-invalid="fieldError('firstname') ? true : undefined"
          :data-testid="fieldId('firstname')"
        />
      </div>
      <div class="fr-col-6">
        <DsfrInputGroup
          :id="fieldId('lastname')"
          v-model.trim="actor.lastname"
          :label="`Nom du contact ${contactLabel}`"
          label-visible
          required
          :description-id="`${fieldId('lastname')}-error`"
          :error-message="fieldError('lastname')"
          :aria-invalid="fieldError('lastname') ? true : undefined"
          :data-testid="fieldId('lastname')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.moa-is-group-checkbox :deep(.fr-checkbox-group input[type="checkbox"] + label::before) {
  top: 50%;
  transform: translateY(-50%);
}
</style>
