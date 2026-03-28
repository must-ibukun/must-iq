import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@must-iq/db';
import { getActiveSettings } from '@must-iq/config';
import { pullRepoPRs } from '@must-iq/langchain';

@Injectable()
export class GithubIngestCron {
    private readonly logger = new Logger(GithubIngestCron.name);
    private isRunning = false;

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Runs at 06:00 and 18:00 every day.
     * Discovers all GitHub workspaces configured in teams and ingests
     * merged PRs from the last 12 hours via pullRepoPRs.
     */
    @Cron('0 6,18 * * *', { name: 'github-ingest' })
    async ingestGithubRepos(): Promise<void> {
        if (this.isRunning) {
            this.logger.warn('GitHub ingest already in progress — skipping this run');
            return;
        }

        const settings = await getActiveSettings();

        if (!settings.repoIngestionEnabled || !settings.githubToken) {
            this.logger.log('GitHub ingestion disabled or token missing — skipping');
            return;
        }

        this.isRunning = true;
        this.logger.log('Starting scheduled GitHub ingestion...');

        try {
            const workspaces = await this.prisma.workspace.findMany({
                where: { type: 'GITHUB' },
                include: { teams: { select: { id: true, status: true } } },
            });

            this.logger.log(`Found ${workspaces.length} GitHub workspace(s)`);

            const since = new Date(Date.now() - 12 * 60 * 60 * 1000);

            for (const ws of workspaces) {
                const activeTeam = ws.teams.find(t => t.status === 'active') ?? ws.teams[0];
                const workspace = activeTeam?.id ?? 'general';
                const repo = ws.identifier; // e.g. "must-iq/api"

                try {
                    this.logger.log(`Ingesting GitHub repo ${repo} → workspace: ${workspace}`);
                    await pullRepoPRs(repo, workspace, activeTeam?.id, since);
                } catch (err: any) {
                    this.logger.error(`Failed to ingest repo ${repo}: ${err.message}`);
                }
            }

            this.logger.log('GitHub ingestion complete');
        } finally {
            this.isRunning = false;
        }
    }
}
