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
        image: string | null = null,
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
                stream: true,
                image
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
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') return;
                try {
                    const p = JSON.parse(data);
                    onChunk(data);
                    if (p.tokenUsage) onTokenUsage(p.tokenUsage);
                    // onSources is handled internally by onChunk in ChatPage.tsx now, but we keep the callback for compatibility
                    if (p.sources) onSources(p.sources, p.tokensUsed);
                } catch { }
            }
        }
    },

    /** POST /chat/upload — Uploads a local file and returns a temporary reference URL */
    uploadImage: async (file: File): Promise<{ url: string }> => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`${API_BASE}/chat/upload`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as any).message ?? `Upload error ${res.status}`);
        }

        return res.json();
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
