FROM node:24-slim AS base

WORKDIR /app

RUN apt-get update \
    && apt-get install -y jq \
    && apt-get clean \
    && npm install -g pnpm

RUN export VITE_RDA_APP_VERSION=$(jq -r '.version' package.json)

# Copy necessary files
COPY package.json pnpm-lock.yaml ./

FROM base AS dev
RUN pnpm install
CMD ["npm" , "run" , "dev"]


FROM base AS build
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .

RUN npm run api:generate
# Temporary disable type checking
RUN npm run build-only
CMD ["pnpm" , "dev"]

FROM nginxinc/nginx-unprivileged:1.27-alpine AS prod

USER 0

COPY --chown=1001:1001 --chmod=444 nginx.conf /etc/nginx/nginx.conf
COPY --chown=1001:1001 --from=build /app/dist /usr/share/nginx/html/

COPY --chown=1001:1001 --chmod=554 entrypoint.sh /docker-entrypoint.d/entrypoint.sh

USER 1001

ENV APP_ENV_PREFIX=VITE_RDA_
ENV APP_DIST_DIR=/usr/share/nginx/html

# EXPOSE 8080  # see https://hub.docker.com/r/nginxinc/nginx-unprivileged for doc about the base image

# startup script to set env vars then run nginx
CMD [ "/docker-entrypoint.d/entrypoint.sh" ]
