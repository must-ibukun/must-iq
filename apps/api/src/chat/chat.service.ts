// ============================================================
// Must-IQ — Chat Service
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getActiveSettings, getSystemSettings } from '@must-iq/config';
import { ChatRequest, ChatSession, RequestUser } from '@must-iq/shared-types';
import { PrismaService } from '@must-iq/db';
import { maskPII } from '../common/helpers/pii-masker.helper';
import { PaginationOptionsDto, Pagination, PaginationMetaDto } from '../common/dto/pagination.dto';
import { convertPrismaModelToIInterface } from '../common/helpers/prisma.helper';
import { encrypt, decrypt } from '../common/helpers/encryption.helper';
import { runAIQuery } from '@must-iq/langchain';
import { MOCK_RESPONSES } from './mock.constant';
import { sanitizeError } from '../common/helpers/error.helper';
import { CHAT_AUDIT_PII_LISTENER, CHAT_LOG_TOKENS_LISTENER } from '../common/constants/listener.constant';
import { ChatAuditPiiEvent, ChatLogTokensEvent } from './events/chat-log.event';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
    ) { }

    private async getHistory(sessionId: string, limit = 10): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
        const messages = await this.prisma.message.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return messages.reverse().map(m => ({
            role: m.role as 'user' | 'assistant',
            content: decrypt(m.content),
        }));
    }

    private async ensureSession(sessionId: string | undefined, userId: string, firstMessage: string, workspace = 'general'): Promise<string> {
        if (sessionId) {
            const session = await this.prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
            if (session) return session.id;
        }
        const title = await this.generateSessionTitle(firstMessage, workspace);
        const newSession = await this.prisma.chatSession.create({
            data: {
                ...(sessionId ? { id: sessionId } : {}),
                userId,
                workspace,
                title,
            },
        });
        return newSession.id;
    }

    private async generateSessionTitle(firstMessage: string, workspace: string): Promise<string> {
        const MAX_TOTAL = 50;
        const TEAM_PART_RATIO = 0.4;

        let teamPrefix = 'General';
        if (workspace && workspace !== 'general') {
            const ids = workspace.split(',').filter(id => id && id !== 'general');
            if (ids.length > 0) {
                const teams = await this.prisma.team.findMany({
                    where: { id: { in: ids } },
                    select: { name: true },
                });
                if (teams.length > 0) {
                    const names = teams.map(t => t.name);
                    teamPrefix = names.slice(0, 3).join(', ');
                    if (names.length > 3) teamPrefix += '...';
                } else {
                    teamPrefix = ids.slice(0, 3).join(', ');
                    if (ids.length > 3) teamPrefix += '...';
                }
            }
        }

        const teamLimit = Math.floor(MAX_TOTAL * TEAM_PART_RATIO);
        const msgLimit = MAX_TOTAL - teamLimit - 2;

        let displayTeams = teamPrefix;
        if (displayTeams.length > teamLimit) displayTeams = displayTeams.slice(0, teamLimit - 2) + '..';

        let displayMsg = firstMessage.trim().replace(/\n/g, ' ');
        if (displayMsg.length > msgLimit) displayMsg = displayMsg.slice(0, msgLimit - 2) + '..';

        return `[${displayTeams}] ${displayMsg}`;
    }

    // ─────────────────────────────────────────────────────────
    // JSON response — used by integrations and direct API calls
    // ─────────────────────────────────────────────────────────
    async chat(body: ChatRequest, user: RequestUser): Promise<{ message: string; sources?: any[]; sessionId: string }> {
        if (MOCK_RESPONSES[body.message]) {
            return { message: MOCK_RESPONSES[body.message], sessionId: 'mock' };
        }

        const workspacesStr = (body.workspaces && body.workspaces.length > 0) ? body.workspaces.join(',') : (user.workspace ?? 'general');
        const primaryWorkspace = (body.workspaces && body.workspaces.length > 0) ? body.workspaces[0] : (user.workspace ?? 'general');
        const sessionId = await this.ensureSession(body.sessionId, user.sub, body.message, workspacesStr);
        const history = await this.getHistory(sessionId);
        const sysConfig = await getSystemSettings();

        let piiDetected = false;
        if (sysConfig.piiMasking) {
            const pii = maskPII(body.message);
            body.message = pii.masked;
            piiDetected = pii.detected;
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
            image: body.image,
        });

        await this.prisma.$transaction([
            this.prisma.message.create({ data: { sessionId, role: 'user', content: encrypt(body.message) } }),
            this.prisma.message.create({ data: { sessionId, role: 'assistant', content: encrypt(result.response), sources: result.sources as any } }),
            this.prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } }),
        ]);

        const queryTokens = Math.ceil(body.message.length / 4);
        const responseTokens = Math.ceil(result.response.length / 4);

        this.eventEmitter.emit(CHAT_LOG_TOKENS_LISTENER, new ChatLogTokensEvent({
            userId: user.sub,
            sessionId,
            queryTokens,
            responseTokens,
            model: result.model,
        }));

        if (sysConfig.audit && piiDetected) {
            this.eventEmitter.emit(CHAT_AUDIT_PII_LISTENER, new ChatAuditPiiEvent({
                userId: user.sub,
                sessionId,
                workspace: primaryWorkspace,
                tokensUsed: queryTokens + responseTokens,
                query: body.message,
                responsePreview: result.response.slice(0, 50),
            }));
        }

        return { message: result.response, sources: result.sources, sessionId };
    }

    // ─────────────────────────────────────────────────────────
    // SSE streaming — used by the web frontend
    // ─────────────────────────────────────────────────────────
    async streamChat(body: ChatRequest, user: RequestUser, onChunk: (chunk: string) => void): Promise<void> {
        if (MOCK_RESPONSES[body.message]) {
            const reply = MOCK_RESPONSES[body.message];
            for (const word of reply.split(' ')) {
                onChunk(JSON.stringify({ chunk: word + ' ' }));
                await new Promise(r => setTimeout(r, 20));
            }
            return;
        }

        const workspacesStr = (body.workspaces && body.workspaces.length > 0) ? body.workspaces.join(',') : (user.workspace ?? 'general');
        const primaryWorkspace = (body.workspaces && body.workspaces.length > 0) ? body.workspaces[0] : (user.workspace ?? 'general');
        const sessionId = await this.ensureSession(body.sessionId, user.sub, body.message, workspacesStr);

        onChunk(JSON.stringify({ sessionId }));
        onChunk(JSON.stringify({ thought: 'Searching knowledge base...' }));

        const history = await this.getHistory(sessionId);
        const sysConfig = await getSystemSettings();

        let piiDetected = false;
        if (sysConfig.piiMasking) {
            const pii = maskPII(body.message);
            body.message = pii.masked;
            piiDetected = pii.detected;
        }

        const settings = await getActiveSettings();
        const isAdminDisabled = settings.agenticReasoningEnabled === false;
        const useDeepSearch = isAdminDisabled ? false : (body.deepSearch ?? user.deepSearchEnabled ?? false);

        let fullReply = '';
        let sources: any[] = [];

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
                },
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
                isQuota: sanitized.code === 429,
            }));
        }

        await this.prisma.$transaction([
            this.prisma.message.create({ data: { sessionId, role: 'user', content: encrypt(body.message) } }),
            this.prisma.message.create({ data: { sessionId, role: 'assistant', content: encrypt(fullReply), sources: sources as any } }),
            this.prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } }),
        ]);

        const queryTokens = Math.ceil(body.message.length / 4);
        const responseTokens = Math.ceil(fullReply.length / 4);

        this.eventEmitter.emit(CHAT_LOG_TOKENS_LISTENER, new ChatLogTokensEvent({
            userId: user.sub,
            sessionId,
            queryTokens,
            responseTokens,
            model: settings.model,
        }));

        if (sysConfig.audit && piiDetected) {
            this.eventEmitter.emit(CHAT_AUDIT_PII_LISTENER, new ChatAuditPiiEvent({
                userId: user.sub,
                sessionId,
                workspace: primaryWorkspace,
                tokensUsed: queryTokens + responseTokens,
                query: body.message,
                responsePreview: fullReply.slice(0, 50),
            }));
        }

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
            }),
        ]);
        const sessions = items.map(item => convertPrismaModelToIInterface<ChatSession>(item as any));
        const meta = new PaginationMetaDto({ paginationOptionsDto: query, itemCount: count });
        return new Pagination<ChatSession>(sessions, meta);
    }

    async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
        const session = await this.prisma.chatSession.findFirst({
            where: { id: sessionId, userId },
            include: { messages: true },
        });
        if (session && session.messages) {
            session.messages = session.messages.map(m => ({ ...m, content: decrypt(m.content) })) as any;
        }
        return session ? convertPrismaModelToIInterface<ChatSession>(session as any) : null;
    }

    async getAuthorizedTeams(userId: string, role: string) {
        if (role === 'ADMIN') {
            return this.prisma.team.findMany({
                where: { status: 'active' },
                select: { id: true, name: true, identifiers: true },
            });
        }
        return this.prisma.team.findMany({
            where: { status: 'active', users: { some: { id: userId } } },
            select: { id: true, name: true, identifiers: true },
        });
    }
}
