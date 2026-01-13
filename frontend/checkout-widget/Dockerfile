# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage - Serve as standalone SDK
FROM node:18-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve

COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD ["serve", "-s", "dist", "-l", "3002"]
