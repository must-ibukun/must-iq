import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SlackService {
    private readonly logger = new Logger(SlackService.name);

    /**
     * Validate bot permissions/scopes
     * Uses Slack auth.test API
     * Required scopes for ingestion: channels:history, groups:history, im:history (optional), mpim:history
     */
    async validatePermissions(token: string): Promise<{ ok: boolean; error?: string; scopes?: string[] }> {
        try {
            this.logger.log('Validating Slack bot permissions...');
            
            const res = await fetch('https://slack.com/api/auth.test', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await res.json();

            if (!data.ok) {
                this.logger.error(`Slack auth.test failed: ${data.error}`);
                return { ok: false, error: data.error };
            }

            // auth.test doesn't return list of scopes in the JSON body,
            // but they are available in the 'x-oauth-scopes' header.
            const scopes = res.headers.get('x-oauth-scopes')?.split(',').map(s => s.trim()) || [];
            
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
}
