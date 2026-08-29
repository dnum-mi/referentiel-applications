import { Roles } from "@prisma/client";
import request from "supertest";
import { ActorTypeFaker } from "./fakers/actor-type.faker";
import { ApplicationFaker } from "./fakers/application.faker";
import { OrganizationFaker } from "./fakers/organization.faker";
import { getPrismaClient } from "./fakers/prisma";
import { UserFaker } from "./fakers/user.faker";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

/**
 * #2366 — Le `PermissionGuard` interpolait le paramètre d'URL `applicationId` dans du SQL brut
 * (`$queryRawUnsafe`), ouvrant une injection SQL à tout utilisateur authentifié rattaché à une
 * organisation (le canal « acteur groupe » n'est atteint que si `user.organization.path` n'est
 * pas nul). Ces tests vérifient sur une vraie base :
 *  - qu'une charge d'injection dans `applicationId` ne provoque plus d'erreur SQL (500) ;
 *  - que le canal légitime « acteur groupe » continue d'accorder les droits attendus.
 */
describe("PermissionGuard — injection SQL via applicationId (#2366)", () => {
  const app = setupTestSuite();
  const suffix = Date.now();
  const prisma = getPrismaClient();

  let orgPath: string;
  let user: Awaited<ReturnType<typeof UserFaker.create>>;
  let TOKEN: string;
  let realAppId: string;

  beforeAll(async () => {
    orgPath = `E2E/PERM-${suffix}/SDAN`;
    const org = await OrganizationFaker.create({ path: orgPath });

    // Utilisateur VISITOR (aucun droit applicatif par rôle) rattaché à une organisation :
    // c'est ce rattachement qui fait exécuter la sous-requête « acteur groupe ».
    user = await UserFaker.create({ role: Roles.VISITOR });
    await user.update({ organization: { connect: { id: org.id } } });
    TOKEN = getToken(user);

    // Canal légitime : une application avec un acteur GROUPE, rattaché à l'organisation de
    // l'utilisateur, dont le type d'acteur porte AppRead. L'utilisateur doit hériter d'AppRead.
    const application = await ApplicationFaker.create(user);
    realAppId = application.id;
    const actorType = await ActorTypeFaker.create(["AppRead"]);
    await prisma.actor.create({
      data: {
        applicationId: realAppId,
        organizationId: org.id,
        actorTypeId: actorType.id,
        isGroup: true,
      },
    });
  });

  it("accorde AppRead via l'acteur groupe (canal légitime préservé)", async () => {
    const res = await request(app().getHttpServer())
      .get(`/applications/${realAppId}/my-perms`)
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body).toContain("AppRead");
  });

  // Cœur du correctif : la valeur est désormais liée comme paramètre. Assertion différentielle —
  // une charge d'injection doit se comporter EXACTEMENT comme un identifiant inexistant ordinaire
  // (même code HTTP), et jamais provoquer d'erreur SQL (500). Interpolée, l'apostrophe cassait la
  // syntaxe (→ 500) ou altérait le WHERE ; paramétrée, elle n'est qu'une valeur littérale de plus.
  // On compare au comportement d'un id bénin plutôt qu'à un code fixe, car l'autorisation elle-même
  // dépend d'autres canaux (fallback « type d'acteur par défaut ») hors périmètre de #2366.
  it.each([
    "x' OR '1'='1",
    "'; SELECT 1; --",
    '1\') UNION SELECT "actorTypeId" FROM "Actor" --',
  ])("neutralise la charge d'injection %p (pas de 500)", async (payload) => {
    const benign = await request(app().getHttpServer())
      .get(`/applications/does-not-exist-${suffix}/my-perms`)
      .set("Authorization", `Bearer ${TOKEN}`);

    const injected = await request(app().getHttpServer())
      .get(`/applications/${encodeURIComponent(payload)}/my-perms`)
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(injected.status).not.toBe(500);
    expect(injected.status).toBe(benign.status);
  });
});
