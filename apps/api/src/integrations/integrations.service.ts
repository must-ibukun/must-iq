import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@must-iq/db';
import {
    pullSlackData,
    processAndIngest
} from '@must-iq/langchain';

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Handle Slack Webhook (Events API)
     * e.g. reaction_added (check for ✅)
     */
    async handleSlackWebhook(payload: any) {
        this.logger.log(`Processing Slack webhook: ${payload.type}`);

        if (payload.type === 'url_verification') {
            return { challenge: payload.challenge };
        }

        const event = payload.event;
        if (event?.type === 'reaction_added' && event.reaction === 'white_check_mark') {
            const channelId = event.item.channel;
            const threadTs = event.item.ts;

            // Find associated team to get workspace context
            const team = await this.prisma.team.findFirst({
                where: { identifiers: { has: channelId } }
            });

            const workspace = team?.id || 'general';

            this.logger.log(`✅ Reaction detected in ${channelId}. Ingesting thread...`);
            // Note: pullSlackData should handle thread retrieval and ingestion
            // We implementation might need update to pull specific thread
            // For now, let's assume it pulls latest from channel or we extend it
            return { success: true, workspace };
        }

        return { success: true };
    }

    /**
     * Handle GitHub Webhook
     * e.g. PR merged
     */
    async handleGithubWebhook(payload: any, signature?: string) {
        this.logger.log(`Processing GitHub webhook: ${payload.action}`);

        if (payload.action === 'closed' && payload.pull_request?.merged) {
            const repoFullName = payload.repository.full_name;
            const pr = payload.pull_request;

            // Find associated team
            const team = await this.prisma.team.findFirst({
                where: { identifiers: { has: repoFullName } }
            });

            const workspace = team?.id || 'general';

            this.logger.log(`PR merged in ${repoFullName}. Ingesting PR summary...`);

            const content = `PR #${pr.number}: ${pr.title}\n\nDescription: ${pr.body}\n\nMerged at: ${pr.merged_at}`;
            await processAndIngest(
                content,
                pr.html_url,
                'github',
                workspace,
                team?.id
            );

            return { success: true };
        }

        return { success: true };
    }

    /**
     * Handle Jira Webhook
     * e.g. Issue resolved
     */
    async handleJiraWebhook(payload: any) {
        this.logger.log(`Processing Jira webhook: ${payload.webhookEvent}`);

        if (payload.webhookEvent === 'jira:issue_updated') {
            const issue = payload.issue;
            const status = issue.fields.status.name;

            if (status.toLowerCase() === 'done' || status.toLowerCase() === 'resolved') {
                const projectName = issue.fields.project.name;

                // Find associated team
                const team = await this.prisma.team.findFirst({
                    where: { identifiers: { has: projectName } }
                });

                const workspace = team?.id || 'general';

                this.logger.log(`Jira issue ${issue.key} resolved. Ingesting summary...`);

                const content = `Issue ${issue.key}: ${issue.fields.summary}\n\nDescription: ${issue.fields.description}\n\nResolution: ${issue.fields.resolution?.name}`;
                await processAndIngest(
                    content,
                    issue.key,
                    'jira',
                    workspace,
                    team?.id
                );

                return { success: true };
            }
        }

        return { success: true };
    }
}
