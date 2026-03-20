// @must-iq/db — Database library entry point
export { PrismaClient, Prisma } from "./generated-client";
export * from "./pgvector";
export { PrismaService, prisma } from "./prisma.service";
export type { PrismaService as PrismaServiceType } from "./prisma.service";
