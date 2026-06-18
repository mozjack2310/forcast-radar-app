# ==========================================
# Stage 1: Install Dependencies
# ==========================================
FROM node:20-alpine AS deps
# libc6-compat is required for Alpine Linux compatibility with some Node modules
RUN apk upgrade --no-cache  && apk add --no-cache libc6-compat
WORKDIR /app

# Copy package management files
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund 

# ==========================================
# Stage 2: Build the Application
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk upgrade --no-cache

# Copy dependencies from Stage 1
COPY --from=deps /app/node_modules ./node_modules
# Copy all source code
COPY . .

# Disable Next.js telemetry during the build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the standalone Next.js application
RUN npm run build

# ==========================================
# Stage 3: Production Runner
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk upgrade --no-cache

# Disable Next.js telemetry during the build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public directory (static assets)
COPY --from=builder /app/public ./public

# Copy the standalone build and static files, setting ownership to the non-root user
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the non-root user
USER nextjs

# Expose the listening port
EXPOSE 3000

# Set environment variables for the runtime server
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the standalone server
CMD ["node", "server.js"]