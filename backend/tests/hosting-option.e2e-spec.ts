import type { UserFakerReturnType } from "./fakers/user.faker";
import { Roles } from "@prisma/client";
import request from "supertest";
import { faker } from "@faker-js/faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { HostingOptionFaker } from "./fakers/hosting-option.faker";
import { HostingFaker } from "./fakers/hosting.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("HostingOptions", () => {
  const app = setupTestSuite();
  let user: UserFakerReturnType; // CONTRIBUTOR : lecture du catalogue
  let admin: UserFakerReturnType; // ADMIN : écriture du catalogue (#2369)

  beforeAll(async () => {
    user = await UserFaker.create({ role: Roles.CONTRIBUTOR });
    admin = await UserFaker.create({ role: Roles.ADMIN });
  });

  it("/GET hosting-options", async () => {
    const TOKEN = await getToken(user);
    await request(app().getHttpServer())
      .get("/hosting-options")
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(200);
  });

  it("/POST hosting-options (admin)", async () => {
    const TOKEN = await getToken(admin);
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

  it("/PATCH hosting-options/:id (admin)", async () => {
    const TOKEN = await getToken(admin);
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

  // #2369 : les écritures du catalogue partagé sont réservées aux administrateurs.
  it("refuse l'écriture du catalogue à un contributeur (403)", async () => {
    const TOKEN = await getToken(user);
    const option = await HostingOptionFaker.create();

    await request(app().getHttpServer())
      .post("/hosting-options")
      .send({ site: "X", platform: "Y", provider: "Z" })
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);
    await request(app().getHttpServer())
      .delete(`/hosting-options/${option.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .expect(403);
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

  // #2688 : gestion du catalogue depuis l'onglet d'administration.
  describe("gestion depuis l'administration (#2688)", () => {
    const uniqueSite = () => `SITE-${faker.string.alphanumeric(10)}`;

    it("expose le nombre d'hébergements rattachés à chaque option", async () => {
      const TOKEN = await getToken(admin);
      const option = await HostingOptionFaker.create({ site: uniqueSite() });
      const application = await ApplicationFaker.create(admin);
      await HostingFaker.create({
        application,
        hostingOption: option,
        user: admin,
      });
      await HostingFaker.create({
        application,
        hostingOption: option,
        user: admin,
      });

      const response = await request(app().getHttpServer())
        .get(`/hosting-options?site=${option.site}`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);

      expect(response.body.results).toEqual([
        expect.objectContaining({ id: option.id, hostingsCount: 2 }),
      ]);
      expect(response.body.results[0]).not.toHaveProperty("_count");
    });

    it("recherche sur l'ensemble des champs", async () => {
      const TOKEN = await getToken(admin);
      const token = faker.string.alphanumeric(12);
      const byRoom = await HostingOptionFaker.create({ room: `R-${token}` });
      const byProvider = await HostingOptionFaker.create({
        provider: `P-${token.toLowerCase()}`,
      });
      await HostingOptionFaker.create({ site: uniqueSite() });

      const response = await request(app().getHttpServer())
        .get(`/hosting-options?search=${token.toUpperCase()}`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);

      expect(response.body.results.map((o) => o.id).sort()).toEqual(
        [byRoom.id, byProvider.id].sort(),
      );
    });

    it("trie selon la colonne demandée", async () => {
      const TOKEN = await getToken(admin);
      const site = uniqueSite();
      await HostingOptionFaker.create({ site, provider: "AAA" });
      await HostingOptionFaker.create({ site, provider: "ZZZ" });

      const response = await request(app().getHttpServer())
        .get(`/hosting-options?site=${site}&sortBy=provider&order=desc`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);

      expect(response.body.results.map((o) => o.provider)).toEqual([
        "ZZZ",
        "AAA",
      ]);
    });

    it("nettoie les espaces et enregistre null pour un bâtiment ou une pièce vide", async () => {
      const TOKEN = await getToken(admin);
      const site = uniqueSite();

      const response = await request(app().getHttpServer())
        .post("/hosting-options")
        .send({
          site: `  ${site}  `,
          platform: " CLOUD ",
          provider: "OVH",
          building: "  ",
          room: "",
        })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(201);

      expect(response.body).toMatchObject({
        site,
        platform: "CLOUD",
        building: null,
        room: null,
      });
    });

    it("permet de vider le bâtiment et la pièce d'une option existante", async () => {
      const TOKEN = await getToken(admin);
      const option = await HostingOptionFaker.create({
        site: uniqueSite(),
        building: "B1",
        room: "IT1",
      });

      const response = await request(app().getHttpServer())
        .patch(`/hosting-options/${option.id}`)
        .send({
          site: option.site,
          platform: option.platform,
          provider: option.provider,
          building: "",
          room: null,
        })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);

      expect(response.body).toMatchObject({ building: null, room: null });
    });

    it("refuse une valeur plus longue que la colonne (400 plutôt que 500)", async () => {
      const TOKEN = await getToken(admin);

      await request(app().getHttpServer())
        .post("/hosting-options")
        .send({ site: uniqueSite(), platform: "P", provider: "X".repeat(101) })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(400);
      await request(app().getHttpServer())
        .post("/hosting-options")
        .send({
          site: uniqueSite(),
          platform: "P",
          provider: "X",
          room: "R".repeat(51),
        })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(400);
    });

    it("refuse un doublon à la création, casse ignorée (409)", async () => {
      const TOKEN = await getToken(admin);
      const option = await HostingOptionFaker.create({
        site: uniqueSite(),
        building: "B7",
        room: null,
      });

      await request(app().getHttpServer())
        .post("/hosting-options")
        .send({
          site: option.site.toLowerCase(),
          platform: option.platform,
          provider: option.provider,
          building: "b7",
        })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(409);

      // Une pièce renseignée distingue l'option : ce n'est plus un doublon.
      await request(app().getHttpServer())
        .post("/hosting-options")
        .send({
          site: option.site,
          platform: option.platform,
          provider: option.provider,
          building: "B7",
          room: "IT9",
        })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(201);
    });

    it("refuse une modification qui produirait un doublon, mais pas la ré-enregistrer à l'identique", async () => {
      const TOKEN = await getToken(admin);
      const site = uniqueSite();
      const existing = await HostingOptionFaker.create({
        site,
        building: null,
        room: null,
      });
      const other = await HostingOptionFaker.create({
        site,
        building: "B2",
        room: null,
      });
      const sameAsExisting = {
        site,
        platform: existing.platform,
        provider: existing.provider,
      };

      await request(app().getHttpServer())
        .patch(`/hosting-options/${other.id}`)
        .send({ ...sameAsExisting, building: "" })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(409);
      await request(app().getHttpServer())
        .patch(`/hosting-options/${existing.id}`)
        .send(sameAsExisting)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(200);
    });

    it("renvoie 404 pour une option inexistante", async () => {
      const TOKEN = await getToken(admin);

      await request(app().getHttpServer())
        .patch("/hosting-options/inexistant")
        .send({ site: uniqueSite(), platform: "P", provider: "X" })
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(404);
      await request(app().getHttpServer())
        .delete("/hosting-options/inexistant")
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(404);
    });

    it("supprime une option utilisée en détachant les hébergements", async () => {
      const TOKEN = await getToken(admin);
      const option = await HostingOptionFaker.create({ site: uniqueSite() });
      const application = await ApplicationFaker.create(admin);
      const hosting = await HostingFaker.create({
        application,
        hostingOption: option,
        user: admin,
      });

      await request(app().getHttpServer())
        .delete(`/hosting-options/${option.id}`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .expect(204);

      const detached = await getPrismaClient().hosting.findUnique({
        where: { id: hosting.id },
      });
      expect(detached).toMatchObject({ hostingOptionId: null });
    });
  });
});
