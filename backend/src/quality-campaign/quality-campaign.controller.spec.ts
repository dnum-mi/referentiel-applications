import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Permission } from "@prisma/client";
import request from "supertest";
import { CheckPermissions } from "src/common/service/check-permissions.service";
import { setupGlobalValidation } from "src/config/app-config";
import { QualityCampaignController } from "./quality-campaign.controller";
import { QualityCampaignService } from "./quality-campaign.service";

describe("QualityCampaignController — targets HTTP contract", () => {
  let app: INestApplication;
  const findTargets = jest.fn();
  const can = jest.fn();
  const user = { id: "delegate" };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [QualityCampaignController],
      providers: [
        { provide: QualityCampaignService, useValue: { findTargets } },
        { provide: CheckPermissions, useValue: { can } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use((req, _res, next) => {
      req.user = user;
      next();
    });
    setupGlobalValidation(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    findTargets.mockReset().mockResolvedValue({ results: [], total: 0 });
    can.mockReset().mockResolvedValue(true);
  });
  it("requires the campaign delegation and never calls the service on denial", async () => {
    can.mockResolvedValue(false);
    await request(app.getHttpServer())
      .get("/quality-campaigns/campaign/targets")
      .expect(403);
    expect(can).toHaveBeenCalledWith(
      [Permission.QualityCampaignManage],
      user,
      undefined,
    );
    expect(findTargets).not.toHaveBeenCalled();
  });
  it("transforms pagination and forwards the authenticated user", async () => {
    await request(app.getHttpServer())
      .get(
        "/quality-campaigns/campaign/targets?page=2&pageSize=5&order=desc&progression=positive&sortBy=iqCurrent",
      )
      .expect(200, { results: [], total: 0 });
    expect(findTargets).toHaveBeenCalledWith(
      "campaign",
      {
        page: 2,
        pageSize: 5,
        order: "desc",
        progression: "positive",
        sortBy: "iqCurrent",
      },
      user,
    );
  });
  it.each([
    "page=-1",
    "page=0.5",
    "pageSize=0",
    "pageSize=101",
    "pageSize=foo",
    "order=invalid",
    "sortBy=invalid",
    "progression=invalid",
  ])("rejects invalid query %s", async (query) => {
    await request(app.getHttpServer())
      .get(`/quality-campaigns/campaign/targets?${query}`)
      .expect(400);
    expect(findTargets).not.toHaveBeenCalled();
  });
});
