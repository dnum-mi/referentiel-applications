import { fileURLToPath, URL } from "node:url";
import { mergeConfig } from "vite";
import viteConfig from "../../vite.config";

// Monter les vrais composants sans charger les routes protégées par OIDC.
export default mergeConfig(viteConfig, {
  optimizeDeps: { entries: ["tests/browser/fixtures/metadata.html"] },
  resolve: {
    alias: [{ find: /^@\/router$/, replacement: fileURLToPath(new URL("./fixtures/router.ts", import.meta.url)) }],
  },
  server: { port: 5174 },
});
