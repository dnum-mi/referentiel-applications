// Set NODE_ENV to test for all tests
process.env.NODE_ENV = "test";
process.env.DISABLE_JWT_VALIDATION = "true"; // Disable JWT verification in tests
// Pas de cache des feature flags en test : chaque lecture reflète la base, ce qui
// supprime la fenêtre de staleness (TTL) entre suites e2e qui basculent un flag.
process.env.FEATURE_FLAG_CACHE_TTL_MS ??= "0";
