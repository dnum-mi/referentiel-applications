import { Roles } from "@prisma/client";
import request from "supertest";
import { getPrismaClient } from "./fakers/prisma";
import { getToken } from "./getToken";
import { setupTestSuite } from "./setup";

describe("Première connexion malgré une panne MAIA (#2543)", () => {
  const app = setupTestSuite();
  const previousEnv = { ...process.env };
  let sequence = 0;

  beforeEach(() => {
    process.env.MOCK_MAIA_SERVICE = "false";
    process.env.MAIA_API_URL = "http://maia.test/find";
    process.env.MAIA_TIMEOUT_MS = "20";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...previousEnv };
  });

  it.each(["network", "http", "body", "timeout"])(
    "persiste un visiteur sans organisation et retourne son profil : %s",
    async (failure) => {
      jest.spyOn(global, "fetch").mockImplementation(async (_input, init) => {
        if (failure === "network") throw new TypeError("fetch failed");
        if (failure === "http")
          return new Response("<html>erreur</html>", { status: 500 });
        if (failure === "body") return new Response("<html>erreur</html>");
        return new Promise<Response>((_resolve, reject) => {
          init.signal.addEventListener(
            "abort",
            () => reject(init.signal.reason),
            { once: true },
          );
        });
      });
      const email = `maia-unavailable-${Date.now()}-${sequence++}@example.com`;
      await request(app().getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${getToken({ email })}`)
        .expect(200);
      const user = await getPrismaClient().user.findUnique({
        where: { email },
      });
      expect(user).toMatchObject({
        email,
        role: Roles.VISITOR,
        organizationId: null,
      });
    },
  );
});
