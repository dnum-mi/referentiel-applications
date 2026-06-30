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
      "hostings.id": h.id,
      "hostings.label": h.label || "",
      "hostings.provider": h.hostingOption?.provider || "",
      "hostings.site": h.hostingOption?.site || "",
      "hostings.platform": h.hostingOption?.platform || "",
      "hostings.building": h.hostingOption?.building || "",
      "hostings.room": h.hostingOption?.room || "",
    })) ?? []
  );
}

export function mapActors(app: ApplicationWithAllRelations) {
  return (
    app.actors?.map((a) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      "actors.id": a.id,
      "actors.firstname": a.firstname,
      "actors.lastname": a.lastname,
      "actors.role": a.actorType?.code || "",
      "actors.type": a.actorType?.label || "",
      "actors.email": a.email,
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
      "labels.labelSource.source": l.labelSource?.source || "",
      "labels.value": l.value,
    })) ?? []
  );
}

export function mapExternalResources(app: ApplicationWithAllRelations) {
  return (
    app.externalRessource?.map((r) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      "externalRessource.link": r.link,
      "externalRessource.description": r.description,
      "externalRessource.type": translateEnum(
        ExternalRessourceTypeLabels,
        r.type,
      ),
    })) ?? []
  );
}

export function mapReports(app: ApplicationWithAllRelations) {
  return (
    app.reports?.map((n) => ({
      applicationId: app.id,
      applicationLabel: app.label,
      "report.description": n.description,
      "report.status": translateEnum(ReportStatusLabels, n.status),
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
      "relationsAsSource.targetApplication.label": rel.targetApplication?.label,
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
      "relationsAsTarget.sourceApplication.label": rel.sourceApplication?.label,
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
      statusDate: status.statusDate
        ? new Date(status.statusDate).toISOString().split("T")[0]
        : null,
    })) ?? []
  );
}
