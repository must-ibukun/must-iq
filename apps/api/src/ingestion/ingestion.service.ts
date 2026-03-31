import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService, Prisma } from '@must-iq/db';
import pLimit from 'p-limit';
import { IngestionStatus } from '@must-iq/db';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ingestFile } from '@must-iq/langchain/rag/ingest';
import AdmZip from 'adm-zip';
import { IGNORED_DIRECTORIES, ALLOWED_FILE_EXTENSIONS, IGNORED_FILE_PATTERNS } from '@must-iq/shared-types';
import { IngestionResult, PaginatedResponse, IngestionEvent, BulkIngestRequest } from '@must-iq/shared-types';
import {
    pullSlackData,
    pullRepoPRs,
    pullJiraIssues
} from '@must-iq/langchain';
import { SlackService } from '../integrations/slack.service';
import { getActiveSettings } from '@must-iq/config';
import { sanitizeError } from '../common/helpers/error.helper';

@Injectable()
export class IngestionService {
    private readonly logger = new Logger(IngestionService.name);
    private readonly uploadDir = path.join(os.tmpdir(), 'must-iq-uploads');

    constructor(
        private readonly prisma: PrismaService,
        private readonly slackService: SlackService
    ) {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async ingestFileBuffer(
        buffer: Buffer,
        originalName: string,
        workspace: string,
    ): Promise<IngestionResult> {
        const isZip = originalName.toLowerCase().endsWith('.zip');
        const tmpPath = path.join(this.uploadDir, `${Date.now()}-${originalName}`);

        if (!isZip) {
            fs.writeFileSync(tmpPath, buffer);
            this.logger.log(`Ingesting file: ${originalName} → workspace: ${workspace}`);
            let chunksStored = 0;
            let status: IngestionStatus = IngestionStatus.STORED;
            let errorMessage: string | undefined;
            const wsRecord = await this.prisma.workspace.findFirst({
                where: { OR: [{ id: workspace }, { identifier: workspace }] }
            });

            if (!wsRecord) {
                throw new BadRequestException(`Workspace '${workspace}' not found. Please ensure the workspace exists before ingesting.`);
            }
            const layer = wsRecord.layer || 'docs';

            try {
                const result = await ingestFile(tmpPath, workspace, 'RETRIEVAL_DOCUMENT', undefined, layer);
                chunksStored = result?.chunksStored ?? 0;
            } catch (err: any) {
                const sanitized = sanitizeError(err);
                this.logger.error(`Ingestion failed: ${sanitized.technicalDetails}`);

                status = IngestionStatus.ERROR;
                errorMessage = sanitized.message;
            } finally {
                try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
            }
            if (status !== IngestionStatus.ERROR) {
                await this.prisma.ingestionEvent.create({
                    data: {
                        sourceId: originalName,
                        sourceType: 'doc',
                        workspace,
                        status,
                        chunksStored,
                        metadata: { originalName, uploadedAt: new Date().toISOString() },
                    },
                });
            }
            return { status, chunksStored, workspace, source: originalName, error: errorMessage, zipUpload: false };
        } else {
            this.logger.log(`Ingesting ZIP: ${originalName} → workspace: ${workspace}`);
            const extractDir = path.join(this.uploadDir, `${Date.now()}-extracted`);
            fs.mkdirSync(extractDir, { recursive: true });

            let totalChunks = 0;
            let status: IngestionStatus = IngestionStatus.STORED;
            let errorMessage: string | undefined;

            const wsRecord = await this.prisma.workspace.findFirst({
                where: { OR: [{ id: workspace }, { identifier: workspace }] }
            });

            if (!wsRecord) {
                throw new BadRequestException(`Workspace '${workspace}' not found. Please ensure the workspace exists before ingesting.`);
            }
            const layer = wsRecord.layer || 'docs';

            try {
                const zip = new AdmZip(buffer);
                zip.extractAllTo(extractDir, true);

                const collectFiles = (dir: string, result: { filePath: string; relativeFilePath: string }[] = []) => {
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        const filePath = path.join(dir, file);
                        const stats = fs.statSync(filePath);
                        if (stats.isDirectory()) {
                            if (IGNORED_DIRECTORIES.includes(file)) continue;
                            collectFiles(filePath, result);
                        } else {
                            const ext = path.extname(file).toLowerCase();
                            if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) continue;
                            const isIgnored = IGNORED_FILE_PATTERNS.some(p => file.toLowerCase().includes(p));
                            if (isIgnored) {
                                this.logger.debug(`Skipping ignored file: ${file}`);
                                continue;
                            }
                            result.push({ filePath, relativeFilePath: path.relative(extractDir, filePath) });
                        }
                    }
                    return result;
                };

                const allFiles = collectFiles(extractDir);
                // Keep concurrency at 1 — Supabase session-mode pool_size is exhausted by parallel Prisma connections
                const limit = pLimit(1);
                const results = await Promise.all(
                    allFiles.map(({ filePath, relativeFilePath }) =>
                        limit(async () => {
                            try {
                                const result = await ingestFile(filePath, workspace, 'RETRIEVAL_DOCUMENT', relativeFilePath, layer);
                                return result?.chunksStored ?? 0;
                            } catch (e) {
                                this.logger.warn(`Failed to ingest ${relativeFilePath} in ZIP: ${e.message}`);
                                return 0;
                            }
                        })
                    )
                );
                totalChunks = results.reduce((sum, n) => sum + n, 0);
            } catch (err: any) {
                const sanitized = sanitizeError(err);
                this.logger.error(`ZIP Ingestion failed: ${sanitized.technicalDetails}`);
                status = IngestionStatus.ERROR;
                errorMessage = sanitized.message;
            } finally {
                try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch { /* ignore */ }
            }

            if (status !== IngestionStatus.ERROR) {
                await this.prisma.ingestionEvent.create({
                    data: {
                        sourceId: originalName,
                        sourceType: 'manual-repo-zip',
                        workspace,
                        status,
                        chunksStored: totalChunks,
                        metadata: { originalName, zipUpload: true, uploadedAt: new Date().toISOString() },
                    },
                });
            }
            return { status, chunksStored: totalChunks, workspace, source: originalName, error: errorMessage, zipUpload: true };
        }
    }

    async getIngestionEvents(query: { page?: number; size?: number; type?: string; startDate?: string; endDate?: string }): Promise<PaginatedResponse<IngestionEvent>> {
        const page = query.page || 1;
        const limit = query.size || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.IngestionEventWhereInput = {
            ...(query.type && { sourceType: query.type }),
            ...((query.startDate || query.endDate) && {
                createdAt: {
                    ...(query.startDate && { gte: new Date(query.startDate) }),
                    ...(query.endDate && { lte: new Date(query.endDate) }),
                },
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.ingestionEvent.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.ingestionEvent.count({ where }),
        ]);
        return {
            data: items as unknown as IngestionEvent[],
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async bulkIngest(payload: BulkIngestRequest) {
        const { teamId, workspaceIds, all, startDate, endDate } = payload;

        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        let targetWorkspaces: any[] = [];
        if (all && teamId) {
            targetWorkspaces = await this.prisma.workspace.findMany({
                where: { teams: { some: { id: teamId } } }
            });
        } else if (workspaceIds?.length) {
            targetWorkspaces = await this.prisma.workspace.findMany({
                where: { id: { in: workspaceIds } }
            });
        } else if (all && !teamId) {
            const generalWs = await this.prisma.workspace.findFirst({ where: { identifier: 'general' } });
            if (generalWs) targetWorkspaces = [generalWs];
        }

        if (targetWorkspaces.length === 0) {
            return { success: true, skipped: true, message: "No workspaces identified for ingestion" };
        }

        const stats = { started: targetWorkspaces.length, completed: 0, errors: 0 };

        for (const ws of targetWorkspaces) {
            const event = await this.prisma.ingestionEvent.create({
                data: {
                    sourceId: ws.id,
                    sourceType: `manual-${ws.type.toLowerCase()}`,
                    workspace: ws.identifier,
                    status: IngestionStatus.PROCESSING,
                    metadata: { manual: true, teamId, startDate, endDate } as any
                }
            });

            try {
                let promise: Promise<any>;
                switch (ws.type) {
                    case 'SLACK': {
                        const settings = await getActiveSettings();
                        if (settings.slackBotToken) {
                            const validation = await this.slackService.validatePermissions(settings.slackBotToken);
                            if (!validation.ok) {
                                const errorMsg = `🛑 Slack ingestion aborted: ${validation.error}. Please check your Slack App Scopes.`;
                                this.logger.error(errorMsg);
                                await this.prisma.ingestionEvent.update({
                                    where: { id: event.id },
                                    data: { status: IngestionStatus.ERROR, metadata: { error: errorMsg, scopes: validation.scopes } }
                                });
                                stats.errors++;
                                continue;
                            }
                        }
                        promise = pullSlackData(ws.identifier, ws.id, teamId || 'general', start, end);
                        break;
                    }
                    case 'GITHUB':
                        promise = pullRepoPRs(ws.identifier, ws.id, teamId || 'general', start, end);
                        break;
                    case 'JIRA':
                        promise = pullJiraIssues([ws.identifier], ws.id, teamId || 'general', start, end);
                        break;
                    default:
                        this.logger.warn(`Unsupported direct ingestion for type: ${ws.type}`);
                        continue;
                }

                await promise;
                await this.prisma.ingestionEvent.update({
                    where: { id: event.id },
                    data: { status: IngestionStatus.STORED, createdAt: new Date() }
                });
                stats.completed++;
            } catch (error) {
                const sanitized = sanitizeError(error);
                this.logger.error(`Ingestion error for ${ws.identifier}:`, sanitized.technicalDetails);
                await this.prisma.ingestionEvent.update({
                    where: { id: event.id },
                    data: { status: IngestionStatus.ERROR, metadata: { error: sanitized.message } }
                });
                stats.errors++;
            }
        }
        return stats;
    }
}
