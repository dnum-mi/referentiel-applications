import { translateEnum } from 'src/common/utils/enum.utils';
import {
  AnomalyNotificationStatusLabels,
  EventTypeLabels,
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
  const complianceItems = [];

  // DIMA
  if (
    compliance.dima_duration_hours ||
    compliance.dima_recovery_plan ||
    compliance.dima_test_result ||
    compliance.dima_last_test_date
  ) {
    complianceItems.push({
      applicationId: app.id,
      applicationLabel: app.label,
      type: 'DIMA',
      name: compliance.dima_duration_hours
        ? `DIMA ${compliance.dima_duration_hours}H`
        : 'DIMA',
      status:
        compliance.dima_recovery_plan || compliance.dima_test_result
          ? 'Plan défini'
          : 'En cours',
      validityStart:
        compliance.dima_last_test_date?.toISOString().split('T')[0] || '',
      validityEnd: '',
    });
  }

  // PDMA
  if (
    compliance.pdma_duration_hours ||
    compliance.pdma_backup_frequency ||
    compliance.pdma_test_result ||
    compliance.pdma_last_test_date
  ) {
    complianceItems.push({
      applicationId: app.id,
      applicationLabel: app.label,
      type: 'PDMA',
      name: compliance.pdma_duration_hours
        ? `PDMA ${compliance.pdma_duration_hours}H`
        : 'PDMA',
      status:
        compliance.pdma_backup_frequency || compliance.pdma_test_result
          ? 'Plan défini'
          : 'En cours',
      validityStart:
        compliance.pdma_last_test_date?.toISOString().split('T')[0] || '',
      validityEnd: '',
    });
  }

  // RGAA
  if (compliance.rgaa_score_percentage || compliance.rgaa_audit_date) {
    let rgaaStatus = 'RGAA Non-conformité';
    if (compliance.rgaa_score_percentage) {
      if (compliance.rgaa_score_percentage === 100)
        rgaaStatus = 'RGAA Conformité totale';
      else if (compliance.rgaa_score_percentage >= 50)
        rgaaStatus = 'RGAA Conformité partielle';
    }

    complianceItems.push({
      applicationId: app.id,
      applicationLabel: app.label,
      type: 'RGAA',
      name: rgaaStatus,
      status: rgaaStatus,
      validityStart:
        compliance.rgaa_audit_date?.toISOString().split('T')[0] || '',
      validityEnd: '',
    });
  }

  // HOMOLOGATION
  if (compliance.homologation_date || compliance.homologation_duration_months) {
    let validityEnd = '';
    if (
      compliance.homologation_date &&
      compliance.homologation_duration_months
    ) {
      const endDate = new Date(compliance.homologation_date);
      endDate.setMonth(
        endDate.getMonth() + compliance.homologation_duration_months,
      );
      validityEnd = endDate.toISOString().split('T')[0];
    }

    complianceItems.push({
      applicationId: app.id,
      applicationLabel: app.label,
      type: 'HOMOLOGATION',
      name: 'Homologation',
      status: compliance.homologation_date ? 'Homologué' : 'En cours',
      validityStart:
        compliance.homologation_date?.toISOString().split('T')[0] || '',
      validityEnd,
    });
  }

  // DSFR
  if (compliance.dsfr_implemented !== null) {
    complianceItems.push({
      applicationId: app.id,
      applicationLabel: app.label,
      type: 'DSFR',
      name: 'DSFR',
      status: compliance.dsfr_implemented ? 'Implémenté' : 'Non implémenté',
      validityStart: '',
      validityEnd: '',
    });
  }

  // RGPD
  if (compliance.rgpd_has_aipd !== null) {
    complianceItems.push({
      applicationId: app.id,
      applicationLabel: app.label,
      type: 'RGPD',
      name: 'RGPD',
      status: compliance.rgpd_has_aipd ? 'AIPD réalisée' : 'AIPD non réalisée',
      validityStart: '',
      validityEnd: '',
    });
  }

  return complianceItems;
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
