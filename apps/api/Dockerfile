FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json packages/
COPY apps/*/package.json apps/

RUN corepack enable && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat && corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm --filter @smart-attendance/api db:generate
RUN pnpm --filter @smart-attendance/api build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./package.json

USER nestjs

EXPOSE 4000
ENV PORT=4000

CMD ["node", "dist/main.js"]
