<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from "vue";
import { isEmailValid } from "@/utils/email";

withDefaults(
  defineProps<{
    testidPrefix?: string;
  }>(),
  { testidPrefix: "sponsor-email" },
);

const emit = defineEmits<{
  "update:valid": [boolean];
}>();

const sponsorEmails = defineModel<string[]>({ default: () => [] });
const groupTitleId = `sponsor-emails-${useId()}`;
const group = ref<HTMLFieldSetElement | null>(null);

// Un champ vide n'est pas une erreur (les sponsors sont optionnels, et une ligne vide peut être en
// cours de saisie) : seule une valeur non vide et mal formée est signalée.
function errorFor(email: string): string | undefined {
  if (!email.trim() || isEmailValid(email)) return undefined;
  return "Email invalide. Format attendu – ex : exemple@mail.fr";
}

const isValid = computed(() => sponsorEmails.value.every((email) => !errorFor(email)));

watch(isValid, (value) => emit("update:valid", value), { immediate: true });

async function addSponsor() {
  sponsorEmails.value = [...sponsorEmails.value, ""];
  await nextTick();
  const fields = group.value?.querySelectorAll<HTMLInputElement>("input[type=email]");
  fields?.[fields.length - 1]?.focus();
}

async function removeSponsor(index: number) {
  sponsorEmails.value = sponsorEmails.value.filter((_, i) => i !== index);
  await nextTick();
  const fields = group.value?.querySelectorAll<HTMLInputElement>("input[type=email]");
  if (fields?.length) fields[Math.min(index, fields.length - 1)]?.focus();
  else group.value?.querySelector<HTMLButtonElement>("button")?.focus();
}

function updateSponsor(index: number, value: string | number | undefined) {
  const stringValue = value != null ? String(value) : "";
  sponsorEmails.value = sponsorEmails.value.map((email, i) => (i === index ? stringValue : email));
}
</script>

<template>
  <fieldset ref="group" class="sponsor-emails" :aria-labelledby="groupTitleId">
    <legend :id="groupTitleId" class="fr-sr-only">Adresses email des sponsors (optionnel)</legend>
    <div v-for="(sponsorEmail, index) in sponsorEmails" :key="index" class="sponsor-email-row">
      <DsfrInputGroup
        :model-value="sponsorEmail"
        class="sponsor-email-input"
        type="email"
        :label="`Email du sponsor ${index + 1}`"
        label-visible
        :error-message="errorFor(sponsorEmail)"
        :data-testid="`${testidPrefix}-${index}`"
        @update:model-value="(value) => updateSponsor(index, value)"
      />
      <button
        type="button"
        class="sponsor-email-remove"
        :data-testid="`${testidPrefix}-remove-${index}`"
        :aria-label="`Supprimer le sponsor ${index + 1}`"
        @click="removeSponsor(index)"
      >
        <VIcon name="ri-delete-bin-line" />
      </button>
    </div>

    <DsfrButton
      tertiary
      size="small"
      icon="ri-add-line"
      label="Ajouter un sponsor"
      :data-testid="`${testidPrefix}-add`"
      @click="addSponsor"
    />
  </fieldset>
</template>

<style scoped>
.sponsor-emails {
  border: 0;
  min-width: 0;
  padding: 0;
  margin: 0 0 1rem;
}

.sponsor-email-row {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.sponsor-email-input {
  flex: 1;
}

.sponsor-email-remove {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-mention-grey);
  padding: 0.5rem;
  margin-bottom: 0.5rem;
}

/* Sans ces deux résets, le bouton de suppression (aligné en bas de la ligne flex) se retrouve
   bien en dessous du champ visible : `.fr-input-group` porte une margin-bottom (rythme vertical
   DSFR standard, déjà géré ici par `.sponsor-email-row`) et une zone de message de validation
   vide mais réservée, toutes deux comptées dans la hauteur de l'item flex. */
.sponsor-email-row :deep(.fr-input-group) {
  margin-bottom: 0;
}

.sponsor-email-row :deep(.fr-messages-group) {
  min-height: 0;
}

.sponsor-email-remove:hover {
  color: var(--text-default-error);
}
</style>
