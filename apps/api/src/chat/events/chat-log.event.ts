export class ChatLogTokensEvent {
    userId: string;
    sessionId: string;
    queryTokens: number;
    responseTokens: number;
    model: string;

    constructor(data: ChatLogTokensEvent) {
        Object.assign(this, data);
    }
}

export class ChatAuditPiiEvent {
    userId: string;
    sessionId: string;
    workspace: string;
    tokensUsed: number;
    query: string;
    responsePreview: string;

    constructor(data: ChatAuditPiiEvent) {
        Object.assign(this, data);
    }
}
