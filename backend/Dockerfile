FROM node:22

WORKDIR /app

RUN apt-get update && apt-get install -y jq
RUN export VITE_RDA_APP_VERSION=$(jq -r '.version' package.json)

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm prisma generate
RUN pnpm run build

ENV PORT=3500

CMD ["node" , "dist/src/main.js"]
