import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL is not defined in Vercel Environment Variables.");
    return new PrismaClient();
  }
  try {
    const pool = new Pool({
      connectionString,
      max: 5, // Limit pool size to 5 connections per serverless instance to prevent EMAXCONNSESSION
      idleTimeoutMillis: 10000, // Close idle connections quickly
      connectionTimeoutMillis: 10000,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  } catch (e) {
    console.warn("Failed to initialize PrismaPg adapter, falling back to standard PrismaClient:", e);
    return new PrismaClient();
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Store singleton on globalThis to prevent pool exhaustion in production and dev
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}

