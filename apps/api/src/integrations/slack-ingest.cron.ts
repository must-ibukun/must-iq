import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@must-iq/db';
import { getActiveSettings } from '@must-iq/config';
import { pullSlackData } from '@must-iq/langchain';

@Injectable()
export class SlackIngestCron {
    private readonly logger = new Logger(SlackIngestCron.name);
    private isRunning = false;

    constructor(private readonly prisma: PrismaService) { }

    @Cron('0 6,18 * * *', { name: 'slack-ingest' })
    async ingestSlackChannels(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('Slack ingest already in progress — skipping this run');
            return;
        }

        const settings = await getActiveSettings();

        if (!settings.slackIngestionEnabled || !settings.slackBotToken) {
            this.logger.log('Slack ingestion disabled or token missing — skipping');
            return;
        }

        this.isRunning = true;
        this.logger.log('Starting scheduled Slack ingestion...');

        try {
            const channels = await this.getBotChannels(settings.slackBotToken);
            this.logger.log(`Bot is a member of ${channels.length} channel(s)`);

            const since = new Date(Date.now() - 12 * 60 * 60 * 1000);

            for (const channel of channels) {
                try {
                    const { workspace, projectId } = await this.resolveWorkspace(channel.id, channel.name);
                    this.logger.log(`Ingesting #${channel.name} → workspace: ${workspace}`);
                    await pullSlackData(channel.id, workspace, projectId, since);
                } catch (err: any) {
                    this.logger.error(`Failed to ingest channel ${channel.id}: ${err.message}`);
                }
            }

            this.logger.log('Slack ingestion complete');
        } finally {
            this.isRunning = false;
        }
    }

    private async getBotChannels(token: string): Promise<{ id: string; name: string }[]> {
        const channels: { id: string; name: string }[] = [];
        let cursor: string | undefined;

        do {
            const qs = new URLSearchParams({
                types: 'public_channel,private_channel',
                exclude_archived: 'true',
                limit: '200',
                ...(cursor ? { cursor } : {}),
            });

            const res = await fetch(`https://slack.com/api/conversations.list?${qs}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();

            if (!data.ok) {
                this.logger.error(`conversations.list failed: ${data.error}`);
                break;
            }

            for (const ch of data.channels || []) {
                if (ch.is_member) {
                    channels.push({ id: ch.id, name: ch.name });
                }
            }

            cursor = data.response_metadata?.next_cursor || undefined;
        } while (cursor);

        return channels;
    }

    /**
     * Map a Slack channel to a Must-IQ workspace by looking up the team identifiers.
     * Falls back to 'general' if no team claims this channel.
     */
    private async resolveWorkspace(channelId: string, channelName: string): Promise<{ workspace: string; projectId?: string }> {
        const team = await this.prisma.team.findFirst({
            where: {
                OR: [
                    { identifiers: { has: channelId } },
                    { identifiers: { has: channelName } },
                    { identifiers: { has: `#${channelName}` } },
                ],
            },
        });

        if (team) {
            return { workspace: team.id, projectId: team.id };
        }

        return { workspace: 'general' };
    }
}
