import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, Max, Min, IsISO8601 } from 'class-validator';

export class DateRangeDto {
    @IsOptional()
    @IsISO8601()
    startDate?: string;

    @IsOptional()
    @IsISO8601()
    endDate?: string;
}

export enum PaginationOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

import { PaginationMetaDtoParameters } from '../interfaces/pagination.interface';

const DEFAULT_START_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

export class PaginationOptionsDto extends DateRangeDto {
    @IsEnum(PaginationOrder)
    @IsOptional()
    readonly order?: PaginationOrder = PaginationOrder.DESC;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    readonly page?: number = DEFAULT_START_PAGE;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    readonly size?: number = DEFAULT_PAGE_SIZE;

    get skip(): number {
        return ((this.page || DEFAULT_START_PAGE) - 1) * (this.size || DEFAULT_PAGE_SIZE);
    }
}

export class PaginationMetaDto {
    readonly page: number;
    readonly size: number;
    readonly totalItems: number;
    readonly totalPages: number;
    readonly hasPreviousPage: boolean;
    readonly hasNextPage: boolean;

    constructor({
        paginationOptionsDto,
        itemCount,
    }: PaginationMetaDtoParameters) {
        this.page = paginationOptionsDto?.page ?? DEFAULT_START_PAGE;
        this.size = paginationOptionsDto?.size ?? DEFAULT_PAGE_SIZE;
        this.totalItems = itemCount;
        this.totalPages = this.size > 0 ? Math.ceil(this.totalItems / this.size) : 0;
        this.hasPreviousPage = this.page > 1;
        this.hasNextPage = this.page < this.totalPages;
    }
}

export class Pagination<T, D = any> {
    @IsArray()
    readonly data: T[];

    readonly meta: PaginationMetaDto;
    readonly additionalData?: D;

    constructor(data: T[], meta: PaginationMetaDto, additionalData?: D) {
        this.data = data;
        this.meta = meta;
        this.additionalData = additionalData;
    }
}
