# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml vite.config.ts tsconfig.json ./
COPY apps/website/package.json apps/website/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm exec vp run website#build

FROM node:22-alpine AS production-deps
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/website/package.json apps/website/package.json
RUN pnpm install --prod --frozen-lockfile

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=production-deps /app/apps/website/node_modules ./apps/website/node_modules
COPY --from=production-deps /app/package.json ./package.json
COPY --from=production-deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=production-deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=production-deps /app/apps/website/package.json ./apps/website/package.json
COPY --from=build /app/apps/website/build ./apps/website/build

WORKDIR /app/apps/website
EXPOSE 3000
CMD ["pnpm", "exec", "react-router-serve", "./build/server/index.js"]
