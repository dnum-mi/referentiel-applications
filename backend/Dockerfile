FROM node:24-slim AS dev

WORKDIR /app

RUN apt-get update && apt-get install -y jq libssl-dev procps
RUN export VITE_RDA_APP_VERSION=$(jq -r '.version' package.json)

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate
ENV PORT=3500
CMD ["pnpm" , "dev"]


FROM dev AS prod
RUN pnpm run build

CMD ["node" , "dist/src/main.js"]
