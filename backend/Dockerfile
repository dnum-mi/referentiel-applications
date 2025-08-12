FROM node:24-slim AS base

WORKDIR /app
ENV PORT=3500

RUN apt-get update -y && apt-get install -y openssl jq libssl-dev procps
RUN npm install --ignore-scripts --location=global pnpm@10.14.0

COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./
COPY ./backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile

RUN export VITE_RDA_APP_VERSION=$(jq -r '.version' ./backend/package.json)


FROM base AS dev
RUN pnpm install
COPY ./backend/ ./backend
RUN pnpm --filter server db:generate
EXPOSE 3500
WORKDIR /app/backend
ENTRYPOINT [ "pnpm", "run" ]
CMD [ "start:dev"]


FROM base AS build
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY ./backend/ ./backend
RUN pnpm --filter server db:generate
RUN pnpm --filter server build
RUN pnpm --filter server --prod --legacy deploy build

FROM node:24-slim AS prod
WORKDIR /app
COPY --chown=node:root --from=build /app/build .
EXPOSE 8080
USER node
CMD [ "npm", "run", "start:prod" ]
