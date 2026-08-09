# AEM System — production image.
#
# Debian slim rather than Alpine: the Prisma 7 schema engine (used by
# `prisma migrate deploy` at container start) ships glibc binaries, and musl
# support has historically been the flaky path.
#
#   docker build -t aem-system .
#   docker run --env-file .env.production -p 3000:3000 aem-system

FROM node:24-bookworm-slim AS base
# openssl is a Prisma engine runtime dependency.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1


# ─── deps ───────────────────────────────────────────────────────────────────
# Full install (dev deps included): the build needs them, and the runtime image
# keeps them so `prisma migrate deploy` and the tsx seed scripts can run inside
# the container. See docs/AEM_Deployment.md if you'd rather trade that for a
# smaller image.
FROM base AS deps
COPY package.json package-lock.json ./
# `postinstall` runs `prisma generate`, which reads both of these.
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma.config.ts ./
# prisma.config.ts resolves DATABASE_URL eagerly; generate never connects, so a
# placeholder is enough. The real value is injected at runtime.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm ci


# ─── builder ────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Every route is server-rendered on demand, so the build never opens a
# connection — but the Prisma client and Auth.js both read env at import time.
# Kept inline rather than in an ENV so no placeholder credential is baked into
# an image layer.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    AUTH_SECRET="placeholder-build-time-secret" \
    npx prisma generate && \
    DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    AUTH_SECRET="placeholder-build-time-secret" \
    npm run build


# ─── runner ─────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Order matters: standalone ships a traced subset of node_modules, so the full
# tree goes on top of it, not under.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Migrations, seeds, and the verification/maintenance scripts, so everything in
# docs/AEM_Deployment.md can be run with `docker exec`.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts /app/tsconfig.json ./

COPY --chown=nextjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
