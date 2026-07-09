FROM node:24-slim AS base

ARG VERSION
ENV VERSION=${VERSION:-main}

WORKDIR /app

RUN apt-get update \
    && apt-get clean
RUN npm install -g pnpm

# Copy necessary files
# pnpm-workspace.yaml porte les overrides de sécurité (pnpm 10 ne les lit plus
# depuis package.json) : il doit être présent avant `pnpm install --frozen-lockfile`.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM base AS dev
RUN pnpm install
CMD ["pnpm" , "run" , "dev"]


FROM base AS build
ARG VERSION
ENV VERSION=${VERSION:-main}

RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .

RUN pnpm api:generate
# Type-check désactivé au build : vue-tsc nécessite les d.ts d'auto-imports
# (unplugin-auto-import) générés pendant le build Vite, et inclurait les specs.
# Le type-check tourne via `pnpm type-check` (dev / job CI dédié), pas dans l'image.
RUN pnpm build-only

FROM nginxinc/nginx-unprivileged:1.27-alpine AS prod

USER 0

# OpenShift (et tout runtime "arbitrary UID") lance le conteneur avec un UID
# aléatoire mais toujours dans le groupe 0. L'entrypoint réécrit /app et recopie
# vers /usr/share/nginx/html à chaque démarrage : ces deux dossiers doivent donc
# être inscriptibles par le groupe 0. On reste NON world-writable (Sonar S2612 OK).
RUN chown -R 1001:0 /usr/share/nginx/html && chmod -R g=u /usr/share/nginx/html
COPY --chown=1001:0 --chmod=444 nginx.conf /etc/nginx/nginx.conf
COPY --chown=1001:0 --chmod=775 --from=build /app/dist /app

COPY --chown=1001:0 --chmod=775 entrypoint.sh /docker-entrypoint.d/entrypoint.sh

USER 1001

ENV APP_ENV_PREFIX=VITE_RDA_
ENV APP_DIST_DIR=/usr/share/nginx/html

# EXPOSE 8080  # see https://hub.docker.com/r/nginxinc/nginx-unprivileged for doc about the base image

# startup script to set env vars then run nginx
CMD [ "/docker-entrypoint.d/entrypoint.sh" ]
