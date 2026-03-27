import { Injectable, Logger } from '@nestjs/common';
import { getActiveSettings } from '@must-iq/config';
import { runAIQuery } from '@must-iq/langchain';
import { SlackService } from './slack.service';
import { JiraService } from './jira.service';

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);

    constructor(
        private readonly slackService: SlackService,
        private readonly jiraService: JiraService,
    ) { }

    /**
     * Handle Slack Webhook (Events API)
     * Supports:
     *   - url_verification (Slack handshake)
     *   - app_mention  → fetch thread → call MustIQ chat → create Jira card → reply
     *   - reaction_added (✅) → ingest thread into knowledge base
     */
    async handleSlackWebhook(payload: any) {
        this.logger.log(`Processing Slack webhook: ${payload.type}`);

        if (payload.type === 'url_verification') {
            return { challenge: payload.challenge };
        }

        const event = payload.event;
        if (!event) return { success: true };

        // ── app_mention: @must-iq was mentioned in a thread/channel ──
        if (event.type === 'app_mention') {
            // Run async so Slack's 3-second ack deadline is met
            this.handleAppMention(event).catch(err =>
                this.logger.error(`app_mention handler failed: ${err.message}`)
            );
            return { success: true };
        }

        return { success: true };
    }

    /**
     * Full app_mention flow:
     * 1. Fetch thread (conversations.replies)
     * 2. Call MustIQ chat API (non-streaming) to get title/description/priority
     * 3. Create Jira card
     * 4. Reply in Slack with the card link
     */
    private async handleAppMention(event: any): Promise<void> {
        const channelId: string = event.channel;
        // If the mention is inside a thread use thread_ts; otherwise use the message ts
        const threadTs: string = event.thread_ts || event.ts;

        const settings = await getActiveSettings();
        const token = settings.slackBotToken || process.env.SLACK_BOT_TOKEN;

        if (!token) {
            this.logger.error('No Slack bot token configured — cannot handle app_mention');
            return;
        }

        // 1. Fetch full thread
        const messages = await this.slackService.fetchThread(channelId, threadTs, token);
        if (messages.length === 0) {
            await this.slackService.postMessage(
                channelId,
                'I could not read this thread. Please check my channel permissions.',
                token,
                threadTs,
            );
            return;
        }

        // 2. Build thread context for the AI
        const threadText = messages
            .map(m => `${m.username || m.user || 'user'}: ${m.text}`)
            .join('\n');

        const prompt = `You are analyzing a Slack thread to create a Jira task card.

Slack thread:
${threadText}

Based on the thread above, respond with ONLY a valid JSON object (no markdown, no explanation):
{
  "title": "concise task title (max 100 chars)",
  "description": "detailed description of the issue or task based on the thread discussion",
  "priority": "Critical|High|Medium|Low"
}`;

        // 3. Call MustIQ chat (non-streaming — for integrations)
        let cardData: { title: string; description: string; priority: string };
        try {
            const result = await runAIQuery({
                query: prompt,
                userId: 'slack-bot',
                workspace: 'general',
                sessionId: `slack-${channelId}-${threadTs}`,
                history: [],
                useAgent: false,
                stream: false,
            });

            const jsonMatch = result.response.match(/\{[\s\S]*?\}/);
            if (!jsonMatch) throw new Error('No JSON found in AI response');
            cardData = JSON.parse(jsonMatch[0]);
        } catch (err: any) {
            this.logger.error(`Failed to parse AI response: ${err.message}`);
            await this.slackService.postMessage(
                channelId,
                'I analyzed the thread but could not extract structured data. Please try again.',
                token,
                threadTs,
            );
            return;
        }

        // 4. Create Jira issue
        const projectKey = process.env.JIRA_PROJECT_KEY || 'MSQ';
        const issue = await this.jiraService.createIssue({
            projectKey,
            summary: cardData.title,
            description: cardData.description,
            priority: cardData.priority,
        });

        if (!issue) {
            await this.slackService.postMessage(
                channelId,
                `I analyzed this thread and extracted:\n• *Title:* ${cardData.title}\n• *Priority:* ${cardData.priority}\n\nHowever, I could not create the Jira card. Please check the Jira configuration.`,
                token,
                threadTs,
            );
            return;
        }

        // 5. Reply in Slack with the card link
        await this.slackService.postMessage(
            channelId,
            `:jira: Jira card created from this thread:\n*<${issue.url}|${issue.key}: ${cardData.title}>*\nPriority: ${cardData.priority}`,
            token,
            threadTs,
        );

        this.logger.log(`Created Jira issue ${issue.key} from Slack thread ${channelId}/${threadTs}`);
    }

    /**
     * Handle GitHub Webhook
     * e.g. PR merged
     */
}
