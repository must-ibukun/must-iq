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

// Adapting IBasePrisma to generic Record<string, any> for JSON values 
// since Prisma might not be available the same way in the frontend
export type IBasePrisma<T> = Omit<
    T,
    'createdBy' | 'updatedBy' | 'deletedBy'
> & {
    createdBy?: Record<string, any> | null;
    updatedBy?: Record<string, any> | null;
    deletedBy?: Record<string, any> | null;
};
