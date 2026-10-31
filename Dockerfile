FROM node:20-alpine AS builder
WORKDIR /app

# Install libc6-compat for Prisma compatibility on Alpine Linux
RUN apk add --no-cache libc6-compat

COPY package*.json ./

# Install dependencies cleanly without audit overhead
RUN npm ci --no-audit --no-fund

COPY . .

# Generate Prisma Client explicitly before building Next.js
RUN npx prisma generate

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

# Expose Render default web port
EXPOSE 10000

CMD ["node", "server.js"]