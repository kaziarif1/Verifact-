# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs && adduser -S verifact -u 1001

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs /tmp/verifact-uploads && chown -R verifact:nodejs /app logs /tmp/verifact-uploads

USER verifact

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "dist/server.js"]
