import type { ApplicationType } from "@prisma/client";
import { ApplicationStatusLabels } from "./constants/enum-label";
import type { ProductCard } from "./product-export.service";

const typeLabels = {
  business: "Application métier",
  core_service: "Service socle",
  intranet_citizen: "Intranet citoyen",
  intranet_staff: "Intranet agent",
  data_hub: "Hub de données",
} satisfies Record<ApplicationType, string>;

export const missingProductValue = "Non renseigné";

/** Le même périmètre et les mêmes libellés alimentent les formats PPTX/HTML. */
export function productExportView(application: ProductCard) {
  const value = (text: string | null) =>
    text?.trim() ? text : missingProductValue;
  return {
    title: application.label,
    status: application.currentStatus
      ? ApplicationStatusLabels[application.currentStatus.status]
      : missingProductValue,
    facts: [
      { title: "Nom court", value: value(application.shortName), lines: 2 },
      { title: "Identifiant", value: application.id, lines: 2 },
      {
        title: "Directions métier",
        value: value(
          application.businessDivisions
            .map((division) => division.label)
            .join(" · "),
        ),
        lines: 3,
      },
      {
        title: "Type",
        value: application.type
          ? typeLabels[application.type]
          : missingProductValue,
        lines: 2,
      },
      {
        title: "Noms alternatifs",
        value: value(
          application.labels.map((label) => label.value).join(" · "),
        ),
        lines: 3,
      },
      {
        title: "Tags",
        value: value(application.tags.map((tag) => tag.name).join(" · ")),
        lines: 3,
      },
    ],
    description: value(application.description),
    purposes: value(application.purposes.join("\n")),
    targetPopulations: value(application.targetPopulations.join("\n")),
    quality:
      application.quality === null
        ? missingProductValue
        : `${application.quality} %`,
    clients: missingProductValue,
    customerRelationship: missingProductValue,
    costs: "Non renseignés dans RefApp",
  };
}
