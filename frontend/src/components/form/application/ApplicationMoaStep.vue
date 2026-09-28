<script setup lang="ts">
import { ref } from "vue";
import type { CreateActorDto } from "@/client/types.gen";
import ApplicationContactFields from "./ApplicationContactFields.vue";
import type { ApplicationContactStepProps, ApplicationFormField } from "./application-form.types";
import { applicationFormSteps } from "./application-form.types";

const props = defineProps<ApplicationContactStepProps>();
const actor = defineModel<CreateActorDto>({ required: true });
const emit = defineEmits<{ sync: [] }>();
const contactFields = ref<InstanceType<typeof ApplicationContactFields> | null>(null);
const focusField = (field: ApplicationFormField) => contactFields.value?.focusField(field);
defineExpose({ focusField });
</script>

<template>
  <div class="fr-card fr-mt-3w fr-p-3w">
    <h3 tabindex="-1" class="fr-mb-3w" data-testid="application-step-title-3">
      Étape 3 sur {{ applicationFormSteps.length }} — MOA (Maîtrise d'Ouvrage)
    </h3>
    <ApplicationContactFields ref="contactFields" v-model="actor" v-bind="props" role="moa" @sync="emit('sync')" />
  </div>
</template>
