# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile=false
RUN pnpm --filter @unipro-crm/api exec prisma generate
RUN pnpm --filter @unipro-crm/api build

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

COPY --from=builder /workspace/package.json /workspace/pnpm-workspace.yaml ./
COPY --from=builder /workspace/packages ./packages
COPY --from=builder /workspace/apps/api/package.json ./apps/api/
COPY --from=builder /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=builder /workspace/apps/api/dist ./apps/api/dist
COPY --from=builder /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /workspace/node_modules ./node_modules

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
