# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (including devDeps for prisma + build)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source, generate Prisma client & build
COPY . .
RUN npx prisma generate && npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Production deps only
COPY package*.json ./
RUN npm ci --legacy-peer-deps --omit=dev && npm cache clean --force

# Prisma schema (needed for db push at startup)
COPY prisma ./prisma

# Copy generated Prisma client from builder (avoids needing prisma CLI in runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Astro SSR output + static assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./dist/client

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

# Start server (prisma db push runs via app startup or manually)
CMD ["node", "./dist/server/entry.mjs"]
