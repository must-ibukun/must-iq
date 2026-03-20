export type IBasePrisma<T> = T & {
    createdBy?: any;
    deletedBy?: any;
    updatedBy?: any;
};
