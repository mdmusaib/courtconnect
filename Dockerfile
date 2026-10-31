FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

# Copy assets and standalone server
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 8080

CMD ["node", "server.js"]