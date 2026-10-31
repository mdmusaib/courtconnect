FROM node:20-alpine AS builder
WORKDIR /app

# Install libc6-compat for Prisma compatibility on Alpine Linux
RUN apk add --no-cache libc6-compat

# Copy package files AND prisma directory first
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (this will run postinstall / prisma generate successfully)
RUN npm ci --no-audit --no-fund

# Copy the rest of the source code
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 10000
ENV HOSTNAME "0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 10000

CMD ["node", "server.js"]