import { getTestDatabaseUrl } from "./test-database.utils";

// Set NODE_ENV to test for all tests
process.env.NODE_ENV = "test";
process.env.DISABLE_JWT_VALIDATION = "true"; // Disable JWT verification in tests
// #1985 : jest tourne dans le conteneur backend et hérite de l'env docker-compose (`enforce`) ;
// sans cette ligne, les jetons de `getToken()` — sans claim — tomberaient VISITOR dans toutes
// les specs supertest. Le spec dédié (`auth-level.e2e-spec.ts`) repose le mode en tête de fichier.
process.env.AUTH_LEVEL_MODE = "off";

// #2117 : redirige les workers vers la base de TEST créée et migrée par `global-setup`.
// Sans cette ligne, l'app Nest et les fakers utilisaient le DATABASE_URL ambiant — la base
// de DEV — que chaque run polluait (familles « AAA/ZZZ sort family » dupliquées, users et
// applications de faker…), pendant que `test_postgres` était créée puis droppée sans servir.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL est requis pour les tests (base de test dérivée : test_<db>)",
  );
}
process.env.DATABASE_URL = getTestDatabaseUrl(process.env.DATABASE_URL);
