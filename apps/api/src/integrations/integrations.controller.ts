import { Controller, Post, Body, Headers, Logger, HttpStatus, HttpCode } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('webhooks')
export class IntegrationsController {
    private readonly logger = new Logger(IntegrationsController.name);

    constructor(private readonly integrationsService: IntegrationsService) { }

    @Post('slack')
    @HttpCode(HttpStatus.OK)
    async handleSlack(@Body() body: any) {
        return this.integrationsService.handleSlackWebhook(body);
    }

    @Post('github')
    @HttpCode(HttpStatus.OK)
    async handleGithub(@Body() body: any, @Headers('x-hub-signature-256') signature: string) {
        return this.integrationsService.handleGithubWebhook(body, signature);
    }

    @Post('jira')
    @HttpCode(HttpStatus.OK)
    async handleJira(@Body() body: any) {
        return this.integrationsService.handleJiraWebhook(body);
    }
}
