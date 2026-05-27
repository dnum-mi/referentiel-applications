import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { HostingOptionFaker } from "./fakers/hosting-option.faker";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("HostingOptions", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType;

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
  });

  it("/GET hosting-options", async () => {
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .get("/hosting-options")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST hosting-options", async () => {
    const TOKEN = await getToken(user);
    const newHostingOption = {
      site: "CER(RENNES)",
      platform: "VIRTUALISATION",
      provider: "DTNUM",
      building: "B15",
      room: "IT2",
    };

    const response = await request(app().getHttpServer())
      .post("/hosting-options")
      .send(newHostingOption)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(201);

    expect(response.body.site).toBe(newHostingOption.site);
    expect(response.body.platform).toBe(newHostingOption.platform);
    expect(response.body.provider).toBe(newHostingOption.provider);
    expect(response.body.building).toBe(newHostingOption.building);
    expect(response.body.room).toBe(newHostingOption.room);
  });

  it("/PATCH hosting-options/:id", async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();
    const updateData = {
      site: "LOGNES(SIL)",
      platform: "ISOCELE",
      provider: "DTNUM",
      building: "B21",
      room: "IT5",
    };

    const response = await request(app().getHttpServer())
      .patch(`/hosting-options/${hostingOption.id}`)
      .send(updateData)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(response.body.site).toBe(updateData.site);
    expect(response.body.platform).toBe(updateData.platform);
    expect(response.body.provider).toBe(updateData.provider);
    expect(response.body.building).toBe(updateData.building);
    expect(response.body.room).toBe(updateData.room);
  });

  it("filters hosting-options by site", async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();

    const response = await request(app().getHttpServer())
      .get(`/hosting-options?site=${hostingOption.site}&pageSize=0`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.results.some((ho) => ho.id === hostingOption.id)).toBe(
      true,
    );
  });

  it("filters hosting-options by platform", async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();

    const response = await request(app().getHttpServer())
      .get(`/hosting-options?platform=${hostingOption.platform}&pageSize=0`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.results.some((ho) => ho.id === hostingOption.id)).toBe(
      true,
    );
  });

  it("filters hosting-options by provider", async () => {
    const TOKEN = await getToken(user);
    const hostingOption = await HostingOptionFaker.create();

    const response = await request(app().getHttpServer())
      .get(`/hosting-options?provider=${hostingOption.provider}&pageSize=0`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);

    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.results.some((ho) => ho.id === hostingOption.id)).toBe(
      true,
    );
  });
});
