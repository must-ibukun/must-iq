/**
 * Chat API Service
 * Uses native fetch for SSE streaming (axios stream is not supported in browsers)
 */
import { API_BASE, getToken } from '@must-iq-web/lib/api/core';
import { apiClient } from '@must-iq-web/lib/api/core';

export const chatApi = {
    /** POST /chat — streaming SSE via native fetch */
    stream: async (
        message: string,
        sessionId: string | null,
        selectedWorkspaces: string[],
        mode: string,
        onChunk: (chunk: string) => void,
        onSources: (sources: any[], tokensUsed?: number) => void,
        onTokenUsage: (usage: { used: number; limit: number }) => void,
    ): Promise<void> => {
        const token = getToken();
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ 
                message, 
                sessionId, 
                workspaces: selectedWorkspaces, 
                deepSearch: mode === 'agent', 
                stream: true 
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as any).message ?? `API error ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() ?? ''; // keep incomplete line

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') return;
                try {
                    const p = JSON.parse(data);
                    onChunk(data); // Pass the raw data string so ChatPage can handle sessionId, sources, and chunks
                    if (p.tokenUsage) onTokenUsage(p.tokenUsage);
                    // onSources is handled internally by onChunk in ChatPage.tsx now, but we keep the callback for compatibility
                    if (p.sources) onSources(p.sources, p.tokensUsed);
                } catch { }
            }
        }
    },

    /** GET /chat/sessions */
    getSessions: () =>
        apiClient.get<any[]>('/chat/sessions').then(r => r.data),

    /** GET /chat/sessions/:id */
    getSession: (id: string) =>
        apiClient.get<any>(`/chat/sessions/${id}`).then(r => r.data),

    /** GET /chat/teams — fetch authorized search scopes */
    getTeams: () =>
        apiClient.get<any[]>('/chat/teams').then(r => r.data),
};
