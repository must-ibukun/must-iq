import { IBasePrisma } from '../types/prisma.type';

export function convertPrismaModelToIInterface<T>(item: IBasePrisma<T>): T {
    if (!item) return item;

    return {
        ...item,
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
