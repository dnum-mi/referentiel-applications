import { NotificationType } from "@/client/types.gen";

const iconByType: Record<NotificationType, string> = {
  [NotificationType.REPORT_CREATED]: "fr-icon-flag-line",
  [NotificationType.REPORT_STATUS_CHANGED]: "fr-icon-flag-line",
  [NotificationType.ACTOR_ADDED]: "fr-icon-user-add-line",
  [NotificationType.ACTOR_MODIFIED]: "fr-icon-user-line",
  [NotificationType.APPLICATION_FOLLOWED_CHANGED]: "fr-icon-refresh-line",
  [NotificationType.APPLICATION_VALIDATION_REMINDER]: "fr-icon-time-line",
  [NotificationType.USER_ORGANIZATION_CHANGED]: "fr-icon-building-line",
  [NotificationType.USER_PERMISSIONS_CHANGED]: "fr-icon-lock-line",
  [NotificationType.USER_BLOCKED]: "fr-icon-forbid-line",
  [NotificationType.USER_UNBLOCKED]: "fr-icon-checkbox-circle-line",
  [NotificationType.CAMPAIGN_QUALITY_REMINDER]: "ri-line-chart-line",
  [NotificationType.CAMPAIGN_QUALITY_SPONSOR_REPORT]: "ri-mail-send-line",
  // Fin de vie d'une technologie (#2236) : le sablier dit l'échéance, là où un
  // pictogramme d'alerte se confondrait avec les signalements.
  [NotificationType.TECHNOLOGY_END_OF_LIFE]: "fr-icon-hourglass-line",
};

export function getNotificationIcon(type: NotificationType): string {
  return iconByType[type];
}
