FROM node:24-slim AS base

ARG VERSION
ENV VERSION=${VERSION:-main}

WORKDIR /app

RUN apt-get update \
    && apt-get clean
RUN npm install -g pnpm

# Copy necessary files
COPY package.json pnpm-lock.yaml ./

FROM base AS dev
RUN pnpm install
CMD ["pnpm" , "run" , "dev"]


FROM base AS build
ARG VERSION
ENV VERSION=${VERSION:-main}

RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .

RUN pnpm api:generate
# Temporary disable type checking
RUN pnpm build-only

FROM nginxinc/nginx-unprivileged:1.27-alpine AS prod

USER 0

RUN chown -R 1001:1001 /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html
COPY --chown=1001:1001 --chmod=444 nginx.conf /etc/nginx/nginx.conf
COPY --chown=1001:1001 --chmod=755 --from=build /app/dist /app

COPY --chown=1001:1001 --chmod=775 entrypoint.sh /docker-entrypoint.d/entrypoint.sh

USER 1001

ENV APP_ENV_PREFIX=VITE_RDA_
ENV APP_DIST_DIR=/usr/share/nginx/html

# EXPOSE 8080  # see https://hub.docker.com/r/nginxinc/nginx-unprivileged for doc about the base image

# startup script to set env vars then run nginx
CMD [ "/docker-entrypoint.d/entrypoint.sh" ]
