FROM node:lts-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS test
COPY --from=deps /app/node_modules ./node_modules

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:lts-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=/data/app.db
ENV IMAGE_DIR=/data/images

COPY --from=build /app/.output ./.output
COPY --from=build /app/server/database/migrations ./server/database/migrations

VOLUME ["/data"]
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
