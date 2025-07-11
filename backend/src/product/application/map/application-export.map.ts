import { translateEnum } from 'src/common/utils/enum.utils';
import {
  AnomalyNotificationStatusLabels,
  ExternalRessourceTypeLabels,
  PriorityRestartLabels,
} from 'src/product/constants/enum-label';
import { RelationTypeLabelsBidirectional } from 'src/product/constants/relation-type-labels';
import { ApplicationWithAllRelations } from 'src/product/types/application.type';

export function getFullField(
  app: ApplicationWithAllRelations,
  field: string,
): string {
  const value = field.split('.').reduce((obj, key) => obj?.[key], app);

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  if (field === 'hostings' && Array.isArray(app.hostings)) {
    return app.hostings
      .map((h) => {
        const provider = h.hostingOption?.provider ?? '';
        const site = h.hostingOption?.site ?? '';
        return `${provider}${site ? ` (${site})` : ''}`;
      })
      .join(', ');
  }

  return value ? JSON.stringify(value) : '';
}

export function mapApplications(apps: ApplicationWithAllRelations[]) {
  return apps.map((app) => ({
    id: app.id,
    label: app.label,
    shortName: app.shortName ?? '',
    logo: app.logo ?? '',
    description: app.description,
    tags: app.tags?.join(', ') ?? '',
    purposes: app.purposes?.join(', ') ?? '',
    targetPopulations: app.targetPopulations?.join(', ') ?? '',
    priorityRestart: translateEnum(PriorityRestartLabels, app.priorityRestart),
  }));
}

export function mapHostings(app: ApplicationWithAllRelations) {
  return (
    app.hostings?.map((h) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      label: h.label || '',
      provider: h.hostingOption?.provider || '',
      site: h.hostingOption?.site || '',
      platform: h.hostingOption?.platform || '',
      building: h.hostingOption?.building || '',
      room: h.hostingOption?.room || '',
    })) ?? []
  );
}

export function mapActors(app: ApplicationWithAllRelations) {
  return (
    app.actors?.map((a) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      firstname: a.firstname,
      lastname: a.lastname,
      type: a.actorType?.label || '',
      email: a.email,
    })) ?? []
  );
}

export function mapCompliances(app: ApplicationWithAllRelations) {
  if (!app.compliance) return [];

  const compliance = app.compliance;

  return [
    {
      applicationId: app.id,
      applicationLabel: app.label,
      ...compliance,
      // Convert boolean values to "Oui" or "Non"
      dima_is_hno:
        compliance.dima_is_hno === true
          ? 'Oui'
          : compliance.dima_is_hno === false
            ? 'Non'
            : null,
      dima_recovery_plan:
        compliance.dima_recovery_plan === true
          ? 'Oui'
          : compliance.dima_recovery_plan === false
            ? 'Non'
            : null,
      dsfr_implemented:
        compliance.dsfr_implemented === true
          ? 'Oui'
          : compliance.dsfr_implemented === false
            ? 'Non'
            : null,
      rgpd_has_aipd:
        compliance.rgpd_has_aipd === true
          ? 'Oui'
          : compliance.rgpd_has_aipd === false
            ? 'Non'
            : null,
    },
  ];
}

export function mapLabels(app: ApplicationWithAllRelations) {
  return (
    app.labels?.map((l) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      source: l.source,
      value: l.value,
    })) ?? []
  );
}

export function mapExternalResources(app: ApplicationWithAllRelations) {
  return (
    app.externalRessource?.map((r) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      link: r.link,
      description: r.description,
      type: translateEnum(ExternalRessourceTypeLabels, r.type),
    })) ?? []
  );
}

export function mapAnomalyNotifications(app: ApplicationWithAllRelations) {
  return (
    app.anomalyNotification?.map((n) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      description: n.description,
      status: translateEnum(AnomalyNotificationStatusLabels, n.status),
    })) ?? []
  );
}

export function mapRelationsOut(app: ApplicationWithAllRelations) {
  return (
    app.relationsAsSource?.map((rel) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      sourceId: app.id,
      targetId: rel.targetApplication?.id,
      targetLabel: rel.targetApplication?.label,
      type: RelationTypeLabelsBidirectional[rel.type]?.source ?? rel.type,
    })) ?? []
  );
}

export function mapRelationsIn(app: ApplicationWithAllRelations) {
  return (
    app.relationsAsTarget?.map((rel) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      targetId: app.id,
      sourceId: rel.sourceApplication?.id,
      sourceLabel: rel.sourceApplication?.label,
      type: RelationTypeLabelsBidirectional[rel.type]?.target ?? rel.type,
    })) ?? []
  );
}
