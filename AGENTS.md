# Instructions pour Copilot — Référentiel des applications

## Contexte

Voir @README.md pour la description du projet, l'installation,
les commandes Docker et les conventions de commits.

## Stack technique (complément)

- Frontend : Vue 3 + Vite + TypeScript + Pinia + PrimeVue + DSFR
- Auth : Keycloak (OIDC)
- Package manager : pnpm 10.14.0 — ne pas utiliser npm ou yarn
- Node : >=20.19.0

## Conventions de code

- TypeScript strict activé côté backend (`noUnusedLocals: true`)
- Les composants Vue sont auto-importés depuis `src/components` uniquement
- Alias `@` pointe vers `./src` dans le frontend

## Base de données

- Ne jamais modifier les fichiers de migration Prisma manuellement
- Pour créer une migration : `pnpm db:dev` (dans le backend)
- Pour appliquer en prod : `pnpm db:deploy`

## Tests

- Backend : `*.spec.ts` dans `backend/tests/`, framework Jest
- Frontend unitaires : Vitest (`pnpm test:unit`)
- Frontend E2E : Playwright (`pnpm test:e2e`)
- Toujours faire passer les tests avant de soumettre une PR

## Ce qu'il ne faut pas faire

- Ne pas bypasser les hooks Husky
- Ne pas commiter directement sur `main`
- Ne pas modifier les fichiers de migration à la main
