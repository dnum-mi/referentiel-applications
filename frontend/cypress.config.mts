import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    chromeWebSecurity: false,
  },
  component: {
    devServer: {
      framework: "vue",
      bundler: "vite",
    },
  },
});
