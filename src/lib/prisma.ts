import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getOptimizedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      "[prisma] DATABASE_URL is not set; database queries will fail until a Neon connection string is provided.",
    );
    return undefined;
  }

  let optimized = url;

  // Use Neon PgBouncer (transaction mode) pooling so concurrent Netlify
  // serverless cold starts share a connection pool instead of each opening
  // a dedicated session and exhausting Neon max connections.
  if (optimized.includes("-pooler") && !optimized.includes("pgbouncer=true")) {
    const separator = optimized.includes("?") ? "&" : "?";
    optimized = `${optimized}${separator}pgbouncer=true`;
  }

  // Guard every connection attempt with a short timeout so a slow cold start
  // surfaces as a clear Prisma error instead of hanging the function.
  if (!optimized.includes("connect_timeout=")) {
    const separator = optimized.includes("?") ? "&" : "?";
    optimized = `${optimized}${separator}connect_timeout=15`;
  }

  return optimized;
}

const connectionUrl = getOptimizedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(connectionUrl
      ? {
          datasources: {
            db: { url: connectionUrl },
          },
        }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
