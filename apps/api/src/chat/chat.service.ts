// ============================================================
// Must-IQ — Chat Service
// The core conversational AI pipeline:
//   1. Read RAG config (ragEnabled, topK) from settings DB
//   2. If ragEnabled: embed the query → pgvector similarity search
//   3. Build prompt with retrieved context chunks
//   4. Call LLM provider (wired to the active provider from settings)
//   5. Persist session & message to DB
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { getActiveSettings, getSystemSettings } from '@must-iq/config';
import { ChatRequest, ChatSession, RequestUser, UserRole } from '@must-iq/shared-types';
import { PrismaService } from '@must-iq/db';
import { TokenManagerService } from '../token/token-manager.service';
import { maskPII } from '../common/helpers/pii-masker.helper';
import { PaginationOptionsDto, Pagination, PaginationMetaDto } from '../common/dto/pagination.dto';
import { convertPrismaModelToIInterface } from '../common/helpers/prisma.helper';
import { encrypt, decrypt } from '../common/helpers/encryption.helper';
import { runAIQuery } from '@must-iq/langchain';
import { MOCK_RESPONSES } from './mock.constant';
import { sanitizeError } from '../common/helpers/error.helper';

// ── Chat Service ─────────────────────────────────────────────

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        private prisma: PrismaService,
        private tokenManager: TokenManagerService
    ) { }

    private async getHistory(sessionId: string, limit = 10): Promise<{ role: "user" | "assistant"; content: string }[]> {
        const messages = await this.prisma.message.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        // Prisma returns latest first because of DESC, we need to reverse for LangChain
        return messages.reverse().map(m => ({
            role: m.role as "user" | "assistant",
            content: decrypt(m.content)
        }));
    }

    // ─────────────────────────────────────────────────────────
    // Ensure session exists and belongs to the user
    // ─────────────────────────────────────────────────────────
    private async ensureSession(sessionId: string | undefined, userId: string, firstMessage: string, workspace = 'general'): Promise<string> {
        if (sessionId) {
            const session = await this.prisma.chatSession.findFirst({
                where: { id: sessionId, userId }
            });
            if (session) return session.id;
        }

        // Generate intelligent title based on workspace and message
        const title = await this.generateSessionTitle(firstMessage, workspace);

        // Create a new session using the frontend's provided ID (if any), otherwise let DB auto-generate
        const newSession = await this.prisma.chatSession.create({
            data: {
                ...(sessionId ? { id: sessionId } : {}),
                userId,
                workspace,
                title,
            }
        });
        return newSession.id;
    }

    private async generateSessionTitle(firstMessage: string, workspace: string): Promise<string> {
        const MAX_TOTAL = 50; // Increased to 50 chars for better readability
        const TEAM_PART_RATIO = 0.4; // 40% for teams, 60% for message

        let teamPrefix = 'General';
        if (workspace && workspace !== 'general') {
            const ids = workspace.split(',').filter(id => id && id !== 'general');
            if (ids.length > 0) {
                const teams = await this.prisma.team.findMany({
                    where: { id: { in: ids } },
                    select: { name: true }
                });
                if (teams.length > 0) {
                    const names = teams.map(t => t.name);
                    teamPrefix = names.slice(0, 3).join(', ');
                    if (names.length > 3) teamPrefix += '...';
                } else {
                    // Fallback to IDs if names not found (unlikely but safe)
                    teamPrefix = ids.slice(0, 3).join(', ');
                    if (ids.length > 3) teamPrefix += '...';
                }
            }
        }

        const teamLimit = Math.floor(MAX_TOTAL * TEAM_PART_RATIO);
        const msgLimit = MAX_TOTAL - teamLimit - 2; // -2 for brackets and space

        let displayTeams = teamPrefix;
        if (displayTeams.length > teamLimit) {
            displayTeams = displayTeams.slice(0, teamLimit - 2) + '..';
        }

        let displayMsg = firstMessage.trim().replace(/\n/g, ' ');
        if (displayMsg.length > msgLimit) {
            displayMsg = displayMsg.slice(0, msgLimit - 2) + '..';
        }

        return `[${displayTeams}] ${displayMsg}`;
    }

    // ─────────────────────────────────────────────────────────
    // Main chat handler — used by /api/v1/chat (POST)
    // ─────────────────────────────────────────────────────────
    async chat(body: ChatRequest, user: RequestUser): Promise<{ message: string; sources?: any[]; sessionId: string }> {
        // ── 0. Check for Mock Responses ────────────────────────
        if (MOCK_RESPONSES[body.message]) {
            this.logger.debug(`Returning mock response for suggested query: ${body.message}`);
            return { message: MOCK_RESPONSES[body.message], sessionId: 'mock' };
        }

        const workspacesStr = (body.workspaces && body.workspaces.length > 0) ? body.workspaces.join(',') : (user.workspace ?? 'general');
        const primaryWorkspace = (body.workspaces && body.workspaces.length > 0) ? body.workspaces[0] : (user.workspace ?? 'general');
        const sessionId = await this.ensureSession(body.sessionId, user.sub, body.message, workspacesStr);
        const history = await this.getHistory(sessionId);

        const sysConfig = await getSystemSettings();

        // 1. PII Masking
        if (sysConfig.piiMasking) {
            body.message = maskPII(body.message);
        }

        // 2. Rate Limiting (Budget Check)
        await this.tokenManager.checkBudget(user.sub, (user as any).role || 'EMPLOYEE');

        // 3. Response Caching
        if (sysConfig.cache) {
            const cached = await this.tokenManager.getCachedResponse(body.message);
            if (cached) {
                this.logger.debug(`Cache hit for query: ${body.message.slice(0, 30)}...`);

                if (sysConfig.audit) {
                    await this.prisma.auditLog.create({
                        data: {
                            userId: user.sub,
                            action: 'chat.query.cached',
                            workspace: primaryWorkspace,
                            tokensUsed: 0,
                            metadata: { query: body.message, cached: true }
                        }
                    });
                }

                return { message: cached.response, sessionId, sources: cached.sources || [] };
            }
        }

        const settings = await getActiveSettings();
        const isAdminDisabled = settings.agenticReasoningEnabled === false;
        const useDeepSearch = isAdminDisabled ? false : (body.deepSearch ?? user.deepSearchEnabled ?? false);

        const result = await runAIQuery({
            query: body.message,
            userId: user.sub,
            workspace: primaryWorkspace,
            sessionId,
            history,
            workspaces: body.workspaces,
            useAgent: useDeepSearch || body.message.toLowerCase().includes('agent'),
            stream: false,
            image: body.image
        });

        // ── 4. Persist interactions ───────────────────────────
        await this.prisma.$transaction([
            // Save user message
            this.prisma.message.create({
                data: {
                    sessionId,
                    role: 'user',
                    content: encrypt(body.message),
                }
            }),
            // Save assistant message
            this.prisma.message.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: encrypt(result.response),
                    sources: result.sources as any,
                }
            }),
            // Update session timestamp
            this.prisma.chatSession.update({
                where: { id: sessionId },
                data: { updatedAt: new Date() }
            })
        ]);

        // Caching Save
        if (sysConfig.cache) {
            await this.tokenManager.cacheResponse(body.message, result.response);
        }

        // Record Token Usage
        const tokensUsed = body.message.length + result.response.length; // Approximate fallback if result.tokens missing
        await this.tokenManager.recordUsage(user.sub, tokensUsed);

        // Audit Logging
        if (sysConfig.audit) {
            await this.prisma.auditLog.create({
                data: {
                    userId: user.sub,
                    action: 'chat.query',
                    workspace: primaryWorkspace,
                    tokensUsed,
                    metadata: { query: body.message, responsePreview: result.response.slice(0, 50) }
                }
            });
        }

        return { message: result.response, sources: result.sources, sessionId };
    }

    // ─────────────────────────────────────────────────────────
    // Streaming variant — same pipeline, emits per-chunk
    // ─────────────────────────────────────────────────────────
    async streamChat(body: ChatRequest, user: RequestUser, onChunk: (chunk: string) => void): Promise<void> {
        // ── Check for Mock Responses ──────────────────────────
        if (MOCK_RESPONSES[body.message]) {
            const reply = MOCK_RESPONSES[body.message];
            const words = reply.split(' ');
            for (const word of words) {
                onChunk(JSON.stringify({ chunk: word + ' ' }));
                await new Promise(r => setTimeout(r, 20));
            }
            return;
        }

        const workspacesStr = (body.workspaces && body.workspaces.length > 0) ? body.workspaces.join(',') : (user.workspace ?? 'general');
        const primaryWorkspace = (body.workspaces && body.workspaces.length > 0) ? body.workspaces[0] : (user.workspace ?? 'general');
        const sessionId = await this.ensureSession(body.sessionId, user.sub, body.message, workspacesStr);

        // Emit sessionId immediately so frontend can sync history
        onChunk(JSON.stringify({ sessionId }));

        // Immediate feedback: Emit a "thought" chunk to show the AI is working
        onChunk(JSON.stringify({ thought: "Searching knowledge base..." }));

        const history = await this.getHistory(sessionId);

        let fullReply = '';
        let sources: any[] = [];

        const sysConfig = await getSystemSettings();

        // 1. PII Masking
        if (sysConfig.piiMasking) {
            body.message = maskPII(body.message);
        }

        // 2. Budget Tracking
        await this.tokenManager.checkBudget(user.sub, (user as any).role || 'EMPLOYEE');

        // 3. Response Caching
        if (sysConfig.cache) {
            const cached = await this.tokenManager.getCachedResponse(body.message);
            if (cached) {
                this.logger.debug(`Cache hit for stream query: ${body.message.slice(0, 30)}...`);
                const words = cached.response.split(' ');
                for (const word of words) {
                    onChunk(JSON.stringify({ chunk: word + ' ' }));
                    await new Promise(r => setTimeout(r, 20));
                }
                onChunk(JSON.stringify({ sessionId, sources: cached.sources || [] }));

                if (sysConfig.audit) {
                    await this.prisma.auditLog.create({
                        data: {
                            userId: user.sub,
                            action: 'chat.stream.cached',
                            workspace: primaryWorkspace,
                            tokensUsed: 0,
                            metadata: { query: body.message, cached: true }
                        }
                    });
                }
                return;
            }
        }

        const settings = await getActiveSettings();
        const isAdminDisabled = settings.agenticReasoningEnabled === false;
        const useDeepSearch = isAdminDisabled ? false : (body.deepSearch ?? user.deepSearchEnabled ?? false);

        try {
            const result = await runAIQuery({
                query: body.message,
                userId: user.sub,
                workspace: primaryWorkspace,
                sessionId,
                history,
                workspaces: body.workspaces,
                useAgent: useDeepSearch || body.message.toLowerCase().includes('agent'),
                stream: true,
                image: body.image,
                onChunk: (chunk) => {
                    fullReply += chunk;
                    onChunk(JSON.stringify({ chunk }));
                }
            });
            sources = result.sources || [];
        } catch (err: any) {
            const sanitized = sanitizeError(err);
            this.logger.error(`LLM streaming failed: ${sanitized.technicalDetails}`, err.stack);

            fullReply = sanitized.message;
            onChunk(JSON.stringify({
                chunk: sanitized.message,
                isError: true,
                code: sanitized.code,
                rawError: sanitized.technicalDetails,
                isQuota: sanitized.code === 429
            }));
        }

        // Persist interaction
        await this.prisma.$transaction([
            this.prisma.message.create({
                data: {
                    sessionId,
                    role: 'user',
                    content: encrypt(body.message),
                }
            }),
            this.prisma.message.create({
                data: {
                    sessionId,
                    role: 'assistant',
                    content: encrypt(fullReply),
                    sources: sources as any,
                }
            }),
            this.prisma.chatSession.update({
                where: { id: sessionId },
                data: { updatedAt: new Date() }
            })
        ]);

        // Save Cache
        if (sysConfig.cache && fullReply) {
            await this.tokenManager.cacheResponse(body.message, fullReply, sources);
        }

        // Record Tokens
        const tokensUsed = body.message.length + fullReply.length;
        await this.tokenManager.recordUsage(user.sub, tokensUsed);

        // Audit Logging
        if (sysConfig.audit) {
            await this.prisma.auditLog.create({
                data: {
                    userId: user.sub,
                    action: 'chat.stream',
                    workspace: primaryWorkspace,
                    tokensUsed,
                    metadata: { query: body.message, responsePreview: fullReply.slice(0, 50) }
                }
            });
        }

        // Send metadata as final JSON object
        onChunk(JSON.stringify({ sessionId, sources }));
    }

    // ─────────────────────────────────────────────────────────
    // Session management
    // ─────────────────────────────────────────────────────────
    async getSessions(userId: string, query: PaginationOptionsDto): Promise<Pagination<ChatSession>> {
        const [count, items] = await Promise.all([
            this.prisma.chatSession.count({ where: { userId } }),
            this.prisma.chatSession.findMany({
                where: { userId },
                orderBy: { createdAt: query.order === 'ASC' ? 'asc' : 'desc' },
                skip: query.skip,
                take: query.size,
            })
        ]);

        const sessions = items.map(item => convertPrismaModelToIInterface<ChatSession>(item as any));
        const meta = new PaginationMetaDto({ paginationOptionsDto: query, itemCount: count });

        return new Pagination<ChatSession>(sessions, meta);
    }

    async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
        const session = await this.prisma.chatSession.findFirst({
            where: { id: sessionId, userId },
            include: { messages: true }
        });

        if (session && session.messages) {
            session.messages = session.messages.map(m => ({
                ...m,
                content: decrypt(m.content)
            })) as any;
        }

        return session ? convertPrismaModelToIInterface<ChatSession>(session as any) : null;
    }

    async getAuthorizedTeams(userId: string, role: string) {
        if (role === 'ADMIN') {
            return this.prisma.team.findMany({
                where: { status: 'active' },
                select: { id: true, name: true, identifiers: true }
            });
        }

        // Regular users see their primary assigned teams
        return this.prisma.team.findMany({
            where: {
                status: 'active',
                users: { some: { id: userId } }
            },
            select: { id: true, name: true, identifiers: true }
        });
    }
}