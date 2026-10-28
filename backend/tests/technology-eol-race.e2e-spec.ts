// Le graphe BaseService / MetadatasService est circulaire ; ces tests ne font
// appel qu'aux lectures et écritures EOL sur le vrai client Prisma.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

const resolveProductReleases = jest.fn<Promise<EolResolution>, [string]>();
jest.mock("src/technology/utils/endoflife.utils", () => ({
  ...jest.requireActual("src/technology/utils/endoflife.utils"),
  isEndoflifeDisabled: () => false,
  resolveProductReleases: (product: string) => resolveProductReleases(product),
}));

import { ConfigService } from "@nestjs/config";
import { Prisma, TechnologyEolSource } from "@prisma/client";
import { ApplicationService } from "src/applications/application.service";
import { ApplicationSearchService } from "src/applications/search/application-search.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { EolRefreshService } from "src/technology/eol-refresh.service";
import { TechnologyService } from "src/technology/technology.service";
import type { EolResolution } from "src/technology/utils/endoflife.utils";
import { getPrismaClient } from "./fakers/prisma";

const resolved: EolResolution = {
  status: "resolved",
  slug: "postgresql",
  releases: [{ name: "13", eolFrom: "2020-01-01" }],
};

const fresh = new Date("2026-10-28T10:00:00.000Z");
const futureEol = new Date("2035-01-01");
const changes = [
  {
    name: "version et résolution mises à jour",
    data: {
      version: "15",
      eolCycle: "15",
      eolDate: futureEol,
      eolCheckedAt: fresh,
    },
  },
  {
    name: "produit changé sans nouvelle résolution",
    data: { product: "Redis", version: "7", eolCheckedAt: null },
  },
  {
    name: "version changée sans nouvelle résolution",
    data: { version: "15", eolCheckedAt: null },
  },
  {
    name: "résolution concurrente à entrées identiques",
    data: { eolCheckedAt: fresh, eolDate: futureEol, latestVersion: "13.16" },
  },
  {
    name: "échéance modifiée sans changement d'horodatage",
    data: { eolDate: futureEol },
  },
  {
    name: "saisie manuelle",
    data: {
      eolSource: TechnologyEolSource.manual,
      eolDate: futureEol,
      eolCheckedAt: fresh,
    },
  },
] satisfies { name: string; data: Prisma.TechnologyStackUpdateInput }[];

