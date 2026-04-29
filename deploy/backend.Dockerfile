FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
# Necesitamos todas las deps en runtime: prisma CLI (migrate deploy) y tsx
# (para correr seed.ts / set-password.ts a mano vía docker compose exec).
COPY backend/package.json backend/package-lock.json ./
RUN npm ci && npm cache clean --force
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
# Entrypoint: aplica migraciones y arranca el server
COPY deploy/backend-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
