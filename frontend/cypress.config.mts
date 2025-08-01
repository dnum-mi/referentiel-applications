import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",

    // To avoid issues with cross-origin requests on certain browsers
    chromeWebSecurity: false,
  },
  component: {
    devServer: {
      framework: "vue",
      bundler: "vite",
    },
  },
});
