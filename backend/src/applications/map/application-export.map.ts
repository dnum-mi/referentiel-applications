import type { ApplicationWithAllRelations } from "src/applications/types/application.type";
import { translateEnum } from "src/common/utils/enum.utils";
import {
  ReportStatusLabels,
  ApplicationStatusLabels,
  ExternalRessourceTypeLabels,
  PriorityRestartLabels,
} from "src/applications/constants/enum-label";
import { RelationTypeLabelsBidirectional } from "src/applications/constants/relation-type-labels";

export function getFullField(
  app: ApplicationWithAllRelations,
  field: string,
): string {
  const value = field.split(".").reduce((obj, key) => obj?.[key], app);

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (field === "hostings" && Array.isArray(app.hostings)) {
    return app.hostings
      .map((h) => {
        const provider = h.hostingOption?.provider ?? "";
        const site = h.hostingOption?.site ? ` (${h.hostingOption.site})` : "";
        return `${provider}${site}`;
      })
      .join(", ");
  }

  return value ? JSON.stringify(value) : "";
}

export function mapApplications(apps: ApplicationWithAllRelations[]) {
  return apps.map((app) => ({
    id: app.id,
    label: app.label,
    shortName: app.shortName ?? "",
    logo: app.logo ?? "",
    description: app.description,
    tags: app.tags?.map((tag) => tag.name).join(", ") ?? "",
    purposes: app.purposes?.join(", ") ?? "",
    targetPopulations: app.targetPopulations?.join(", ") ?? "",
    priorityRestart: translateEnum(PriorityRestartLabels, app.priorityRestart),
    currentStatusId: app.currentStatusId ?? "",
  }));
}

export function mapHostings(app: ApplicationWithAllRelations) {
  return (
    app.hostings?.map((h) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      label: h.label || "",
      provider: h.hostingOption?.provider || "",
      site: h.hostingOption?.site || "",
      platform: h.hostingOption?.platform || "",
      building: h.hostingOption?.building || "",
      room: h.hostingOption?.room || "",
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
      type: a.actorType?.label || "",
      email: a.email,
    })) ?? []
  );
}

function translateBoolean(value: boolean | null | undefined): string | null {
  if (value === true) return "Oui";
  if (value === false) return "Non";
  return null;
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
      dima_is_hno: translateBoolean(compliance.dima_is_hno),
      dima_recovery_plan: translateBoolean(compliance.dima_recovery_plan),
      dsfr_implemented: translateBoolean(compliance.dsfr_implemented),
      rgpd_has_aipd: translateBoolean(compliance.rgpd_has_aipd),
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

export function mapReports(app: ApplicationWithAllRelations) {
  return (
    app.reports?.map((n) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      description: n.description,
      status: translateEnum(ReportStatusLabels, n.status),
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

export function mapStatuses(app: ApplicationWithAllRelations) {
  return (
    app.statuses?.map((status) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      status: translateEnum(ApplicationStatusLabels, status.status),
      statusDate: new Date(status.statusDate).toISOString().split("T")[0],
    })) ?? []
  );
}
