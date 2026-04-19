############################
# 1. deps — install packages
############################
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
COPY prisma ./prisma
# Skip postinstall/prepare so we don't run prisma generate or rebuild on raw install
RUN npm ci --ignore-scripts
# Explicitly generate the Prisma client after deps are installed
RUN npx prisma generate

############################
# 2. builder — compile Next
############################
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma needs OPENSSL + schema; build script runs `prisma generate && next build`
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

############################
# 3. runner — minimal image
############################
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl tini curl \
    && addgroup --system --gid 1001 nodejs \
    && adduser  --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5500
ENV HOSTNAME=0.0.0.0

# Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma engines + schema (runtime client is already bundled in standalone)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Migration tooling (Prisma CLI + tsx + their transitive deps) installed into
# a self-contained subtree. Used by the K8s migrate Job — not by the web runtime.
RUN mkdir -p /opt/tools \
 && cd /opt/tools \
 && npm init -y >/dev/null \
 && npm install --omit=dev --no-audit --no-fund --ignore-scripts \
      prisma@6.19.3 tsx@4.19.2 bcryptjs@2.4.3 @prisma/client@6.19.3 \
 && chown -R nextjs:nodejs /opt/tools
ENV PATH="/opt/tools/node_modules/.bin:${PATH}"

USER nextjs
EXPOSE 5500

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:5500/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
