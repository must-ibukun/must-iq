import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { SlackService } from './slack.service';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [IntegrationsController],
    providers: [IntegrationsService, SlackService],
    exports: [IntegrationsService, SlackService]
})
export class IntegrationsModule { }
