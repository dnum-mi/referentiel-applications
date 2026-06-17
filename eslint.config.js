// eslint.config.js
import js from "@eslint/js";
import configPrettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Fichiers/dossiers non lintés (artefacts, code généré, configs externes).
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/.turbo/**",
      "**/*.d.ts",
      "**/prisma/migrations/**",
      "frontend/src/client/**", // client OpenAPI généré
      "keycloak/**",
      "**/swagger.yaml",
      "**/realm-export.json",
    ],
  },

  // Bases de règles (qualité de code uniquement, le formatage est délégué à Prettier).
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],

  // Les blocs <script> des composants Vue sont analysés par le parseur TypeScript.
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // Backend NestJS : environnement Node.
  {
    files: ["backend/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Frontend Vue : environnement navigateur.
  {
    files: ["frontend/**/*.{ts,vue}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Ajustements de règles pour ce dépôt.
  {
    rules: {
      // TypeScript vérifie déjà l'existence des symboles : `no-undef` ne fait
      // que produire des faux positifs (recommandation typescript-eslint).
      "no-undef": "off",
      // Toléré (signalé) le temps de typer progressivement le legacy.
      "@typescript-eslint/no-explicit-any": "warn",
      // Préfixe `_` pour les variables/arguments volontairement inutilisés.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrors: "none",
        },
      ],
      // Ordre des attributs et default props : du style, géré par convention/Prettier.
      "vue/attributes-order": "off",
      "vue/require-default-prop": "off",
      // « Notes » : composant interne assumé, sans risque de collision avec une balise HTML.
      "vue/multi-word-component-names": ["error", { ignores: ["Notes"] }],
    },
  },

  // À garder en dernier : neutralise les règles ESLint qui entrent en conflit avec Prettier.
  configPrettier,
);
