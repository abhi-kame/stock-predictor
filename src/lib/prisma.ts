import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

let prismaClient: PrismaClient;

if (!globalForPrisma.prisma) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables.");
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool as any);
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: ["query"],
  });
}

prismaClient = globalForPrisma.prisma;

export const prisma = prismaClient;
