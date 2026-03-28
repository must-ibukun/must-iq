import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@must-iq/db';
import { CHAT_LOG_TOKENS_LISTENER, CHAT_AUDIT_PII_LISTENER } from '../../common/constants/listener.constant';
import { ChatLogTokensEvent, ChatAuditPiiEvent } from '../events/chat-log.event';

@Injectable()
export class ChatLogListener {
    private readonly logger = new Logger(ChatLogListener.name);

    constructor(private readonly prisma: PrismaService) {}

    @OnEvent(CHAT_LOG_TOKENS_LISTENER)
    async handleTokenLog(event: ChatLogTokensEvent) {
        try {
            await this.prisma.tokenLog.create({
                data: {
                    userId: event.userId,
                    sessionId: event.sessionId,
                    queryTokens: event.queryTokens,
                    responseTokens: event.responseTokens,
                    totalTokens: event.queryTokens + event.responseTokens,
                    model: event.model,
                    cached: false,
                },
            });
        } catch (err) {
            this.logger.error('Failed to write token log', err);
        }
    }

    @OnEvent(CHAT_AUDIT_PII_LISTENER)
    async handleAuditPii(event: ChatAuditPiiEvent) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    userId: event.userId,
                    action: 'chat.pii_detected',
                    workspace: event.workspace,
                    tokensUsed: event.tokensUsed,
                    metadata: { query: event.query, responsePreview: event.responsePreview },
                },
            });
        } catch (err) {
            this.logger.error('Failed to write audit log', err);
        }
    }
}
