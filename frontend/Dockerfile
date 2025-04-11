FROM node:20-slim AS build

WORKDIR /app

ARG APP_VERSION
ENV VITE_APP_VERSION=$APP_VERSION

RUN npm install -g pnpm

# Copy necessary files
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install
RUN pnpm install --frozen-lockfile


COPY . .

# Temporary disable type checking
RUN npm run build-only

FROM nginxinc/nginx-unprivileged:1.27-alpine AS prod

USER 0

COPY --chown=1001:1001 --chmod=664 nginx.conf /etc/nginx/nginx.conf
COPY --chown=1001:1001 --chmod=777 --from=build /app/dist /usr/share/nginx/html/

COPY --chown=1001:1001 --chmod=775 entrypoint.sh /docker-entrypoint.d/entrypoint.sh

USER 1001

ENV APP_ENV_PREFIX=VITE_RDA_
ENV APP_DIST_DIR=/usr/share/nginx/html

# EXPOSE 8080  # see https://hub.docker.com/r/nginxinc/nginx-unprivileged for doc about the base image

# startup script to set env vars then run nginx
CMD [ "/docker-entrypoint.d/entrypoint.sh" ]
