import { expect, test } from "@playwright/test";
import {
  QA_APPLICATION_LABELS,
  verifyRequiredFixtures,
} from "../support/required-fixtures";

function fixtureApi() {
  return {
    applications: async (_query: string) => ({
      results: QA_APPLICATION_LABELS.map((label) => ({ id: label, label })),
      total: QA_APPLICATION_LABELS.length,
    }),
    organizations: async (path: string) => ({
      results: [{ id: path, label: path, path }],
      total: 1,
    }),
    userByEmail: async (email: string) => ({
      id: email,
      email,
      role: "READER",
      additionalPermissions: [],
    }),
  };
}

test("accepts a complete searchable QA seed", async () => {
  await expect(verifyRequiredFixtures(fixtureApi())).resolves.toBeUndefined();
});

test("fails with named fixtures and a repair command when applications are missing", async () => {
  const api = {
    ...fixtureApi(),
    applications: async () => ({ results: [], total: 0 }),
  };
  await expect(verifyRequiredFixtures(api)).rejects.toThrow(
    /QA-SCOPE-TOTO[\s\S]*QA-EOL[\s\S]*pnpm db:seed:qa/,
  );
});

test("does not accept a fuzzy search match for a required label", async () => {
  const api = {
    ...fixtureApi(),
    applications: async () => ({
      results: [{ id: "1", label: "QA-SCOPE-TOTO-copy" }],
      total: 1,
    }),
  };
  await expect(verifyRequiredFixtures(api)).rejects.toThrow(
    "application QA-SCOPE-TOTO",
  );
});

test("treats refused API reads as missing prerequisites", async () => {
  const api = { ...fixtureApi(), applications: async () => null };
  await expect(verifyRequiredFixtures(api)).rejects.toThrow(
    "vérifier l'accès API",
  );
});

test("fails when a scoped account or organization is absent", async () => {
  const api = {
    ...fixtureApi(),
    organizations: async () => null,
    userByEmail: async () => null,
  };
  await expect(verifyRequiredFixtures(api)).rejects.toThrow(
    /organisation TOTO[\s\S]*utilisateur scope-admin@example.com/,
  );
});

test("propagates connection failures instead of treating them as a skip", async () => {
  const api = {
    ...fixtureApi(),
    applications: async () => {
      throw new Error("API inaccessible");
    },
  };
  await expect(verifyRequiredFixtures(api)).rejects.toThrow("API inaccessible");
});
