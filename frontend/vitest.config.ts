import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      // Les specs Playwright vivent dans tests/ (playwright.config testDir) et tests-examples/ :
      // on les exclut pour que vitest ne ramasse que les tests unitaires co-localisés dans src/.
      exclude: [...configDefaults.exclude, "e2e/*", "tests/**", "tests-examples/**"],
      root: fileURLToPath(new URL("./", import.meta.url)),
      setupFiles: [fileURLToPath(new URL("./vitest-setup.ts", import.meta.url))],
    },
  }),
);
