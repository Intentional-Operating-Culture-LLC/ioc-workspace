# Multi-stage build for dev-sandbox

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY apps/dev-sandbox/package*.json ./apps/dev-sandbox/
COPY libs/ ./libs/
COPY nx.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# Copy source code
COPY . .

# Build the dev-sandbox app
RUN npx nx build dev-sandbox --configuration=production

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/dist/apps/dev-sandbox ./
COPY --from=builder /app/apps/dev-sandbox/public ./public
COPY --from=builder /app/apps/dev-sandbox/package.json ./

# Copy node_modules for runtime dependencies
COPY --from=builder /app/node_modules ./node_modules

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["npm", "start"]