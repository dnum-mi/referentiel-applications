<script lang="ts" setup>
import type { Message } from "../stores/toasterStore";
import { computed } from "vue";

const props = defineProps<{ messages: Message[] }>();
const statusMessages = computed(() => props.messages.filter((message) => message.type !== "error"));
const errorMessages = computed(() => props.messages.filter((message) => message.type === "error"));
const emit = defineEmits<{
  closeMessage: [id: string];
}>();

const close = (id: string) => emit("closeMessage", id);
</script>

<template>
  <div class="toaster-container" data-testid="app-toaster">
    <div class="toasters">
      <TransitionGroup
        name="list"
        tag="div"
        class="message-group"
        role="status"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions text"
      >
        <template v-for="message in statusMessages" :key="message.id">
          <DsfrAlert class="app-alert" v-bind="message" :data-testid="`app-toaster-message-${message.id}`" @close="close(message.id)" />
        </template>
      </TransitionGroup>
      <TransitionGroup
        name="list"
        tag="div"
        class="message-group"
        role="alert"
        aria-live="assertive"
        aria-atomic="false"
        aria-relevant="additions text"
      >
        <DsfrAlert
          v-for="message in errorMessages"
          :key="message.id"
          class="app-alert"
          v-bind="message"
          :data-testid="`app-toaster-message-${message.id}`"
          @close="close(message.id)"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.toaster-container {
  pointer-events: none;
  position: fixed;
  bottom: 1rem;
  width: 100%;
  z-index: 1750; /* To be on top of .fr-modal which has z-index: 1750 */
}
.toasters {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-height: 50vh;
  overflow-y: auto;
}
.message-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-alert {
  background-color: var(--grey-1000-50);
  width: 90%;
  pointer-events: none;
}

/* Le texte ne bloque pas les commandes sous-jacentes ; les actions du
   message restent utilisables, notamment sa fermeture. */
.app-alert :deep(button),
.app-alert :deep(a) {
  pointer-events: auto;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.list-leave-active {
  position: fixed;
}
</style>
