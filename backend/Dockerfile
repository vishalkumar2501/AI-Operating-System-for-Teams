# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat openssl

# Copy workspace package manifests
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy shared package source and build it
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=@teamos/shared

# Copy Backend source and Prisma schema
COPY backend/ ./backend/

# Generate Prisma client and build Backend API
RUN npx prisma generate --schema=./backend/prisma/schema.prisma
RUN npm run build --workspace=@teamos/api

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl curl

ENV NODE_ENV=production
ENV PORT=5000

# Create app directory with non-root user permissions
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 teamos

# Copy necessary files from builder
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/package.json

# Set ownership
RUN chown -R teamos:nodejs /app

USER teamos

EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "backend/dist/server.js"]
