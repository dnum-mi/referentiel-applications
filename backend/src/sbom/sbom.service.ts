import { createHash, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type SbomImport } from "@prisma/client";
import { Cron } from "@nestjs/schedule";
import { PackageURL } from "packageurl-js";
import { PrismaService } from "src/prisma/prisma.service";
import { parseSbom } from "./sbom-parser";
import type { ParsedSbom, SbomComponent } from "./sbom.types";
import { SBOM_LIMITS } from "./sbom-limits";
import type {
  PreviewSbomDto,
  SoftwareComponentsQueryDto,
  UpdateSbomSourceDto,
} from "./sbom.dto";

type ComparisonComponent = Pick<SbomComponent, "ref" | "product" | "version">;
type Changes = {
  added: ComparisonComponent[];
  removed: ComparisonComponent[];
  changed: { before: ComparisonComponent; after: ComparisonComponent }[];
  unchanged: number;
};

function comparable(component: SbomComponent): ComparisonComponent {
  return {
    ref: component.ref,
    product: component.product,
    version: component.version,
  };
}

function packageIdentity(component: SbomComponent) {
  if (component.purl) {
    try {
      const purl = PackageURL.fromString(component.purl);
      return JSON.stringify([
        purl.type,
        purl.namespace,
        purl.name,
        purl.qualifiers,
        purl.subpath,
      ]);
    } catch {
      /* Les composants incomplets restent distincts par leur référence. */
    }
  }
  return JSON.stringify([component.ref, component.type, component.product]);
}

/** Diff multiensemble : les occurrences et les versions coexistantes sont préservées. */
export function compareComponents(
  before: SbomComponent[],
  after: SbomComponent[],
): Changes {
  const exact = (component: SbomComponent) =>
    JSON.stringify([
      packageIdentity(component),
      component.version,
      component.purl,
      component.technology,
      component.product,
      component.type,
    ]);
  const remaining = new Map<string, { items: SbomComponent[]; used: number }>();
  for (const component of before) {
    const key = exact(component);
    const bucket = remaining.get(key) ?? { items: [], used: 0 };
    bucket.items.push(component);
    remaining.set(key, bucket);
  }
  const additions: SbomComponent[] = [];
  let unchanged = 0;
  for (const component of after) {
    const bucket = remaining.get(exact(component));
    if (!bucket || bucket.used === bucket.items.length)
      additions.push(component);
    else {
      bucket.used++;
      unchanged++;
    }
  }
  const byPackage = new Map<string, { items: SbomComponent[]; used: number }>();
  for (const bucket of remaining.values()) {
    for (let i = bucket.used; i < bucket.items.length; i++) {
      const component = bucket.items[i];
      const key = packageIdentity(component);
      const group = byPackage.get(key) ?? { items: [], used: 0 };
      group.items.push(component);
      byPackage.set(key, group);
    }
  }
  const changed: Changes["changed"] = [];
  const added: ComparisonComponent[] = [];
  for (const component of additions) {
    const bucket = byPackage.get(packageIdentity(component));
    const previous = bucket && bucket.items[bucket.used++];
    if (previous)
      changed.push({
        before: comparable(previous),
        after: comparable(component),
      });
    else added.push(comparable(component));
  }
  const removed = [...byPackage.values()].flatMap((bucket) =>
    bucket.items.slice(bucket.used),
  );
  return { added, removed: removed.map(comparable), changed, unchanged };
}

// Ces JSON sont écrits exclusivement après validation par parseSbom ; aucune entrée
// client n'est convertie par assertion sans avoir passé le schéma.
function documentOf(record: SbomImport) {
  return record.document as unknown as ParsedSbom & {
    snapshotImportId?: string;
  };
}
function inventoryOf(document: ParsedSbom) {
  return document.components.filter(
    (component) => component.context === "inventory",
  );
}

