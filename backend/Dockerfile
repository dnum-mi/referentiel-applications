FROM node:24-slim AS base

WORKDIR /app
ENV PORT=3500

RUN apt-get update -y && apt-get install -y openssl jq libssl-dev procps
RUN npm install --ignore-scripts --location=global pnpm@10.14.0

COPY package.json pnpm-lock.yaml ./

RUN export VITE_RDA_APP_VERSION=$(jq -r '.version' package.json)


FROM base AS dev
RUN pnpm install
COPY . .
RUN pnpm db:generate
EXPOSE 3500
CMD [ "pnpm", "start:dev" ]


FROM base AS prod
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm db:generate
RUN pnpm build
EXPOSE 8080
CMD [ "pnpm", "start:prod" ]
