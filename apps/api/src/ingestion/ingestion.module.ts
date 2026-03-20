import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '@must-iq/db';
import { IntegrationsModule } from '../integrations/integrations.module';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [IntegrationsModule, DatabaseModule],
    controllers: [IngestionController],
    providers: [IngestionService, PrismaService],
    exports: [IngestionService],
})
export class IngestionModule { }
