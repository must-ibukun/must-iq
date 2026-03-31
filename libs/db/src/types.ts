import { PrismaClient } from "./generated-client";

export interface DocumentChunk {
    id: string;
    content: string;
    source: string;
    page?: number;
    score: number;
    workspace?: string;
    layer?: string;
    language?: string;
    techStack?: string;
}

export interface ExtendedModelMethods {
    hardDeleteOne: (args: any) => Promise<any>;
    hardDeleteMany: (args: any) => Promise<any>;
    restoreOne: (args: any) => Promise<any>;
    findIncludingDeleted: (args: any) => Promise<any>;
    findManyIncludingDeleted: (args: any) => Promise<any>;
}

// We use a simpler approach to avoid OOM in the type-checker.
export type ExtendedPrismaModels = {
    [K in keyof PrismaClient]: PrismaClient[K] & Partial<ExtendedModelMethods>;
};
