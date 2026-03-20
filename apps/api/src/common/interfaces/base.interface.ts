import { Prisma } from '@must-iq/db';

export interface IBaseInterface {
    id: string;
    createdAt: Date | string;
    updatedAt?: Date | string;
    createdBy?: ICreator;
    deletedBy?: ICreator;
    updatedBy?: ICreator;
    deletedAt?: Date | string;
}

export interface ICreator {
    id: string;
    name: string;
    email: string;
}

export type IBasePrisma<T> = Omit<
    T,
    'createdBy' | 'updatedBy' | 'deletedBy'
> & {
    createdBy?: Prisma.JsonValue | null;
    updatedBy?: Prisma.JsonValue | null;
    deletedBy?: Prisma.JsonValue | null;
};
