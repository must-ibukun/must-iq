import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { SlackService } from './slack.service';
import { JiraService } from './jira.service';
import { SlackIngestCron } from './slack-ingest.cron';
import { GithubIngestCron } from './github-ingest.cron';
import { JiraIngestCron } from './jira-ingest.cron';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule, ScheduleModule.forRoot()],
    controllers: [IntegrationsController],
    providers: [IntegrationsService, SlackService, JiraService, SlackIngestCron, GithubIngestCron, JiraIngestCron],
    exports: [IntegrationsService, SlackService, JiraService],
})
export class IntegrationsModule { }
