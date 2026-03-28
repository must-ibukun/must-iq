import { Injectable, Logger } from '@nestjs/common';
import { runAIQuery } from '@must-iq/langchain';
import { PrismaService } from '@must-iq/db';
import axios from 'axios';
import { SlackService } from './slack.service';
import { JiraService } from './jira.service';

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);

    constructor(
        private readonly slackService: SlackService,
        private readonly jiraService: JiraService,
        private readonly prisma: PrismaService,
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
     * 2. Resolve team workspace from channel
     * 3a. Ticket tags detected ([Requester], [Department], etc.)
     *     → pass thread directly as query → KB search → reply with response
     * 3b. Regular thread discussion
     *     → extract Jira card fields → create issue → reply with card link
     */
    private async handleAppMention(event: any): Promise<void> {
        const channelId: string = event.channel;
        // If the mention is inside a thread use thread_ts; otherwise use the message ts
        const threadTs: string = event.thread_ts || event.ts;

        const token =  process.env.SLACK_BOT_TOKEN;

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

        // 3. Resolve team workspace from channel
        const resolved = await this.resolveWorkspaceFromChannel(channelId, token);
        if (!resolved) {
            await this.slackService.postMessage(
                channelId,
                ':warning: Must-IQ has no knowledge base configured for this channel. Please ask your admin to link this channel to a workspace.',
                token,
                threadTs,
            );
            return;
        }
        const { workspace, workspaces } = resolved;

        // 4. Query knowledge base with the thread content
        let cardData: { title: string; description: string; priority: string };
        try {
            const result = await runAIQuery({
                query: threadText,
                userId: 'slack-bot',
                workspace,
                workspaces,
                sessionId: `slack-${channelId}-${threadTs}`,
                history: [],
                useAgent: false,
                stream: false,
                includeSources: false,
            });

            cardData = {
                title: this.extractTitle(threadText),
                description: result.response,
                priority: this.extractPriority(threadText),
            };
        } catch (err: any) {
            this.logger.error(`Failed to query AI: ${err.message}`);
            await this.slackService.postMessage(
                channelId,
                'I could not process this thread. Please try again.',
                token,
                threadTs,
            );
            return;
        }

        // 5. Create Jira issue
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

        // 6. Reply in Slack with the card link
        await this.slackService.postMessage(
            channelId,
            `:jira: Jira card created from this thread:\n*<${issue.url}|${issue.key}: ${cardData.title}>*\nPriority: ${cardData.priority}`,
            token,
            threadTs,
        );

        this.logger.log(`Created Jira issue ${issue.key} from Slack thread ${channelId}/${threadTs}`);
    }

    /** Extract a concise title from the first non-empty line of the thread. */
    private extractTitle(threadText: string): string {
        const firstLine = threadText.split('\n').map(l => l.trim()).find(l => l.length > 0) || 'Untitled';
        return firstLine.substring(0, 100);
    }

    /** Extract priority from thread text if a priority tag is present, else default to Medium. */
    private extractPriority(threadText: string): string {
        if (/\[Critical\]/i.test(threadText)) return 'Critical';
        if (/\[High\]/i.test(threadText)) return 'High';
        if (/\[Low\]/i.test(threadText)) return 'Low';
        return 'Medium';
    }

    /**
     * Fetch the human-readable channel name from Slack.
     * Falls back to channelId if the API call fails (e.g. missing scope).
     */
    private async fetchChannelName(channelId: string, token: string): Promise<string> {
        try {
            const res = await axios.get('https://slack.com/api/conversations.info', {
                headers: { Authorization: `Bearer ${token}` },
                params: { channel: channelId },
            });
            return res.data.ok ? res.data.channel.name : channelId;
        } catch {
            return channelId;
        }
    }

    /**
     * Resolve a Slack channel to a Must-IQ workspace.
     * Searches team.identifiers by channel name and channel ID.
     * Returns team.identifiers as workspaces so RAG spans all team sources.
     */
    private async resolveWorkspaceFromChannel(
        channelId: string,
        token: string,
    ): Promise<{ workspace: string; workspaces: string[] } | null> {
        const channelName = await this.fetchChannelName(channelId, token);

        const team = await this.prisma.team.findFirst({
            where: {
                OR: [
                    { identifiers: { has: channelName } },
                    { identifiers: { has: `#${channelName}` } },
                ],
            },
            select: { id: true, identifiers: true },
        });

        if (team) {
            this.logger.log(`Resolved channel ${channelName} → team ${team.id}`);
            return { workspace: team.id, workspaces: team.identifiers };
        }

        this.logger.warn(`No team found for channel ${channelName} (${channelId})`);
        return null;
    }

    /**
     * Handle GitHub Webhook
     * e.g. PR merged
     */
}
