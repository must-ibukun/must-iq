import { PaginationOptionsDto } from '../dto/pagination.dto';

export interface PaginationMetaDtoParameters {
    paginationOptionsDto: Omit<PaginationOptionsDto, 'skip'> & { skip?: number };
    itemCount: number;
}
