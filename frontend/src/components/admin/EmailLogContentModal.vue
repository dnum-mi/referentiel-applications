<script setup lang="ts">
import type { EmailLogDto } from "@/client/types.gen";
import { useToggle } from "@vueuse/core";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const props = defineProps<{ log: EmailLogDto }>();
const [value, toggle] = useToggle(false);

const sentAtLabel = computed(() => format(new Date(props.log.sentAt), "dd/MM/yyyy HH:mm", { locale: fr }));
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
    <DsfrModal :opened="value" size="lg" :title="props.log.subject" data-testid="admin-email-log-modal" @close="toggle(false)">
      <dl class="email-log-meta fr-mb-3w">
        <dt>Envoyé le</dt>
        <dd>{{ sentAtLabel }}</dd>
        <dt>Destinataire(s)</dt>
        <dd>{{ props.log.to }}</dd>
      </dl>

      <!-- L'e-mail peut contenir du texte fourni par un utilisateur (ex: description d'un
           signalement) inséré tel quel dans le HTML : on l'affiche dans une iframe totalement
           sandboxée (aucun script, aucune origine) pour ne pas ouvrir de XSS stocké côté admin. -->
      <iframe
        class="email-log-preview"
        title="Contenu de l'e-mail"
        sandbox=""
        :srcdoc="props.log.html"
        data-testid="admin-email-log-iframe"
      />
    </DsfrModal>
  </div>
</template>

<style scoped>
.email-log-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1rem;
}

.email-log-meta dt {
  font-weight: bold;
}

.email-log-meta dd {
  margin: 0;
}

.email-log-preview {
  width: 100%;
  height: 60vh;
  border: 1px solid var(--border-default-grey);
  border-radius: 0.25rem;
  background-color: #fff;
}
</style>
