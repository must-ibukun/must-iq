import { PrismaClient } from "./generated-client";

export interface DocumentChunk {
    id: string;
    content: string;
    source: string;       // filename or URL
    page?: number;
    score: number;        // relevance score 0-1
    workspace?: string;   // namespace isolation
    layer?: string;       // architectural layer (mobile | backend | web | docs | etc.)
}

// Define extended methods interface
export interface ExtendedModelMethods {
    hardDeleteOne: (args: any) => Promise<any>;
    hardDeleteMany: (args: any) => Promise<any>;
    restoreOne: (args: any) => Promise<any>;
    findIncludingDeleted: (args: any) => Promise<any>;
    findManyIncludingDeleted: (args: any) => Promise<any>;
}

// Type for extended Prisma models
// We use a simpler approach to avoid OOM in the type-checker.
export type ExtendedPrismaModels = {
    [K in keyof PrismaClient]: PrismaClient[K] & Partial<ExtendedModelMethods>;
};
