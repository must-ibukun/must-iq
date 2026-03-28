import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@must-iq/db';
import { getActiveSettings } from '@must-iq/config';
import { pullJiraIssues } from '@must-iq/langchain';

@Injectable()
export class JiraIngestCron {
    private readonly logger = new Logger(JiraIngestCron.name);
    private isRunning = false;

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Runs at 06:00 and 18:00 every day.
     * Discovers all Jira workspaces configured in teams and ingests
     * recently resolved issues from the last 12 hours via pullJiraIssues.
     */
    @Cron('0 6,18 * * *', { name: 'jira-ingest' })
    async ingestJiraProjects(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('Jira ingest already in progress — skipping this run');
            return;
        }

        const settings = await getActiveSettings();

        if (!settings.jiraIngestionEnabled || !settings.jiraApiToken) {
            this.logger.log('Jira ingestion disabled or token missing — skipping');
            return;
        }

        this.isRunning = true;
        this.logger.log('Starting scheduled Jira ingestion...');

        try {
            const workspaces = await this.prisma.workspace.findMany({
                where: { type: 'JIRA' },
                include: { teams: { select: { id: true, status: true } } },
            });

            this.logger.log(`Found ${workspaces.length} Jira workspace(s)`);

            const since = new Date(Date.now() - 12 * 60 * 60 * 1000);

            // Group project keys by team so we make one pullJiraIssues call per team
            // (pullJiraIssues accepts an array of project keys)
            const byTeam = new Map<string, { projectKeys: string[]; teamId: string }>();

            for (const ws of workspaces) {
                const activeTeam = ws.teams.find(t => t.status === 'active') ?? ws.teams[0];
                const teamId = activeTeam?.id ?? 'general';

                if (!byTeam.has(teamId)) {
                    byTeam.set(teamId, { projectKeys: [], teamId });
                }
                byTeam.get(teamId)!.projectKeys.push(ws.identifier);
            }

            for (const [workspace, { projectKeys, teamId }] of byTeam) {
                try {
                    this.logger.log(`Ingesting Jira projects [${projectKeys.join(', ')}] → workspace: ${workspace}`);
                    await pullJiraIssues(projectKeys, workspace, teamId, since);
                } catch (err: any) {
                    this.logger.error(`Failed to ingest Jira projects [${projectKeys.join(', ')}]: ${err.message}`);
                }
            }

            this.logger.log('Jira ingestion complete');
        } finally {
            this.isRunning = false;
        }
    }
}
