import { fileURLToPath } from "node:url";
import { configDefaults, coverageConfigDefaults, defineConfig, mergeConfig } from "vitest/config";
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
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx,vue}"],
        exclude: [...coverageConfigDefaults.exclude, "src/client/**"],
        reporter: [
          ["text-summary"],
          // Sonar analyse le monorepo depuis sa racine, pas depuis frontend/.
          ["lcov", { projectRoot: fileURLToPath(new URL("../", import.meta.url)) }],
        ],
      },
    },
  }),
);
