# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

# SECURITY FIX: Create and switch to non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# SECURITY FIX: Copy package-lock.json for reproducible builds
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src

# SECURITY FIX: Switch to non-root user
USER nextjs

EXPOSE 3000

CMD ["node", "dist/server.js"]
