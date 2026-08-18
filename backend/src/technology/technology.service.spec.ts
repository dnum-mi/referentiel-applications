// Neutralise une dépendance circulaire préexistante du graphe d'import
// (base.service <-> metadatas.service) qui casse à l'évaluation sous ts-jest.
// Sans incidence ici : toutes les dépendances de TechnologyService sont mockées.
jest.mock("src/metadatas/metadatas.service", () => ({
  MetadatasService: class {},
}));

import { ConflictException, NotFoundException } from "@nestjs/common";
import { ApplicationService } from "src/applications/application.service";
import { ApplicationSearchService } from "src/applications/search/application-search.service";
import { MetadatasService } from "src/metadatas/metadatas.service";
import { PrismaService } from "src/prisma/prisma.service";
import { TechnologyService } from "./technology.service";

// La stack technique fait partie du document de recherche des fiches : toute
// mutation doit planifier un rafraîchissement de l'index full-text, sans quoi
// la technologie n'apparaît dans la recherche qu'au cron périodique.
describe("TechnologyService — rafraîchissement de l'index de recherche", () => {
  const existing = {
    id: "tech-1",
    applicationId: "app-1",
    technology: "Base de données",
    product: "PostgreSQL",
    version: "15.5",
  };

  const makeService = () => {
    const technologyStack = {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue(existing),
      delete: jest.fn().mockResolvedValue(existing),
    };
    const prisma = {
      technologyStack,
      application: {
        findUnique: jest.fn().mockResolvedValue({ id: "app-1" }),
      },
    };
    const searchService = { scheduleRefresh: jest.fn() };
    const applicationService = { updateApplicationQuality: jest.fn() };
    const service = new TechnologyService(
      prisma as unknown as PrismaService,
      {} as MetadatasService,
      applicationService as unknown as ApplicationService,
      searchService as unknown as ApplicationSearchService,
    );
    return { service, prisma, searchService };
  };

  it("planifie un refresh après la création d'une technologie", async () => {
    const { service, prisma, searchService } = makeService();
    prisma.technologyStack.findUnique.mockResolvedValue(null);

    await service.createTechnology("app-1", {
      technology: "Base de données",
      product: "PostgreSQL",
      version: "15.5",
    });

    expect(searchService.scheduleRefresh).toHaveBeenCalledTimes(1);
  });

  it("ne planifie PAS de refresh si la création échoue (conflit)", async () => {
    const { service, prisma, searchService } = makeService();
    prisma.technologyStack.findUnique.mockResolvedValue(existing);

    await expect(
      service.createTechnology("app-1", {
        technology: "Base de données",
        product: "PostgreSQL",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(searchService.scheduleRefresh).not.toHaveBeenCalled();
  });

  it("planifie un refresh après la mise à jour d'une technologie", async () => {
    const { service, prisma, searchService } = makeService();
    prisma.technologyStack.findUnique.mockResolvedValue(existing);

    await service.updateTechnology("tech-1", "app-1", { version: "16" });

    expect(searchService.scheduleRefresh).toHaveBeenCalledTimes(1);
  });

  it("ne planifie PAS de refresh si la technologie à mettre à jour est introuvable", async () => {
    const { service, prisma, searchService } = makeService();
    prisma.technologyStack.findUnique.mockResolvedValue(null);

    await expect(
      service.updateTechnology("tech-1", "app-1", { version: "16" }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(searchService.scheduleRefresh).not.toHaveBeenCalled();
  });

  it("planifie un refresh après la suppression d'une technologie", async () => {
    const { service, prisma, searchService } = makeService();
    prisma.technologyStack.findUnique.mockResolvedValue(existing);

    await service.deleteTechnology("tech-1", "app-1");

    expect(searchService.scheduleRefresh).toHaveBeenCalledTimes(1);
  });
});