const historySelect = {
  id: true,
  createdAt: true,
  format: true,
  specVersion: true,
  componentCount: true,
  status: true,
} satisfies Prisma.SbomImportSelect;
const confirmedStatuses = ["committed", "unchanged"] as const;

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class SbomService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureApplication(applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    if (!application) throw new NotFoundException("Application introuvable.");
  }

  async preview(
    applicationId: string,
    userId: string,
    buffer: Buffer,
    dto: PreviewSbomDto,
  ) {
    await this.ensureApplication(applicationId);
    const parsed = parseSbom(buffer, SBOM_LIMITS);
    const projectVersion = dto.projectVersion?.trim() || parsed.projectVersion;
    if (projectVersion && projectVersion.length > 255)
      throw new BadRequestException("Version du projet trop longue.");
    const source = await this.prisma.sbomSource.findUnique({
      where: { applicationId_name: { applicationId, name: dto.sourceName } },
      include: { currentImport: true },
    });
    const before =
      source?.active && source.currentImport
        ? inventoryOf(documentOf(source.currentImport))
        : [];
    const components = inventoryOf(parsed);
    const changes = compareComponents(before, components);
    const context = dto.context?.trim() || null;
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([parsed.fingerprint, context, projectVersion]))
      .digest("hex");
    const unchanged = Boolean(
      source?.active && source.currentImport?.fingerprint === fingerprint,
    );
    const record = await this.prisma.sbomImport.create({
      data: {
        applicationId,
        sourceId: source?.id,
        sourceName: dto.sourceName,
        context,
        projectVersion,
        format: parsed.format,
        specVersion: parsed.specVersion,
        fingerprint,
        fileHash: createHash("sha256").update(buffer).digest("hex"),
        baseRevision: source?.revision ?? 0,
        createdBy: userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        componentCount: components.length,
        document: json(parsed),
        report: json({ changes, unchanged }),
      },
    });
    return this.summary(record);
  }

  private summary(record: SbomImport) {
    const report = record.report as unknown as {
      changes: Changes;
      unchanged: boolean;
    };
    return {
      id: record.id,
      sourceName: record.sourceName,
      baseRevision: record.baseRevision,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      status: record.status,
      format: record.format,
      specVersion: record.specVersion,
      projectVersion: record.projectVersion,
      warnings: documentOf(record).warnings,
      totalComponents: record.componentCount,
      unchanged: report.unchanged,
      changes: report.changes,
      counts: {
        added: report.changes.added.length,
        removed: report.changes.removed.length,
        changed: report.changes.changed.length,
        unchanged: report.changes.unchanged,
      },
    };
  }

  /** Le verrou applicatif sérialise créations de sources, commits et désactivations. */
  private async lock(
    tx: Pick<Prisma.TransactionClient, "$queryRaw">,
    applicationId: string,
  ) {
    const rows = await tx.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT id FROM "Application" WHERE id = ${applicationId} FOR UPDATE`,
    );
    if (!rows.length) throw new NotFoundException("Application introuvable.");
  }

  async commit(applicationId: string, importId: string, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.lock(tx, applicationId);
        const record = await tx.sbomImport.findFirst({
          where: { id: importId, applicationId },
        });
        if (!record) throw new NotFoundException("Analyse introuvable.");
        if (record.status !== "preview") {
          return {
            id: record.id,
            sourceId: record.sourceId,
            revision: record.resultRevision,
            unchanged: record.status === "unchanged",
          };
        }
        if (record.expiresAt.getTime() <= Date.now())
          throw new GoneException(
            "Cette analyse a expiré. Analysez à nouveau le fichier.",
          );
        let source = await tx.sbomSource.findUnique({
          where: {
            applicationId_name: { applicationId, name: record.sourceName },
          },
          include: { currentImport: true },
        });
        if ((source?.revision ?? 0) !== record.baseRevision) {
          throw new ConflictException(
            "La source a changé depuis l’analyse. Analysez à nouveau le fichier.",
          );
        }
        if (!source) {
          source = await tx.sbomSource.create({
            data: {
              applicationId,
              name: record.sourceName,
              context: record.context,
            },
            include: { currentImport: true },
          });
        }
        const unchanged =
          source.active &&
          source.currentImport?.fingerprint === record.fingerprint;
        if (unchanged) {
          await tx.sbomImport.update({
            where: { id: record.id },
            data: {
              sourceId: source.id,
              status: "unchanged",
              committedAt: new Date(),
              committedBy: userId,
              resultRevision: source.revision,
              // Le snapshot immuable reste la référence ; ne pas dupliquer son JSON à chaque synchronisation.
              document: json({
                ...documentOf(record),
                components: [],
                relations: [],
                snapshotImportId: source.currentImportId,
              }),
            },
          });
          await tx.sbomSource.update({
            where: { id: source.id },
            data: { updatedAt: new Date() },
          });
          return {
            id: record.id,
            sourceId: source.id,
            revision: source.revision,
            unchanged: true,
          };
        }
        const components = inventoryOf(documentOf(record));
        // Batches bornés : 50 000 composants ne doivent pas dépasser les paramètres PostgreSQL.
        for (let offset = 0; offset < components.length; offset += 1000) {
          await tx.sbomComponent.createMany({
            data: components.slice(offset, offset + 1000).map((component) => ({
              ref: component.ref,
              product: component.product,
              version: component.version,
              purl: component.purl,
              ecosystem: component.ecosystem,
              type: component.type,
              technology: component.technology,
              identificationStatus: component.identificationStatus,
              id: randomUUID(),
              importId: record.id,
            })),
          });
        }
        const revision = source.revision + 1;
        await tx.sbomImport.update({
          where: { id: record.id },
          data: {
            sourceId: source.id,
            status: "committed",
            committedAt: new Date(),
            committedBy: userId,
            resultRevision: revision,
          },
        });
        await tx.sbomSource.update({
          where: { id: source.id },
          data: {
            currentImportId: record.id,
            active: true,
            context: record.context,
            revision,
          },
        });
        const inventory = await tx.sbomInventory.upsert({
          where: { applicationId },
          create: { applicationId, revision: 1 },
          update: { revision: { increment: 1 } },
        });
        await tx.inventoryEvent.create({
          data: {
            applicationId,
            revision: inventory.revision,
            payload: json({
              applicationId,
              inventoryRevision: inventory.revision,
              sourceId: source.id,
              importId: record.id,
              previousImportId: source.currentImportId,
              sourceRevision: revision,
              action: "import",
              actorId: userId,
              changes: (record.report as unknown as { changes: Changes })
                .changes,
            }),
          },
        });
        return {
          id: record.id,
          sourceId: source.id,
          revision,
          unchanged: false,
        };
      },
      { maxWait: 10_000, timeout: 120_000 },
    );
  }

  async sources(applicationId: string) {
    await this.ensureApplication(applicationId);
    const sources = await this.prisma.sbomSource.findMany({
      where: { applicationId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            imports: { where: { status: { in: [...confirmedStatuses] } } },
          },
        },
        currentImport: { select: { componentCount: true } },
        imports: {
          where: { status: { in: [...confirmedStatuses] } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
          select: historySelect,
        },
      },
    });
    return sources.map(({ currentImport, _count, ...source }) => ({
      ...source,
      importCount: _count.imports,
      componentCount: source.active ? (currentImport?.componentCount ?? 0) : 0,
    }));
  }

  async sourceHistory(
    applicationId: string,
    sourceId: string,
    query: SoftwareComponentsQueryDto,
  ) {
    const source = await this.prisma.sbomSource.findFirst({
      where: { id: sourceId, applicationId },
      select: { id: true },
    });
    if (!source) throw new NotFoundException("Source introuvable.");
    const where: Prisma.SbomImportWhereInput = {
      applicationId,
      sourceId,
      status: { in: [...confirmedStatuses] },
    };
    const [total, results] = await this.prisma.$transaction([
      this.prisma.sbomImport.count({ where }),
      this.prisma.sbomImport.findMany({
        where,
        select: historySelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: query.page * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { total, results };
  }

  /** Nettoyage borné ; aucun snapshot confirmé ni sa preuve d'import n'est supprimé. */
  @Cron("*/10 * * * *")
  async cleanupExpiredPreviews() {
    const expired: Prisma.SbomImportWhereInput = {
      status: "preview",
      expiresAt: { lte: new Date() },
    };
    const candidates = await this.prisma.sbomImport.findMany({
      where: expired,
      select: { id: true },
      orderBy: { expiresAt: "asc" },
      take: 100,
    });
    if (!candidates.length) return { count: 0 };
    // Le prédicat est revérifié lors du DELETE pour éviter toute suppression d'un commit concurrent.
    return this.prisma.sbomImport.deleteMany({
      where: { ...expired, id: { in: candidates.map(({ id }) => id) } },
    });
  }

  async importDetail(applicationId: string, id: string) {
    const record = await this.prisma.sbomImport.findFirst({
      where: { id, applicationId },
    });
    if (!record) throw new NotFoundException("Import introuvable.");
    let document = documentOf(record);
    if (document.snapshotImportId) {
      const snapshot = await this.prisma.sbomImport.findFirst({
        where: {
          id: document.snapshotImportId,
          applicationId,
          status: "committed",
        },
      });
      if (!snapshot)
        throw new NotFoundException("Snapshot de référence introuvable.");
      document = documentOf(snapshot);
    }
    return {
      ...this.summary(record),
      components: document.components,
      relations: document.relations,
    };
  }

  async components(applicationId: string, query: SoftwareComponentsQueryDto) {
    await this.ensureApplication(applicationId);
    const where: Prisma.SbomComponentWhereInput = {
      import: { currentFor: { is: { applicationId, active: true } } },
      ...(query.search
        ? {
            OR: ["product", "version", "purl"].map((key) => ({
              [key]: { contains: query.search, mode: "insensitive" },
            })),
          }
        : {}),
    };
    const [total, components] = await this.prisma.$transaction([
      this.prisma.sbomComponent.count({ where }),
      this.prisma.sbomComponent.findMany({
        where,
        orderBy: [{ product: "asc" }, { version: "asc" }, { id: "asc" }],
        skip: query.page * query.pageSize,
        take: query.pageSize,
        include: { import: { select: { sourceName: true } } },
      }),
    ]);
    return {
      total,
      results: components.map(({ import: imported, ...component }) => ({
        ...component,
        context: "inventory" as const,
        sourceName: imported.sourceName,
      })),
    };
  }

  async updateSource(
    applicationId: string,
    sourceId: string,
    userId: string,
    dto: UpdateSbomSourceDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.lock(tx, applicationId);
        const source = await tx.sbomSource.findFirst({
          where: { id: sourceId, applicationId },
          include: { currentImport: true },
        });
        if (!source) throw new NotFoundException("Source introuvable.");
        if (source.revision !== dto.revision)
          throw new ConflictException(
            "La source a changé. Actualisez la prévisualisation.",
          );
        const affected =
          source.active !== dto.active
            ? (source.currentImport?.componentCount ?? 0)
            : 0;
        if (dto.preview)
          return {
            removed: dto.active ? 0 : affected,
            added: dto.active ? affected : 0,
            revision: source.revision,
          };
        if (source.active === dto.active)
          return { id: source.id, revision: source.revision };
        const revision = source.revision + 1;
        await tx.sbomSource.update({
          where: { id: sourceId },
          data: { active: dto.active, revision },
        });
        const inventory = await tx.sbomInventory.upsert({
          where: { applicationId },
          create: { applicationId, revision: 1 },
          update: { revision: { increment: 1 } },
        });
        await tx.inventoryEvent.create({
          data: {
            applicationId,
            revision: inventory.revision,
            payload: json({
              applicationId,
              inventoryRevision: inventory.revision,
              sourceId,
              importId: source.currentImportId,
              sourceRevision: revision,
              actorId: userId,
              action: dto.active ? "activate" : "deactivate",
              components: source.currentImport
                ? inventoryOf(documentOf(source.currentImport)).map(comparable)
                : [],
            }),
          },
        });
        return { id: source.id, revision };
      },
      { maxWait: 10_000, timeout: 120_000 },
    );
  }
}
