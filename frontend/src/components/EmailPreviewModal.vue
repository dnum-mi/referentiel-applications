<script setup lang="ts">
import type { EmailLogDto } from "@/client/types.gen";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { computed } from "vue";

const props = defineProps<{
  log: EmailLogDto | null;
  opened: boolean;
}>();

const emit = defineEmits<{ close: [] }>();

const sentAtLabel = computed(() => (props.log ? format(new Date(props.log.sentAt), "dd/MM/yyyy HH:mm", { locale: fr }) : ""));
</script>

<template>
  <!-- Teleport vers <body> : le DSFR neutralise tout `.fr-modal` imbriqué dans `.fr-header`
       (règle desktop `.fr-header .fr-modal { position: initial; ... }`, prévue pour son propre
       menu mobile) — sans ça, la modale ouverte depuis la cloche de notifications (dans le
       header) s'affiche comme un bloc en ligne au lieu d'une vraie modale plein écran.

       DsfrModal ne déclenche `<dialog>.showModal()` que sur un CHANGEMENT de `opened` (watcher
       sans `immediate`) : il doit rester monté en permanence, fermé par défaut, comme dans
       EmailLogContentModal (admin) — sinon, monté directement `opened=true` (ex. via un `v-if`
       sur ce composant), le watcher ne se déclenche jamais et la modale ne s'ouvre pas
       correctement. -->
  <Teleport to="body">
    <DsfrModal :opened="opened" size="lg" :title="log?.subject ?? ''" data-testid="email-preview-modal" @close="emit('close')">
      <template v-if="log">
        <dl class="email-preview-meta fr-mb-3w">
          <dt>Envoyé le</dt>
          <dd>{{ sentAtLabel }}</dd>
          <dt>Destinataire(s)</dt>
          <dd>{{ log.to }}</dd>
        </dl>

        <!-- L'e-mail peut contenir du texte fourni par un utilisateur (ex: description d'un
             signalement) inséré tel quel dans le HTML : on l'affiche dans une iframe totalement
             sandboxée (aucun script, aucune origine) pour ne pas ouvrir de XSS stocké. -->
        <iframe class="email-preview-iframe" title="Contenu de l'e-mail" sandbox="" :srcdoc="log.html" data-testid="email-preview-iframe" />
      </template>
    </DsfrModal>
  </Teleport>
</template>

<style scoped>
.email-preview-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1rem;
}

.email-preview-meta dt {
  font-weight: bold;
}

.email-preview-meta dd {
  margin: 0;
}

.email-preview-iframe {
  width: 100%;
  height: 60vh;
  border: 1px solid var(--border-default-grey);
  border-radius: 0.25rem;
  background-color: #fff;
}
</style>
