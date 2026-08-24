<script setup lang="ts">
import type { NotificationDto } from "@/client/types.gen";
import { computed } from "vue";
import { formatRelativeDate } from "@/composables/use-date";
import { getNotificationIcon } from "@/composables/use-notification-icon";

const props = defineProps<{
  notification: NotificationDto;
}>();

const emit = defineEmits<{
  select: [notification: NotificationDto];
}>();

const icon = computed(() => getNotificationIcon(props.notification.type));
const relativeDate = computed(() => formatRelativeDate(props.notification.createdAt));
</script>

<template>
  <component
    :is="notification.link && !notification.emailLogId ? 'router-link' : 'div'"
    :to="notification.emailLogId ? undefined : (notification.link ?? undefined)"
    class="notification-item fr-p-2w"
    :class="{ 'notification-item--unread': !notification.isRead }"
    data-testid="notification-item"
    @click="emit('select', notification)"
  >
    <span :class="icon" class="notification-item__icon" aria-hidden="true" />
    <span class="notification-item__body">
      <span class="notification-item__message">{{ notification.message }}</span>
      <span class="notification-item__date">
        {{ relativeDate }}
        <span v-if="notification.emailLogId" class="notification-item__email-hint">
          <span class="fr-icon-mail-line" aria-hidden="true" /> Voir l'e-mail
        </span>
      </span>
    </span>
    <span v-if="!notification.isRead" class="notification-item__dot" aria-hidden="true" />
  </component>
</template>

<style scoped>
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--border-default-grey);
  cursor: pointer;
}

.notification-item:hover {
  background-color: var(--background-alt-grey);
}

.notification-item--unread {
  background-color: var(--background-alt-blue-france);
}

.notification-item__icon {
  flex-shrink: 0;
  font-size: 1.25rem;
}

.notification-item__body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.notification-item__message {
  font-size: 0.875rem;
}

.notification-item__date {
  font-size: 0.75rem;
  color: var(--text-mention-grey);
}

.notification-item__email-hint {
  margin-left: 0.5rem;
  font-style: italic;
}

.notification-item__dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: var(--background-action-high-blue-france);
  margin-top: 0.35rem;
}
</style>
