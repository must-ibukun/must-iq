import { Controller, Post, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('webhooks')
export class IntegrationsController {
    constructor(private readonly integrationsService: IntegrationsService) { }

    @Post('slack')
    @HttpCode(HttpStatus.OK)
    async handleSlack(@Body() body: any) {
        return this.integrationsService.handleSlackWebhook(body);
    }
}
