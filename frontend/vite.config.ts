// vite.config.js
import { fileURLToPath, URL } from "node:url";

import { vueDsfrAutoimportPreset, vueDsfrComponentResolver } from "@gouvminint/vue-dsfr/meta";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import VueDevTools from "vite-plugin-vue-devtools";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.VERSION || "development"),
  },
  plugins: [
    vue(),
    vueJsx(),
    VueDevTools(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "safari-pinned-tab.svg"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000, // Pour le CSS du DSFR :-/
        navigateFallbackDenylist: [/^\/api*/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "Dummy app",
        short_name: "Dummy",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        display: "standalone",
      },
    }),
    AutoImport({
      include: [/\.[tj]sx?$/, /\.vue$/, /\.vue\?vue/],
      imports: [
        // @ts-expect-error TS2322
        "vue",
        // @ts-expect-error TS2322
        "vue-router",
        // @ts-expect-error TS2322
        "pinia",
        // @ts-expect-error TS2322
        "vitest",
        // @ts-expect-error TS2322
        vueDsfrAutoimportPreset,
      ],
      vueTemplate: true,
      dts: "./src/auto-imports.d.ts",
    }),
    Components({
      extensions: ["vue"],
      dirs: ["src/components"], // Autoimport de vos composants qui sont dans le dossier `src/components`
      include: [/\.vue$/, /\.vue\?vue/],
      dts: "./src/components.d.ts",
      resolvers: [
        vueDsfrComponentResolver, // Autoimport des composants de VueDsfr dans les templates
      ],
    }),
  ],
  base: process.env.BASE_URL || "/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: ["vue"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/auth": {
        target: "http://localhost:8082",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, ""),
      },
      "/api": {
        target: process.env.API_BASE_URL ?? "http://backend:3500",
        changeOrigin: true,
      },
    },
  },
});
