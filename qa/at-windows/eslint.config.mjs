import tseslint from "typescript-eslint";
export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
      "evidence/**",
      "fixtures/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
);
