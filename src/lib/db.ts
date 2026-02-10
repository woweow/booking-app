import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma v7 runtime handles connection via prisma.config.ts
// The TypeScript type requires options but the runtime accepts no-arg construction
export const prisma =
  globalForPrisma.prisma ??
  new (PrismaClient as unknown as new () => PrismaClient)();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
