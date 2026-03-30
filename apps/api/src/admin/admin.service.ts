import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { join } from 'path';
import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { Prisma, PrismaService } from '@must-iq/db';
import { hash } from 'bcrypt';
import {
    AdminUser, AdminTeam, AuditLogEntry, IngestionEvent,
    AdminWorkspace, AdminStats, AdminTokenUsage, BulkIngestRequest,
    RequestUser
} from '@must-iq/shared-types';
import {
    PaginationOptionsDto, Pagination, PaginationMetaDto,
} from '../common/dto/pagination.dto';
import { convertPrismaModelToIInterface } from '../common/helpers/prisma.helper';
import { getActiveSettings } from '@must-iq/config';
import { IngestionService } from '../ingestion/ingestion.service';
import { sanitizeError } from '../common/helpers/error.helper';
import { MailService } from '../notification/mail.service';


// Removed redundant RequestUser interface (moved to shared-types)

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly ingestionService: IngestionService,
        private readonly mailService: MailService,
    ) { }

    // ── Overview stats ────────────────────────────────────────────
    async getStats(user: RequestUser): Promise<AdminStats> {
        const isManager = user.role === 'MANAGER';
        const teamIds = user.teamIds || [];

        const where: any = isManager ? { teams: { some: { id: { in: teamIds } } } } : {};
        const sessionWhere: any = isManager ? { userId: { in: await this.getUserIdsInTeams(teamIds) } } : {};
        const messageWhere: any = isManager ? { userId: { in: await this.getUserIdsInTeams(teamIds) } } : {};
        const tokenWhere: any = {
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            ...(isManager && { userId: { in: await this.getUserIdsInTeams(teamIds) } })
        };
        const userTeams = isManager ? await this.prisma.team.findMany({
            where: { id: { in: teamIds } },
            include: { workspaces: { select: { identifier: true } } }
        }) : [];
        const identifiers = [...new Set(userTeams.flatMap(t => (t as any).workspaces.map((w: any) => w.identifier)))];
        const chunkWhere: any = isManager ? { workspace: { in: identifiers } } : {};

        const [totalUsers, totalSessions, totalMessages, tokenLogs, chunksByWorkspace] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.chatSession.count({ where: sessionWhere }),
            this.prisma.message.count({ where: messageWhere }),
            this.prisma.tokenLog.findMany({
                where: tokenWhere,
                select: { totalTokens: true, cached: true },
            }),
            this.prisma.documentChunk.groupBy({
                by: ['workspace'],
                where: chunkWhere,
                _count: { id: true },
            }),
        ] as any[]);

        const tokensToday = tokenLogs.reduce((sum, l) => sum + l.totalTokens, 0);
        const cacheHits = tokenLogs.filter(l => l.cached).length;
        const cacheRate = tokenLogs.length ? Math.round((cacheHits / tokenLogs.length) * 100) : 0;

        return {
            totalUsers,
            totalSessions,
            totalMessages,
            tokensToday,
            cacheRate,
            chunksByWorkspace: chunksByWorkspace.map((r: any) => ({
                workspace: r.workspace,
                count: r._count?.id ?? 0,
            })),
        };
    }

    // ── Users ─────────────────────────────────────────────────────
    async getUsers(query: PaginationOptionsDto, user: RequestUser): Promise<Pagination<AdminUser>> {
        const isManager = user.role === 'MANAGER';
        const teamIds = user.teamIds || [];

        const where: any = isManager ? { teams: { some: { id: { in: teamIds } } } } : {};

        const [count, items] = await Promise.all([
            this.prisma.user.count({ where }),
            this.prisma.user.findMany({
                where,
                orderBy: { createdAt: query.order === 'ASC' ? 'asc' : 'desc' },
                skip: query.skip,
                take: query.size,
                select: {
                    id: true, name: true, email: true, role: true,
                    teams: { select: { id: true, name: true } },
                    isActive: true, createdAt: true,
                    lastActiveAt: true, tokenBudgetOverride: true,
                },
            }),
        ]);

        // Today's token usage per user
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayLogs = await this.prisma.tokenLog.groupBy({
            by: ['userId'],
            where: { createdAt: { gte: todayStart } },
            _sum: { totalTokens: true },
        });
        const todayMap = new Map(todayLogs.map(l => [l.userId, l._sum.totalTokens ?? 0]));

        const users: AdminUser[] = items.map(item => {
            const base = convertPrismaModelToIInterface<AdminUser>(item as any);
            return {
                ...base,
                teamIds: (item.teams || []).map((t: any) => t.id),
                tokensToday: todayMap.get(item.id) ?? 0,
                tokenBudget: item.tokenBudgetOverride ?? 20000,
            };
        });

        const meta = new PaginationMetaDto({ paginationOptionsDto: query, itemCount: count });
        return new Pagination<AdminUser>(users, meta);
    }

    async inviteUser(data: { email: string; name: string; role: string; teamIds?: string[] }) {
        const tempPassword = Math.random().toString(36).slice(-8);
        const passwordHash = await hash(tempPassword, 10);
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                role: data.role as any,
                teams: data.teamIds ? { connect: data.teamIds.map(id => ({ id })) } : undefined,
                passwordHash,
                mustChangePassword: true,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'admin.user_invited',
                metadata: { role: data.role, teamIds: data.teamIds }
            }
        });

        const loginUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/login`;
        try {
            await this.mailService.sendUserInvite(data.email, data.name, data.email, tempPassword, loginUrl);
        } catch {
            this.logger.warn(`Invite email failed for ${data.email} — user created but email not sent`);
        }

        const result = convertPrismaModelToIInterface<AdminUser>(user as any);
        return { ...result, tempPassword };
    }

    async updateUser(id: string, data: { name?: string; teamIds?: string[]; role?: string; isActive?: boolean; tokenBudgetOverride?: number }) {
        const user = await this.prisma.user.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name.trim() }),
                teams: data.teamIds ? { set: data.teamIds.map(id => ({ id })) } : undefined,
                role: data.role as any,
                isActive: data.isActive,
                tokenBudgetOverride: data.tokenBudgetOverride,
            },
            select: {
                id: true, name: true, email: true, role: true,
                teams: { select: { id: true, name: true } },
                isActive: true, createdAt: true,
                tokenBudgetOverride: true,
            }
        });

        // Audit log for update
        await this.prisma.auditLog.create({
            data: {
                userId: id,
                action: 'admin.user_updated',
                metadata: {
                    name: data.name,
                    role: data.role,
                    teamIds: data.teamIds,
                    isActive: data.isActive,
                    tokenBudgetOverride: data.tokenBudgetOverride
                }
            }
        });

        return convertPrismaModelToIInterface<AdminUser>(user as any);
    }

    async updateUserTeams(id: string, teamIds: string[], requester: RequestUser) {
        const isManager = requester.role === 'MANAGER';
        const requesterTeamIds = requester.teamIds || [];

        if (isManager) {
            // Managers can only update teams they have access to.
            // We need to keep memberships in teams they DON'T have access to.
            const user = await this.prisma.user.findUnique({
                where: { id },
                include: { teams: { select: { id: true } } }
            });

            if (!user) throw new Error("User not found");

            const otherTeams = user.teams
                .filter(t => !requesterTeamIds.includes(t.id))
                .map(t => t.id);

            // Intersection of requested teams and manager's teams
            const allowedRequestedTeams = teamIds.filter(tid => requesterTeamIds.includes(tid));

            // Final set: teams the user had that the manager can't see + teams the manager invited them to
            const finalTeamIds = [...new Set([...otherTeams, ...allowedRequestedTeams])];

            await this.prisma.user.update({
                where: { id },
                data: {
                    teams: { set: finalTeamIds.map(tid => ({ id: tid })) }
                }
            });
        } else {
            // Admins can set teams directly
            await this.prisma.user.update({
                where: { id },
                data: {
                    teams: { set: teamIds.map(tid => ({ id: tid })) }
                }
            });
        }

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                userId: id,
                action: 'admin.user_teams_updated',
                metadata: { teamIds, updatedBy: requester.sub }
            }
        });

        return { success: true };
    }

    // ── Token usage ───────────────────────────────────────────────
    async getTokenUsage(user: RequestUser): Promise<AdminTokenUsage> {
        const isManager = user.role === 'MANAGER';
        const teamIds = user.teamIds || [];
        const scopedUserIds = isManager ? await this.getUserIdsInTeams(teamIds) : null;

        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const where: Prisma.TokenLogFindManyArgs['where'] = {
            createdAt: { gte: sevenDaysAgo },
            ...(scopedUserIds && { userId: { in: scopedUserIds } })
        };

        const weeklyLogs = await this.prisma.tokenLog.findMany({
            where,
            select: { totalTokens: true, cached: true, createdAt: true, userId: true },
        });

        // Group by day (YYYY-MM-DD key)
        const dailyMap: Record<string, number> = {};
        for (const log of weeklyLogs) {
            const day = log.createdAt.toISOString().slice(0, 10);
            dailyMap[day] = (dailyMap[day] ?? 0) + log.totalTokens;
        }

        // Top users today
        const todayLogs = weeklyLogs.filter(l => l.createdAt >= todayStart);
        const userMap = new Map<string, number>();
        for (const log of todayLogs) {
            userMap.set(log.userId, (userMap.get(log.userId) ?? 0) + log.totalTokens);
        }

        const topUserIds = [...userMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topUsers = await Promise.all(
            topUserIds.map(async ([userId, tokens]) => {
                const user = await this.prisma.user.findUnique({
                    where: { id: userId }, select: { name: true },
                });
                return { name: user?.name ?? userId, tokens };
            })
        );

        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayLogs = weeklyLogs.filter(l => l.createdAt >= yesterdayStart && l.createdAt < todayStart);

        const todayTotal = todayLogs.reduce((s, l) => s + l.totalTokens, 0);
        const yesterdayTotal = yesterdayLogs.reduce((s, l) => s + l.totalTokens, 0);

        // Blended cost estimate: ~$0.003 per 1K tokens (rough average across providers)
        const costPer1K = 0.003;
        const estCostToday = parseFloat(((todayTotal / 1000) * costPer1K).toFixed(2));
        const estCostYesterday = parseFloat(((yesterdayTotal / 1000) * costPer1K).toFixed(2));

        return {
            todayTotal,
            yesterdayTotal,
            estCostToday,
            estCostYesterday,
            dailyTotals: dailyMap,
            topUsers,
        };
    }

    // ── Audit log ─────────────────────────────────────────────────
    async getAuditLog(query: PaginationOptionsDto, user: RequestUser): Promise<Pagination<AuditLogEntry>> {
        const isManager = user.role === 'MANAGER';
        const teamIds = user.teamIds || [];
        const scopedUserIds = isManager ? await this.getUserIdsInTeams(teamIds) : null;

        const where: any = scopedUserIds ? { userId: { in: scopedUserIds } } : {};

        const [count, items] = await Promise.all([
            this.prisma.auditLog.count({ where }),
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: query.skip,
                take: query.size,
                include: { user: { select: { name: true, email: true } } },
            }),
        ]);

        const logs = items.map(item => convertPrismaModelToIInterface<AuditLogEntry>(item as any));
        const meta = new PaginationMetaDto({ paginationOptionsDto: query, itemCount: count });
        return new Pagination<AuditLogEntry>(logs, meta);
    }

    // ── Workspaces ───────────────────────────────────────────────
    async getWorkspaces(query: PaginationOptionsDto, user: RequestUser): Promise<Pagination<AdminWorkspace>> {
        const isManager = user.role === 'MANAGER';
        const teamIds = user.teamIds || [];
        const where: any = isManager ? { teams: { some: { id: { in: teamIds } } } } : {};

        const [count, items] = await Promise.all([
            this.prisma.workspace.count({ where }),
            this.prisma.workspace.findMany({
                where,
                include: { teams: { select: { id: true } } },
                orderBy: { createdAt: 'desc' },
                skip: query.skip,
                take: query.size,
            }),
        ]);

        const workspaces: AdminWorkspace[] = (items as any).map(d => {
            const base = convertPrismaModelToIInterface<AdminWorkspace>(d as any);
            return {
                ...base,
                teamIds: d.teams?.map((t: any) => t.id) || [],
                chunkCount: 0,
                userCount: 0,
            };
        });

        const meta = new PaginationMetaDto({ paginationOptionsDto: query, itemCount: count });
        return new Pagination<AdminWorkspace>(workspaces, meta);
    }

    async getWorkspacesGrouped(user: RequestUser): Promise<Record<string, AdminWorkspace[]>> {
        const isManager = user.role === 'MANAGER';
        const teamIds = user.teamIds || [];
        const where: Prisma.WorkspaceWhereInput = isManager ? { teams: { some: { id: { in: teamIds } } } } : {};

        const items = await this.prisma.workspace.findMany({
            where,
            include: { teams: { select: { id: true } } },
            orderBy: { createdAt: 'desc' },
        });

        const grouped: Record<string, AdminWorkspace[]> = {
            ALL: [],
            SLACK: [],
            JIRA: [],
            GITHUB: [],
            GENERIC: []
        };

        (items as any).forEach(d => {
            const ws: AdminWorkspace = {
                ...convertPrismaModelToIInterface<AdminWorkspace>(d as any),
                teamIds: d.teams?.map((t: any) => t.id) || [],
                chunkCount: 0,
                userCount: 0,
            };
            grouped.ALL.push(ws);
            if (grouped[d.type]) {
                grouped[d.type].push(ws);
            }
        });

        return grouped;
    }

    async getAvailableWorkspaces(user: RequestUser): Promise<AdminWorkspace[]> {
        const isManager = user.role === 'MANAGER';
        const teamIds = user.teamIds || [];

        // Managers can only see available workspaces IF those workspaces are somehow linked?
        // Requirement says "Filtered to their team" for Knowledge Base. 
        // If it's available (teamId is null), a manager shouldn't really see it unless we want them to be able to pick them.
        // For now, I'll restrict it so managers see NOTHING in available if they are strictly team-scoped.
        if (isManager) return [];

        const items = await this.prisma.workspace.findMany({
            where: {
                OR: [
                    { type: 'JIRA' },
                    { type: { in: ['SLACK', 'GITHUB'] }, teams: { none: {} } }
                ]
            },
            include: { teams: { select: { id: true } } },
            orderBy: { createdAt: 'desc' },
        });

        return (items as any).map(d => ({
            ...convertPrismaModelToIInterface<AdminWorkspace>(d as any),
            teamIds: d.teams?.map((t: any) => t.id) || [],
            chunkCount: 0,
            userCount: 0,
        }));
    }

    async createWorkspace(data: { type: string; identifier: string; externalId?: string; name?: string; tokenBudget?: number; layer?: string; techStack?: string }) {
        const item = await this.prisma.workspace.create({
            data: {
                type: data.type as any,
                name: data.name || null,
                identifier: data.identifier,
                externalId: data.externalId || null,
                tokenBudget: data.tokenBudget ?? 20000,
                layer: data.layer ?? 'docs',
                techStack: data.techStack || null
            }
        });

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                action: 'admin.workspace_created',
                workspace: data.identifier,
                metadata: { type: data.type, layer: data.layer }
            }
        });

        return convertPrismaModelToIInterface<AdminWorkspace>(item as any);
    }

    async updateWorkspace(id: string, data: { tokenBudget?: number; layer?: string; techStack?: string | null }) {
        const item = await this.prisma.workspace.update({
            where: { id },
            data: {
                tokenBudget: data.tokenBudget,
                layer: data.layer,
                techStack: data.techStack !== undefined ? data.techStack : undefined
            }
        });

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                action: 'admin.workspace_updated',
                metadata: { id, ...data }
            }
        });

        return convertPrismaModelToIInterface<AdminWorkspace>(item as any);
    }

    async deleteWorkspace(id: string) {
        const item = await this.prisma.workspace.findUnique({ where: { id } });
        if (!item) return { success: false };

        await this.prisma.workspace.delete({ where: { id } });

        // Audit log
        await this.prisma.auditLog.create({
            data: {
                action: 'admin.workspace_deleted',
                workspace: item.identifier,
                metadata: { id }
            }
        });

        return { success: true };
    }

    async bulkSyncWorkspaces(items?: { identifier: string; externalId?: string; type: string; layer?: string; tokenBudget?: number }[]) {
        const created = [];

        if (items && items.length > 0) {
            for (const item of items) {
                created.push(await this.getOrCreateWorkspace(item.identifier, item.type as any, item.externalId, item.layer, item.tokenBudget));
            }
        } else {
            const discovery = await this.discoverWorkspaces();
            // 1. Sync Jira
            for (const p of discovery.jira) {
                created.push(await this.getOrCreateWorkspace(p.name, 'JIRA', p.key));
            }

            // 2. Sync Slack
            for (const c of discovery.slack) {
                created.push(await this.getOrCreateWorkspace(c.name, 'SLACK', c.id));
            }

            // 3. Sync GitHub
            for (const r of discovery.github) {
                created.push(await this.getOrCreateWorkspace(r.name, 'GITHUB', r.full_name));
            }
        }

        return { count: created.length, items: created };
    }

    private async getOrCreateWorkspace(identifier: string, type: 'SLACK' | 'JIRA' | 'GITHUB' | 'GENERIC', externalId?: string, layer?: string, tokenBudget?: number) {
        // We might want to find it by externalId if possible, else identifier
        const existing = await this.prisma.workspace.findFirst({
            where: externalId ? { externalId, type } : { identifier, type }
        });
        if (!existing) {
            return this.prisma.workspace.create({
                data: {
                    type,
                    identifier,
                    externalId: externalId || null,
                    layer: layer || 'docs',
                    tokenBudget: tokenBudget || 20000
                }
            });
        }
        // If it exists but externalId is missing (e.g., from an old sync), we might want to update it.
        if (externalId && !existing.externalId) {
            return this.prisma.workspace.update({
                where: { id: existing.id },
                data: { externalId }
            });
        }
        return existing;
    }


    // ── Teams ────────────────────────────────────────────────────
    async getTeams(query: PaginationOptionsDto, user: RequestUser): Promise<Pagination<AdminTeam>> {
        const isManager = user.role === 'MANAGER';
        const teamIds = user.teamIds || [];
        const where: any = isManager ? { id: { in: teamIds } } : {};

        const [count, items] = await Promise.all([
            this.prisma.team.count({ where }),
            this.prisma.team.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: query.skip,
                take: query.size,
                include: { 
                    _count: { select: { chunks: true } },
                    workspaces: true
                },
            }),
        ]);

        const teams: AdminTeam[] = items.map(item => {
            const base = convertPrismaModelToIInterface<AdminTeam>(item as any);
            return {
                ...base,
                chunkCount: item._count.chunks,
            };
        });

        const meta = new PaginationMetaDto({ paginationOptionsDto: query, itemCount: count });
        return new Pagination<AdminTeam>(teams, meta);
    }

    async createTeam(data: any, requesterId: string): Promise<AdminTeam> {
        if (data.workspaceIds?.length) {
            const taken = await this.prisma.workspace.findMany({
                where: {
                    id: { in: data.workspaceIds },
                    type: { in: ['SLACK', 'GITHUB'] },
                    teams: { some: {} }
                }
            });
            if (taken.length > 0) {
                throw new ForbiddenException(`Workspace(s) already assigned: ${taken.map(w => w.identifier).join(', ')}`);
            }
        }
        const item = await this.prisma.team.create({
            data: {
                name: data.name,
                slackEnabled: data.slackEnabled ?? false,
                githubEnabled: data.githubEnabled ?? false,
                jiraEnabled: data.jiraEnabled ?? false,
                identifiers: data.identifiers ?? [],
                ownerEmail: data.ownerEmail,
                createdById: requesterId,
                workspaces: {
                    connect: (data.workspaceIds || []).map((id: string) => ({ id }))
                }
            },
            include: { _count: { select: { chunks: true } } },
        }) as any;

        const base = convertPrismaModelToIInterface<AdminTeam>(item);
        return { ...base, chunkCount: item._count?.chunks || 0 };
    }

    async updateTeam(id: string, data: any, requesterId: string): Promise<AdminTeam> {
        if (data.workspaceIds?.length) {
            const taken = await this.prisma.workspace.findMany({
                where: {
                    id: { in: data.workspaceIds },
                    type: { in: ['SLACK', 'GITHUB'] },
                    teams: { some: { id: { not: id } } }
                }
            });
            if (taken.length > 0) {
                throw new ForbiddenException(`Workspace(s) already assigned to another team: ${taken.map(w => w.identifier).join(', ')}`);
            }
        }
        const item = await this.prisma.team.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.status && { status: data.status }),
                ...(data.identifiers && { identifiers: data.identifiers }),
                ...(data.ownerEmail && { ownerEmail: data.ownerEmail }),
                workspaces: data.workspaceIds ? {
                    set: data.workspaceIds.map((wid: string) => ({ id: wid }))
                } : undefined
            },
            include: { _count: { select: { chunks: true } } },
        }) as any;

        const base = convertPrismaModelToIInterface<AdminTeam>(item);
        return { ...base, chunkCount: item._count?.chunks || 0 };
    }

    // ── Workspace Discovery ───────────────────────────────────────
    async discoverWorkspaces() {
        const settings = await getActiveSettings();
        const results: any = { jira: [], slack: [], github: [] };
        const errors: any = {};

        const jiraToken = process.env.JIRA_API_TOKEN || settings.jiraApiToken;
        const jiraEmail = process.env.JIRA_USER_EMAIL || settings.jiraUserEmail;
        const jiraBaseUrl = process.env.JIRA_BASE_URL || settings.jiraBaseUrl;
        const slackToken = process.env.SLACK_BOT_TOKEN || settings.slackBotToken;
        const githubToken = process.env.GITHUB_TOKEN || settings.githubToken;

        // 1. Jira Discovery
        if (jiraToken && jiraEmail && jiraBaseUrl) {
            try {

                this.logger.log(`Jira credentials → source: ${process.env.JIRA_API_TOKEN ? 'env' : 'db'} | email: ${jiraEmail} | tokenLen: ${jiraToken.length} | tokenStart: ${jiraToken.slice(0, 8)} | url: ${jiraBaseUrl}`);
                const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

                       let startAt = 0;
                let isLast = false;
                const allProjects = [];

                while (!isLast) {
                    const res = await fetch(`${jiraBaseUrl}/rest/api/3/project/search?startAt=${startAt}&maxResults=50`, {
                        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }
                    });

                    if (!res.ok) {
                        const errText = await res.text();
                        throw new Error(`Jira API error ${res.status}: ${errText}`);
                    }

                    const data = await res.json();
                    this.logger.log(data)
                    if (data.values && Array.isArray(data.values)) {
                        allProjects.push(...data.values.map((p: any) => ({
                            id: p.id,
                            key: p.key,
                            name: p.name,
                            category: p.projectCategory?.name ?? 'General'
                        })));
                        startAt += data.values.length;
                        isLast = data.isLast || data.values.length === 0;
                    } else {
                        break;
                    }
                }
                results.jira = allProjects;
            } catch (e) {
                const sanitized = sanitizeError(e);
                this.logger.error("Jira discover error:", sanitized.technicalDetails);
                errors.jira = sanitized.message;
            }
        } else if (jiraBaseUrl) {
            errors.jira = "Missing Jira credentials (Email or API Token)";
        }

        // 2. Slack Discovery
        if (slackToken) {
            try {
                let cursor = '';
                let types = 'public_channel,private_channel';
                const allChannels = [];
                let retryWithoutPrivate = false;

                do {
                    const url = `https://slack.com/api/conversations.list?types=${types}&limit=1000${cursor ? `&cursor=${cursor}` : ''}`;
                    const res = await fetch(url, {
                        headers: { Authorization: `Bearer ${slackToken}` }
                    });
                    if (!res.ok) {
                        const errText = await res.text();
                        throw new Error(`Slack API error ${res.status}: ${errText}`);
                    }
                    const data = await res.json();

                    if (data.ok) {
                        allChannels.push(...data.channels.map((c: any) => ({
                            id: c.id,
                            name: c.name,
                            is_member: c.is_member,
                            is_private: c.is_private
                        })));
                        cursor = data.response_metadata?.next_cursor || '';
                    } else if (data.error === 'missing_scope' && types.includes('private_channel')) {
                        this.logger.warn(`Slack discovery: Missing 'groups:read' scope for private channels. Falling back to public channels only.`);
                        types = 'public_channel';
                        cursor = '';
                        allChannels.length = 0; // Clear and restart
                        retryWithoutPrivate = true;
                        errors.slack_note = "Limited to public channels (missing 'groups:read' scope)";
                    } else {
                        throw new Error(`Slack API error: ${data.error}`);
                    }
                } while (cursor || (retryWithoutPrivate && (retryWithoutPrivate = false, true)));

                results.slack = allChannels;
            } catch (e) {
                const sanitized = sanitizeError(e);
                this.logger.error("Slack discover error:", sanitized.technicalDetails);
                errors.slack = sanitized.message;
            }
        } else {
            // Optional: only report if they have other integrations but not slack
            // errors.slack = "Missing Slack Bot Token";
        }

        // 3. GitHub Discovery
        if (githubToken) {
            try {
                let page = 1;
                const allRepos = [];
                while (true) {
                    const res = await fetch(`https://api.github.com/user/repos?per_page=100&page=${page}`, {
                        headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' }
                    });

                    if (!res.ok) {
                        const errText = await res.text();
                        throw new Error(`GitHub API returned ${res.status}: ${errText}`);
                    }

                    const repos = await res.json();
                    if (Array.isArray(repos) && repos.length > 0) {
                        allRepos.push(...repos.map((r: any) => ({
                            id: r.id,
                            full_name: r.full_name,
                            name: r.name,
                            private: r.private
                        })));
                        page++;
                    } else {
                        break;
                    }
                }
                results.github = allRepos;
            } catch (e) {
                const sanitized = sanitizeError(e);
                this.logger.error("GitHub discover error:", sanitized.technicalDetails);
                errors.github = sanitized.message;
            }
        }

        return { ...results, errors };
    }

    async syncTeamData(teamId: string, user: RequestUser) {
        if (user.role === 'MANAGER' && !user.teamIds.includes(teamId)) {
            throw new ForbiddenException("You don't have access to this team");
        }
        const team = await this.prisma.team.findUnique({ where: { id: teamId } });
        if (!team) throw new Error("Team not found");
        return this.ingestionService.bulkIngest({ teamId, workspaceIds: [], all: true });
    }

    async deleteTeam(id: string) {
        const team = await this.prisma.team.findUnique({
            where: { id },
            include: { workspaces: true }
        });
        if (!team) return { success: false, message: 'Team not found' };

        await this.prisma.team.delete({
            where: { id }
        });

        return { success: true };
    }

    private async getUserIdsInTeams(teamIds: string[]): Promise<string[]> {
        const users = await this.prisma.user.findMany({
            where: { teams: { some: { id: { in: teamIds } } } },
            select: { id: true }
        });
        return users.map(u => u.id);
    }

    async getDocs() {
        const docsDir = join(process.cwd(), 'doc');
        if (!existsSync(docsDir)) return [];
        const files = await readdir(docsDir);
        return files
            .filter(f => f.endsWith('.md'))
            .map(f => ({
                name: f.replace('.md', '')
                    .split(/[-_]/)
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' '),
                filename: f
            }));
    }

    async getDocContent(filename: string) {
        const docsDir = join(process.cwd(), 'doc');
        const filePath = join(docsDir, filename);
        // Security check to prevent path traversal
        if (!filePath.startsWith(docsDir) || !existsSync(filePath) || !filename.endsWith('.md')) {
            throw new ForbiddenException('Invalid document path');
        }
        return { content: await readFile(filePath, 'utf-8') };
    }
}

