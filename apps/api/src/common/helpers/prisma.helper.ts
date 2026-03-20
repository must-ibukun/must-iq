import { IBasePrisma } from '../types/prisma.type';

/**
 * Strips Prisma specific relational metadata or recursively parses specific
 * JSON fields dynamically if required. This ports the relationgifts-backend 
 * standard conversion helper logic for normalizing API payloads.
 */
export function convertPrismaModelToIInterface<T>(item: IBasePrisma<T>): T {
    if (!item) return item;

    return {
        ...item,
        // Provide safe defaults to strip metadata strings if they were fetched
        createdBy: item?.createdBy
            ? JSON.parse(JSON.stringify(item.createdBy))
            : undefined,
        deletedBy: item?.deletedBy
            ? JSON.parse(JSON.stringify(item.deletedBy))
            : undefined,
        updatedBy: item?.updatedBy
            ? JSON.parse(JSON.stringify(item.updatedBy))
            : undefined,
    } as unknown as T;
}
