'use client';

export interface Source {
    chunkId: string;
    source: string;
    title: string;
    sourceType: 'jira' | 'slack' | 'doc' | 'kb';
    score: number;
    content: string;
    meta?: string;
}

import { IBaseInterface } from './base.types';

export interface Message extends Omit<IBaseInterface, 'updatedAt'> {
    role: 'user' | 'assistant' | 'system';
    content: string;
    sources?: Source[];
    tokensUsed?: number;
    localImageId?: string;
    createdAt: Date;
}

export interface ChatSession extends Omit<IBaseInterface, 'updatedAt'> {
    title: string;
    icon: string;
    scope: string;
    workspace: string;
    messageCount: number;
    createdAt: Date;
}

export interface TokenUsage {
    used: number;
    limit: number;
}

export interface TeamWorkspace {
    id: string;
    type: 'jira' | 'slack' | 'github';
    label: string;
}

/** A team's scoped workspaces (dynamic list of integrations) */
export interface TeamScope {
    id: string;           // team id
    name: string;         // display name e.g. 'Engineering'
    color: string;        // brand color for this team
    chunks: number;       // total indexed chunks
    workspaces: TeamWorkspace[];
}

export interface ChatState {
    sessions: ChatSession[];
    activeSessionId: string | null;
    messages: Message[];
    isStreaming: boolean;
    isWaiting: boolean;
    thought: string | null;
    tokenUsage: TokenUsage;
    // Team-based scope selection — 'general' is always included
    selectedTeams: string[];       // team ids + 'general'
    availableTeams: TeamScope[];   // teams the user belongs to
    mode: 'rag' | 'agent';
    setActiveSession: (id: string) => void;
    setMessages: (messages: Message[]) => void;
    newSession: () => void;
    addUserMessage: (content: string, localImageId?: string) => void;
    addAssistantMessage: (content: string, sources?: Source[]) => void;
    updateLastAssistantMessage: (chunk: string) => void;
    finishStream: (sources?: Source[], tokensUsed?: number, sessionId?: string) => void;
    setStreaming: (val: boolean) => void;
    setThought: (thought: string | null) => void;
    setTokenUsage: (u: TokenUsage) => void;
    setSessions: (sessions: ChatSession[]) => void;
    refreshSessions: () => Promise<void>;
    refreshTeams: () => Promise<void>;
    toggleTeam: (teamId: string) => void;
    setAvailableTeams: (teams: TeamScope[]) => void;
    setMode: (mode: 'rag' | 'agent') => void;
    // legacy compat
    toggleWorkspace: (w: string) => void;
}
