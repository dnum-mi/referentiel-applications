import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { setupGlobalValidation } from "src/config/app-config";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

describe("OrganizationsController — contrat HTTP du tri", () => {
  let app: INestApplication;
  const find = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        { provide: OrganizationsService, useValue: { find } },
        { provide: CheckPermissions, useValue: { can: jest.fn() } },
      ],
    }).compile();
    app = module.createNestApplication();
    setupGlobalValidation(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    find.mockReset().mockResolvedValue({ results: [], total: 0 });
  });

  it.each([
    ["path", "asc"],
    ["path", "desc"],
    ["sigle", "asc"],
    ["sigle", "desc"],
  ] as const)(
    "conserve le tri hérité %s %s et transforme la pagination",
    async (sortBy, order) => {
      await request(app.getHttpServer())
        .get("/organizations")
        .query({ page: 2, pageSize: 5, search: "DNUM", sortBy, order })
        .expect(200, { results: [], total: 0 });

      expect(find).toHaveBeenCalledWith({
        page: 2,
        pageSize: 5,
        search: "DNUM",
        sortBy,
        order,
      });
    },
  );

  it("conserve les appels sans tri explicite", async () => {
    await request(app.getHttpServer()).get("/organizations").expect(200);

    expect(find).toHaveBeenCalledWith({ pageSize: 50 });
  });

  it("conserve la sélection d'identifiants sans pagination", async () => {
    await request(app.getHttpServer())
      .get("/organizations")
      .query({ ids: "first,second", pageSize: 0 })
      .expect(200);

    expect(find).toHaveBeenCalledWith({
      ids: ["first", "second"],
      pageSize: 0,
    });
  });

  it.each(["order=invalid", "sortBy=path&sortBy=sigle"])(
    "refuse une entrée de tri invalide : %s",
    async (query) => {
      await request(app.getHttpServer())
        .get(`/organizations?${query}`)
        .expect(400);

      expect(find).not.toHaveBeenCalled();
    },
  );
});
