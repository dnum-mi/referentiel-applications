FROM node:24-slim AS base

ARG VERSION
ENV VERSION=${VERSION:-main}

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin
WORKDIR /app
RUN chown -R node:root /app
ENV PORT=3500

RUN apt-get update -y \
    && apt-get install -y libssl-dev openssl procps \
    && apt-get clean
RUN npm install --ignore-scripts --location=global pnpm@10.14.0

COPY --chown=node:root package.json pnpm-lock.yaml ./

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
EXPOSE 8080
CMD [ "pnpm", "start:prod" ]
