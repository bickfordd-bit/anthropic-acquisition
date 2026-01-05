import { PrismaClient } from "@prisma/client";

function ensureDatabaseUrlFromPlatform(): void {
  if (process.env.DATABASE_URL) return;

  // Netlify DB (Neon) provides these env vars automatically.
  // Prefer unpooled for Prisma.
  const candidate = process.env.NETLIFY_DATABASE_URL_UNPOOLED ?? process.env.NETLIFY_DATABASE_URL;
  if (candidate) process.env.DATABASE_URL = candidate;
}

ensureDatabaseUrlFromPlatform();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
