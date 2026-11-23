# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace package manifests
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy shared package source and build it
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=@teamos/shared

# Copy web source
COPY apps/web/ ./apps/web/

# Build Web application
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=/
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

RUN npm run build --workspace=@teamos/web

# Production stage with Nginx
FROM nginx:1.27-alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
