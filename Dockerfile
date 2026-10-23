# Multi-stage Dockerfile for OS Execution Replay & State Analysis System
# Stage 1: Build C Engine and Frontend Assets
FROM node:20-bookworm AS builder

# Install GCC, Make, and C libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    make \
    libc6-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci

# Copy entire codebase
COPY . .

# Compile C scheduling engine
RUN make -C engine clean && make -C engine all && make -C engine test

# Build frontend production bundle
RUN npm run build:client

# Stage 2: Minimal Production Runtime
FROM node:20-bookworm-slim AS runner

# Install libc/dependencies required for running the compiled C binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV ENGINE_PATH=/app/engine/cpu_scheduler

# Copy package manifests and production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled C engine from builder stage
COPY --from=builder /app/engine/cpu_scheduler /app/engine/cpu_scheduler
RUN chmod +x /app/engine/cpu_scheduler

# Copy server files and built client distribution
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "--loader", "tsx", "server/index.ts"]
