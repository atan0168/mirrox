# Multi-stage Dockerfile for production-ready TypeScript Express app

# ---- Builder stage: install dev deps and build TS -> JS ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leveraging Docker layer cache)
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY src ./src
RUN npm run build


# ---- Runner stage: minimal production image ----
FROM node:20-alpine AS runner

ENV NODE_ENV=production \
  PORT=3000 \
  NODE_OPTIONS=--enable-source-maps

WORKDIR /app

# Install curl for healthcheck (tiny) and set timezone data
RUN apk add --no-cache curl tzdata

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
  && npm cache clean --force

# Copy compiled app from builder
COPY --from=builder /app/dist ./dist

# Use non-root user for better security
USER node

EXPOSE 3000

# Basic container healthcheck against the app's health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD sh -c "curl -fsS http://localhost:${PORT}/api/health > /dev/null || exit 1"

# Start the app
CMD ["node", "dist/index.js"]

