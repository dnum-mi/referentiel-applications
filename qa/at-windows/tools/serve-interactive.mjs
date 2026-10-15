import path from "node:path";
import { pathToFileURL } from "node:url";

const product = process.env.RGAA_PRODUCT_ROOT;
if (!product) throw new Error("RGAA_PRODUCT_ROOT is required.");
const root = path.resolve(product, "frontend");
const { createServer } = await import(
  pathToFileURL(path.join(root, "node_modules/vite/dist/node/index.js")).href
);
const port = Number(process.env.RGAA_INTERACTIVE_PORT ?? 5173);
const server = await createServer({
  root,
  configFile: path.join(root, "vite.config.ts"),
  // This immutable checkout has no developer edits to hot-reload. A late
  // dependency optimization must not replace a mounted accessibility scene.
  // Each process also gets a fresh cache, separate from local developer servers.
  cacheDir: path.join(root, "node_modules", `.vite-rgaa-at-${process.pid}`),
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
    hmr: false,
    watch: null,
  },
});
await server.listen();
server.printUrls();
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await server.close();
    process.exit(0);
  });
}
