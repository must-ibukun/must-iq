import {
    Controller,
    Post,
    Get,
    Query,
    Req,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Body,
    BadRequestException,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestionService } from './ingestion.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { IngestionHistoryQueryDto } from './dto/ingestion.dto';
import { documentUploadOptions } from '../common/config/file-upload.config';

@Controller('admin/ingestion')
@UseGuards(AuthGuard, RolesGuard)
export class IngestionController {
    constructor(private readonly ingestionService: IngestionService) { }

    @Post('upload')
    @HttpCode(HttpStatus.CREATED)
    @Roles('ADMIN', 'MANAGER')
    @UseInterceptors(FileInterceptor('file', documentUploadOptions))
    async uploadDocument(
        @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
        @Body('workspace') workspace: string,
    ) {
        if (!file) throw new BadRequestException('No file provided');
        if (!workspace) throw new BadRequestException('Workspace is required');

        return this.ingestionService.ingestFileBuffer(
            file.buffer,
            file.originalname,
            workspace,
        );
    }

    @Get('events')
    @Roles('ADMIN', 'MANAGER')
    getEvents(@Query() query: IngestionHistoryQueryDto) {
        return this.ingestionService.getIngestionEvents(query);
    }

    @Post('bulk')
    @Roles('ADMIN', 'MANAGER')
    bulkIngest(@Body() body: any) {
        return this.ingestionService.bulkIngest(body);
    }
}
