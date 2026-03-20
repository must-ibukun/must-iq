import { IsOptional, IsString } from 'class-validator';
import { PaginationOptionsDto } from '../../common/dto/pagination.dto';

export class IngestionHistoryQueryDto extends PaginationOptionsDto {
    @IsOptional()
    @IsString()
    type?: string;
}
