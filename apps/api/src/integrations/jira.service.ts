import { Injectable, Logger } from '@nestjs/common';
import { getActiveSettings } from '@must-iq/config';

export interface JiraIssueResult {
    key: string;
    id: string;
    url: string;
}

@Injectable()
export class JiraService {
    private readonly logger = new Logger(JiraService.name);

    async createIssue(params: {
        projectKey: string;
        summary: string;
        description: string;
        priority?: string;
        issueType?: string;
    }): Promise<JiraIssueResult | null> {
        try {
            const settings = await getActiveSettings();
            const { jiraApiToken, jiraUserEmail, jiraBaseUrl } = settings;

            if (!jiraApiToken || !jiraUserEmail || !jiraBaseUrl) {
                this.logger.warn('Jira credentials not configured — skipping card creation');
                return null;
            }

            const auth = Buffer.from(`${jiraUserEmail}:${jiraApiToken}`).toString('base64');

            const body = {
                fields: {
                    project: { key: params.projectKey },
                    summary: params.summary,
                    description: {
                        type: 'doc',
                        version: 1,
                        content: [
                            {
                                type: 'paragraph',
                                content: [{ type: 'text', text: params.description }],
                            },
                        ],
                    },
                    issuetype: { name: params.issueType || 'Task' },
                    priority: { name: params.priority || 'Medium' },
                },
            };

            const res = await fetch(`${jiraBaseUrl}/rest/api/3/issue`, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errText = await res.text();
                this.logger.error(`Jira issue creation failed (${res.status}): ${errText}`);
                return null;
            }

            const data = await res.json();
            return {
                key: data.key,
                id: data.id,
                url: `${jiraBaseUrl}/browse/${data.key}`,
            };
        } catch (err: any) {
            this.logger.error(`JiraService.createIssue error: ${err.message}`);
            return null;
        }
    }
}
