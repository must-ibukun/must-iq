import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SlackMessage {
    user?: string;
    username?: string;
    text: string;
    ts: string;
}

@Injectable()
export class SlackService {
    private readonly logger = new Logger(SlackService.name);

    /**
     * Validate bot permissions/scopes using Slack auth.test API.
     * Required scopes for ingestion: channels:history, groups:history, im:history (optional), mpim:history
     */
    async validatePermissions(token: string): Promise<{ ok: boolean; error?: string; scopes?: string[] }> {
        try {
            this.logger.log('Validating Slack bot permissions...');

            const res = await axios.post('https://slack.com/api/auth.test', null, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = res.data;

            if (!data.ok) {
                this.logger.error(`Slack auth.test failed: ${data.error}`);
                return { ok: false, error: data.error };
            }

            // auth.test doesn't return scopes in the JSON body — they're in the 'x-oauth-scopes' header
            const scopes = (res.headers['x-oauth-scopes'] as string)?.split(',').map(s => s.trim()) || [];

            const required = ['channels:history', 'groups:history'];
            const missing = required.filter(s => !scopes.includes(s));

            if (missing.length > 0) {
                const msg = `Missing required Slack scopes: ${missing.join(', ')}`;
                this.logger.warn(msg);
                return { ok: false, error: 'missing_scope', scopes };
            }

            this.logger.log('Slack permissions validated successfully.');
            return { ok: true, scopes };
        } catch (err: any) {
            this.logger.error(`Failed to validate Slack permissions: ${err.message}`);
            return { ok: false, error: 'network_error' };
        }
    }

    async fetchThread(channelId: string, threadTs: string, token: string): Promise<SlackMessage[]> {
        try {
            const res = await axios.get('https://slack.com/api/conversations.replies', {
                headers: { Authorization: `Bearer ${token}` },
                params: { channel: channelId, ts: threadTs },
            });

            const data = res.data;

            if (!data.ok) {
                this.logger.error(`conversations.replies failed: ${data.error}`);
                return [];
            }

            return (data.messages || []) as SlackMessage[];
        } catch (err: any) {
            this.logger.error(`fetchThread error: ${err.message}`);
            return [];
        }
    }

    async postMessage(channelId: string, text: string, token: string, threadTs?: string): Promise<boolean> {
        try {
            const body: Record<string, string> = { channel: channelId, text };
            if (threadTs) body.thread_ts = threadTs;

            const res = await axios.post('https://slack.com/api/chat.postMessage', body, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = res.data;

            if (!data.ok) {
                this.logger.error(`chat.postMessage failed: ${data.error}`);
                return false;
            }

            return true;
        } catch (err: any) {
            this.logger.error(`postMessage error: ${err.message}`);
            return false;
        }
    }
}
