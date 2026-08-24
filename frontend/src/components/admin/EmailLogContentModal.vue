<script setup lang="ts">
import type { EmailLogDto } from "@/client/types.gen";
import { useToggle } from "@vueuse/core";
import EmailPreviewModal from "@/components/EmailPreviewModal.vue";

const props = defineProps<{ log: EmailLogDto }>();
const [value, toggle] = useToggle(false);
</script>

<template>
  <div>
    <DsfrButton
      label="Voir"
      size="sm"
      secondary
      data-testid="admin-email-log-view-btn"
      title="Voir le contenu complet de l'e-mail"
      aria-label="Voir le contenu complet de l'e-mail"
      @click="toggle()"
    />
    <EmailPreviewModal :log="props.log" :opened="value" @close="toggle(false)" />
  </div>
</template>
