import { randomUUID } from "node:crypto";
import { Permission, Roles, Status } from "@prisma/client";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Application creation — initial status history (#2938)", () => {
  const app = setupTestSuite();
  let token: string;

  beforeAll(async () => {
    const user = await UserFaker.create({
      email: `initial-status-${randomUUID()}@example.test`,
      role: Roles.READER,
      additionalPermissions: [Permission.CreateApplication],
    });
    await user.update({ emailNotificationsEnabled: false });
    token = await getToken(user);
  });

  it.each([
    {
      name: "preserves the supplied date and version",
      input: { statusDate: "2020-01-01T00:00:00Z", version: "v1" },
      expectedDate: "2020-01-01T00:00:00.000Z",
      expectedVersion: "v1",
    },
    {
      name: "normalizes a supplied date with a timezone offset",
      input: { statusDate: "2020-01-01T02:00:00+02:00", version: "v2" },
      expectedDate: "2020-01-01T00:00:00.000Z",
      expectedVersion: "v2",
    },
    {
      name: "keeps omitted fields null",
      input: {},
      expectedDate: null,
      expectedVersion: null,
    },
    {
      name: "keeps explicit null values",
      input: { statusDate: null, version: null },
      expectedDate: null,
      expectedVersion: null,
    },
    {
      name: "preserves a date without a version",
      input: { statusDate: "2020-01-01T00:00:00Z" },
      expectedDate: "2020-01-01T00:00:00.000Z",
      expectedVersion: null,
    },
    {
      name: "preserves a version without a date",
      input: { version: "v3" },
      expectedDate: null,
      expectedVersion: "v3",
    },
    {
      name: "preserves an explicitly empty version",
      input: { version: "" },
      expectedDate: null,
      expectedVersion: "",
    },
  ])("$name", async ({ input, expectedDate, expectedVersion }) => {
    const created = await request(app().getHttpServer())
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        label: `Initial status ${randomUUID()}`,
        description: "Application created to verify its initial status history",
        tags: [],
        status: { status: Status.in_production, ...input },
      })
      .expect(201);
    const { id } = created.body as { id: string };

    const prisma = getPrismaClient();
    const status = await prisma.applicationStatus.findFirstOrThrow({
      where: { applicationId: id },
    });
    expect(status.statusDate?.toISOString() ?? null).toBe(expectedDate);
    expect(status.version).toBe(expectedVersion);
    const persisted = await prisma.application.findUniqueOrThrow({
      where: { id },
    });
    expect(persisted.currentStatusId).toBe(status.id);

    const expectedStatus = {
      id: status.id,
      applicationId: id,
      status: Status.in_production,
      statusDate: expectedDate,
      version: expectedVersion,
    };
    const history = await request(app().getHttpServer())
      .get(`/applications/${id}/statuses`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toEqual(expect.objectContaining(expectedStatus));

    const detail = await request(app().getHttpServer())
      .get(`/applications/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(detail.body.currentStatus).toEqual(
      expect.objectContaining(expectedStatus),
    );
  });

  it.each([
    { name: "an invalid date", input: { statusDate: "not-a-date" } },
    { name: "a numeric version", input: { version: 42 } },
    { name: "an object version", input: { version: { name: "v1" } } },
  ])("rejects $name before creating an application", async ({ input }) => {
    const label = `Invalid initial status ${randomUUID()}`;
    await request(app().getHttpServer())
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        label,
        description:
          "Invalid initial status must be rejected before persistence",
        tags: [],
        status: { status: Status.in_production, ...input },
      })
      .expect(400);

    expect(
      await getPrismaClient().application.count({ where: { label } }),
    ).toBe(0);
  });

  it("still allows clearing an existing status date and version", async () => {
    const created = await request(app().getHttpServer())
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({
        label: `Clear initial status ${randomUUID()}`,
        description: "Clearing status details remains explicitly supported",
        tags: [],
        status: {
          status: Status.in_production,
          statusDate: "2020-01-01T00:00:00Z",
          version: "v1",
        },
      })
      .expect(201);
    const { id } = created.body as { id: string };
    const prisma = getPrismaClient();
    const status = await prisma.applicationStatus.findFirstOrThrow({
      where: { applicationId: id },
    });

    await request(app().getHttpServer())
      .patch(`/applications/${id}/statuses/${status.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ statusDate: null, version: null })
      .expect(200);

    const updated = await prisma.applicationStatus.findUniqueOrThrow({
      where: { id: status.id },
    });
    expect(updated.statusDate).toBeNull();
    expect(updated.version).toBeNull();
  });
});
