import antfu from "@antfu/eslint-config";

export default antfu(
  {
    languageOptions: {
      parserOptions: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        sourceType: "module",
      },
    },
    stylistic: {
      overrides: {
        "antfu/if-newline": "off",
        "antfu/no-top-level-await": "off",
        "no-console": "off",
        "node/prefer-global/process": ["error", "always"],
        "node/prefer-global/console": ["error", "always"],
        "node/prefer-global/buffer": ["error", "always"],
        "style/comma-dangle": ["error", "always-multiline"],
        "style/quote-props": ["error", "as-needed", { keywords: false, unnecessary: true }],
        "style/brace-style": ["error", "1tbs", { allowSingleLine: true }],
        "ts/ban-ts-comment": "off",
        "vue/no-v-html": "off",
        "style/quotes": ["error", "double"],
        "style/semi": ["error", "always"],
      },
    },
    typescript: true,
    yaml: {
      overrides: {
        "yaml/quotes": ["error", { prefer: "double" }],
        "yaml/indent": ["error", 2, { indentBlockSequences: true, indicatorValueIndent: 2 }],
      },
    },
    ignores: [
      "**/node_modules",
      "**/prisma/migrations",
      "**/pnpm-lock.yaml",
      "**/.turbo",
      "**/dist/",
      "**/types/",
      "**/coverage/",
      "**/templates/*.{yaml,yml}",
      "**/Chart.yaml",
      "**/*.d.ts",
      "**/*.md/*.js",
      "**/*.md/*.ts",
      "**/cypress/support/component.js",
      "**/frontend/src/client",
      "**/swagger.yaml",
    ],
  },
);
