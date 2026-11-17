import { PrismaService } from "src/prisma/prisma.service";
import { OrganizationsService } from "./organizations.service";
import { PrismaQueryBuilder } from "./prisma-query-builder.service";

const makeService = () => {
  const paginate = jest.fn().mockResolvedValue({ results: [], total: 0 });
  const prisma = { organization: { paginate } } as unknown as PrismaService;
  return {
    service: new OrganizationsService(prisma, new PrismaQueryBuilder()),
    paginate,
  };
};

describe("OrganizationsService — tri et pagination", () => {
  it.each([
    ["path", "asc"],
    ["path", "desc"],
    ["sigle", "asc"],
    ["sigle", "desc"],
  ] as const)(
    "transmet le tri %s %s et un départage stable avant la pagination",
    async (sortBy, order) => {
      const { service, paginate } = makeService();

      await service.find({ sortBy, order, page: 2, pageSize: 5 });

      expect(paginate).toHaveBeenCalledWith({
        where: { parentId: null },
        page: 2,
        pageSize: 5,
        orderBy: [{ [sortBy]: order }, { id: "asc" }],
        include: { maiaReferences: true, businessDivision: true },
      });
    },
  );

  it.each([undefined, "label", "unknown", "path; DROP TABLE Organization"])(
    "utilise le chemin ascendant pour un champ de tri non pris en charge : %s",
    async (sortBy) => {
      const { service, paginate } = makeService();

      await service.find({ sortBy });

      expect(paginate.mock.calls[0][0].orderBy).toEqual([
        { path: "asc" },
        { id: "asc" },
      ]);
    },
  );

  it("conserve la sélection d'identifiants et la désactivation de pagination", async () => {
    const { service, paginate } = makeService();

    await service.find({
      ids: ["first", "second"],
      pageSize: 0,
      sortBy: "sigle",
      order: "desc",
    });

    expect(paginate.mock.calls[0][0]).toMatchObject({
      where: { id: { in: ["first", "second"] } },
      pageSize: 0,
      orderBy: [{ sigle: "desc" }, { id: "asc" }],
    });
  });

  it("conserve les filtres de recherche et d'organisations utilisées", async () => {
    const { service, paginate } = makeService();
    const match = { contains: "MI/DNUM", mode: "insensitive" };

    await service.find({ search: "MI/DNUM", usedOnly: true, sortBy: "path" });

    expect(paginate.mock.calls[0][0].where).toEqual({
      AND: [
        {
          OR: [
            { path: match },
            { sigle: match },
            { url: match },
            { maiaReferences: { some: { maiaRef: match } } },
          ],
        },
        { OR: [{ actors: { some: {} } }, { users: { some: {} } }] },
      ],
    });
  });
});