describe.each(["cron", "lecture"] as const)(
  "Technologies — résolution EOL obsolète par %s (#2944)",
  (mode) => {
    const prisma = getPrismaClient();
    const refresh = new EolRefreshService(
      prisma as unknown as PrismaService,
      new ConfigService(),
    );
    const service = new TechnologyService(
      prisma as unknown as PrismaService,
      {} as MetadatasService,
      {} as ApplicationService,
      {} as ApplicationSearchService,
    );
    let applicationId: string;
    let technologyId: string;

    beforeEach(async () => {
      resolveProductReleases.mockReset();
      const application = await prisma.application.create({
        data: {
          label: "Course EOL #2944",
          description: "Résolution différée et édition concurrente",
        },
      });
      applicationId = application.id;
      const status = await prisma.applicationStatus.create({
        data: { applicationId, status: "in_production" },
      });
      await prisma.application.update({
        where: { id: applicationId },
        data: { currentStatusId: status.id },
      });
      const technology = await prisma.technologyStack.create({
        data: {
          applicationId,
          technology: "Base de données",
          product: "PostgreSQL",
          version: "13",
          eolCheckedAt: null,
        },
      });
      technologyId = technology.id;
    });

    afterEach(async () => {
      if (applicationId) {
        await prisma.application.deleteMany({ where: { id: applicationId } });
      }
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    // L'édition a réellement lieu après la lecture initiale et avant le retour
    // réseau. Le prédicat est évalué par PostgreSQL, pas par un mock de Prisma.
    async function startPendingResolution() {
      let release!: (resolution: EolResolution) => void;
      let started!: () => void;
      const requested = new Promise<void>((resolve) => {
        started = resolve;
      });
      resolveProductReleases.mockImplementationOnce(
        () =>
          new Promise<EolResolution>((resolve) => {
            release = resolve;
            started();
          }),
      );
      const pending =
        mode === "cron"
          ? refresh.runRefreshSafely()
          : service.findAllByApplicationId(applicationId);
      await requested;
      return { release, pending };
    }

    it.each(changes)(
      "préserve l'état courant après $name sans réarmer son TTL",
      async ({ data }) => {
        const { release, pending } = await startPendingResolution();
        const expected = await prisma.technologyStack.update({
          where: { id: technologyId },
          data,
        });
        release(resolved);
        const response = await pending;
        expect(
          await prisma.technologyStack.findUnique({
            where: { id: technologyId },
          }),
        ).toEqual(expected);
        if (Array.isArray(response)) {
          expect(response).toEqual([expect.objectContaining(expected)]);
        } else {
          expect(response).toMatchObject({ stale: 1, updated: 0 });
        }
      },
    );

    it("ignore aussi un ancien résultat « produit non suivi »", async () => {
      const { release, pending } = await startPendingResolution();
      const expected = await prisma.technologyStack.update({
        where: { id: technologyId },
        data: {
          product: "Redis",
          version: "7",
          eolProduct: "redis",
          eolCycle: "7",
          eolDate: futureEol,
          eolCheckedAt: fresh,
        },
      });
      release({ status: "unknown-product" });
      const response = await pending;
      expect(
        await prisma.technologyStack.findUnique({
          where: { id: technologyId },
        }),
      ).toEqual(expected);
      if (Array.isArray(response)) {
        expect(response).toEqual([expect.objectContaining(expected)]);
      } else {
        expect(response).toMatchObject({ updated: 0 });
      }
    });

    it("ne restitue pas une ligne supprimée pendant la résolution", async () => {
      const { release, pending } = await startPendingResolution();
      await prisma.technologyStack.delete({ where: { id: technologyId } });
      release(resolved);
      const response = await pending;
      expect(
        await prisma.technologyStack.findUnique({
          where: { id: technologyId },
        }),
      ).toBeNull();
      if (Array.isArray(response)) expect(response).toEqual([]);
      else expect(response).toMatchObject({ updated: 0 });
    });

    it("ne réécrit ni ne restitue une ligne déplacée dans une autre application", async () => {
      const other = await prisma.application.create({
        data: { label: "Autre application", description: "Autre périmètre" },
      });
      try {
        const { release, pending } = await startPendingResolution();
        const expected = await prisma.technologyStack.update({
          where: { id: technologyId },
          data: { applicationId: other.id },
        });
        release(resolved);
        const response = await pending;
        expect(
          await prisma.technologyStack.findUnique({
            where: { id: technologyId },
          }),
        ).toEqual(expected);
        if (Array.isArray(response)) expect(response).toEqual([]);
        else expect(response).toMatchObject({ updated: 0 });
      } finally {
        await prisma.application.delete({ where: { id: other.id } });
      }
    });

    it("persiste une résolution dont l'instantané est resté inchangé", async () => {
      const { release, pending } = await startPendingResolution();
      release(resolved);
      const response = await pending;
      const actual = await prisma.technologyStack.findUniqueOrThrow({
        where: { id: technologyId },
      });
      expect(actual).toMatchObject({
        version: "13",
        eolProduct: "postgresql",
        eolCycle: "13",
        eolDate: new Date("2020-01-01"),
        eolCheckedAt: expect.any(Date),
      });
      if (Array.isArray(response)) {
        expect(response).toEqual([expect.objectContaining(actual)]);
      } else {
        expect(response).toMatchObject({ updated: 1 });
      }
    });
  },
);
