import { BaseService } from "src/common/base.service";
import type { HostingOptionService } from "src/hosting-option/hosting-option.service";
import type { LabelsService } from "src/labels/labels.service";
import type { PrismaService } from "src/prisma/prisma.service";
import type { Tag } from "src/tag/entities/tag.entity";
import type { TagsService } from "src/tag/tags.service";
import type { TechnicalDebtInfoService } from "src/technical-debt-info/technical-debt-info.service";

// Contrat vérifié par `pnpm type-check`, sans exécution ni accès à la base.
// Une régression vers des arguments non typés rend les @ts-expect-error inutilisés.
export function checkBaseServiceTypes(
  prisma: PrismaService,
  tags: TagsService,
  labels: LabelsService,
  hostingOptions: HostingOptionService,
  technicalDebt: TechnicalDebtInfoService,
) {
  new BaseService<Tag, PrismaService["tag"]>(prisma.tag, prisma);
  // @ts-expect-error Le délégué d'un autre modèle ne peut pas être injecté.
  new BaseService<Tag, PrismaService["tag"]>(prisma.label, prisma);

  void tags.create({ name: "Exemple" });
  void tags.update("tag-id", { name: { set: "Renommé" } });
  void tags.findOne("tag-id", { applications: { select: { id: true } } });
  void tags.findAll({ where: { name: { contains: "Ex" } }, pageSize: 10 });
  void tags.delete("tag-id", { include: { applications: true } });

  // @ts-expect-error Le nom d'un tag est obligatoire à la création.
  void tags.create({});
  // @ts-expect-error Le nom doit rester une chaîne.
  void tags.update("tag-id", { name: 42 });
  // @ts-expect-error Ce champ appartient aux labels, pas aux tags.
  void tags.update("tag-id", { value: "Invalide" });
  // @ts-expect-error Les filtres restent spécifiques au modèle.
  void tags.findAll({ where: { value: "Invalide" } });
  // @ts-expect-error Une relation inconnue ne peut pas être chargée.
  void tags.findOne("tag-id", { labelSource: true });
  // @ts-expect-error Le select imbriqué est également contrôlé.
  void tags.findOne("tag-id", { applications: { select: { unknown: true } } });
  // @ts-expect-error Les includes de création restent spécifiques au modèle.
  void tags.create({ name: "Exemple" }, { include: { labelSource: true } });
  // @ts-expect-error Les includes de mise à jour restent spécifiques au modèle.
  void tags.update("tag-id", {}, { include: { labelSource: true } });
  // @ts-expect-error Les includes de suppression restent spécifiques au modèle.
  void tags.delete("tag-id", { include: { labelSource: true } });

  void labels.create({ value: "Alias", applicationId: "application-id" });
  void labels.create({
    value: "Alias",
    application: { connect: { id: "application-id" } },
  });
  // @ts-expect-error Le lien à une application reste obligatoire.
  void labels.create({ value: "Alias" });
  void labels.create({
    value: "Alias",
    // @ts-expect-error Une relation imbriquée ne permet pas des champs inconnus.
    application: { connect: { name: "X" } },
  });

  void hostingOptions.create({
    provider: "Test",
    platform: "Test",
    site: "Test",
  });
  // @ts-expect-error Les champs requis des autres services sont conservés.
  void hostingOptions.create({ site: "Test" });

  void technicalDebt.create({
    applicationId: "application-id",
    technicalMaturity: 3,
  });
  // @ts-expect-error Une surcharge de create ne doit pas perdre le typage.
  void technicalDebt.create({ unknown: true });
}
