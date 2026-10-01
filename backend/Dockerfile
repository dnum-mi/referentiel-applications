FROM node:24-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS base

ARG VERSION
ENV VERSION=${VERSION:-main}

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
WORKDIR /app
RUN chown -R node:root /app
ENV PORT=3500

RUN apk upgrade --no-cache \
    && apk add --no-cache openssl procps-ng \
    && npm install --ignore-scripts --prefix /usr/local --location=global npm@12.2.0 \
    && npm install --ignore-scripts --location=global pnpm@10.34.6

# pnpm-workspace.yaml porte les overrides de sécurité (pnpm 10 ne les lit plus
# depuis package.json) : il doit être présent avant `pnpm install`.
COPY --chown=node:root package.json pnpm-lock.yaml pnpm-workspace.yaml ./

USER node


FROM base AS dev
RUN pnpm install
COPY --chown=node:root . .
RUN pnpm db:generate
EXPOSE 3500
CMD [ "pnpm", "start:dev" ]


FROM base AS prod
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --chown=node:root . .
RUN pnpm db:generate \
    && pnpm build
# Seul pnpm est utilisé à l'exécution, y compris pour Prisma et les tests.
# Ne pas conserver les dépendances npm/npx embarquées dans l'image livrée.
USER root
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /root/.npm
USER node
EXPOSE 8080
CMD [ "pnpm", "start:prod" ]
