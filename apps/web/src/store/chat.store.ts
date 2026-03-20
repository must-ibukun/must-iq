import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatState, TeamScope, Source, Message } from '@must-iq-web/types/chat.types';
import { WORKSPACE_COLORS } from '@must-iq-web/lib/constants/admin.constants';
import { chatApi } from '@must-iq-web/lib/api/chat';

const genId = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_TEAMS: TeamScope[] = [
  { id: 'engineering', name: 'Engineering', color: WORKSPACE_COLORS['engineering'] ?? '#4f46e5', chunks: 8241, workspaces: [
      { id: 'must-iq/api', type: 'github', label: 'must-iq/api' },
      { id: 'ENG', type: 'jira', label: 'ENG' },
      { id: '#engineering', type: 'slack', label: '#engineering' }
    ] 
  },
  { id: 'hr', name: 'HR', color: WORKSPACE_COLORS['hr'] ?? '#06b6d4', chunks: 1102, workspaces: [
      { id: 'HR', type: 'jira', label: 'HR' },
      { id: '#human-resources', type: 'slack', label: '#human-resources' }
    ]
  },
  { id: 'finance', name: 'Finance', color: WORKSPACE_COLORS['finance'] ?? '#f59e0b', chunks: 634, workspaces: [
      { id: 'FIN', type: 'jira', label: 'FIN' },
      { id: '#finance', type: 'slack', label: '#finance' }
    ]
  },
  { id: 'platform', name: 'Platform', color: WORKSPACE_COLORS['platform'] ?? '#8b5cf6', chunks: 2890, workspaces: [
      { id: 'must-iq/platform', type: 'github', label: 'must-iq/platform' },
      { id: 'PLT', type: 'jira', label: 'PLT' },
      { id: '#platform', type: 'slack', label: '#platform' }
    ]
  },
  { id: 'security', name: 'Security', color: WORKSPACE_COLORS['security'] ?? '#ef4444', chunks: 445, workspaces: [
      { id: 'SEC', type: 'jira', label: 'SEC' },
      { id: '#security', type: 'slack', label: '#security' }
    ]
  },
];

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null, messages: [], isStreaming: false, isWaiting: false, thought: null,
      tokenUsage: { used: 0, limit: 20000 },

      selectedTeams: ['general'],
      availableTeams: DEFAULT_TEAMS,

      mode: 'rag',

      setActiveSession: (id) => set({ activeSessionId: id }),
      setMessages: (messages: Message[]) => set({ messages }),
      newSession: () => {
        set({ activeSessionId: null, messages: [] });
      },

      addUserMessage: (content) => set((s) => ({
        messages: [...s.messages, { id: genId(), role: 'user', content, createdAt: new Date() }],
        isWaiting: true,
      })),
      addAssistantMessage: (content, sources = []) => set((s) => ({
        messages: [...s.messages, { id: genId(), role: 'assistant', content, sources, createdAt: new Date() }],
        isStreaming: true,
      })),
      updateLastAssistantMessage: (chunk) => set((s) => {
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant') msgs[msgs.length - 1] = { ...last, content: last.content + chunk };
        return { messages: msgs, isWaiting: false };
      }),
      finishStream: (sources?: Source[], tokensUsed?: number, sessionId?: string) => set((s) => {
        const msgs = [...s.messages];
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant') msgs[msgs.length - 1] = { ...last, sources: sources ?? last.sources, tokensUsed };
        return { 
          messages: msgs, 
          isStreaming: false, 
          isWaiting: false,
          activeSessionId: sessionId ?? s.activeSessionId 
        };
      }),
      setStreaming: (val) => set({ isStreaming: val }),
      setThought: (thought) => set({ thought }),
      setTokenUsage: (tokenUsage) => set({ tokenUsage }),
      setSessions: (sessions) => set({ sessions }),
      refreshSessions: async () => {
        try {
          const response = await chatApi.getSessions();
          const sessionData = (response as any).data || response;
          
          if (Array.isArray(sessionData)) {
            const mapped = sessionData.map((s: any) => ({
              id: s.id,
              title: s.title ?? 'Untitled',
              icon: '💬',
              workspace: s.workspace ?? 'general',
              scope: s.workspace ?? 'General',
              messageCount: s._count?.messages ?? 0,
              createdAt: new Date(s.createdAt),
            }));
            set({ sessions: mapped });
          }
        } catch (err) {
          console.error('Failed to refresh sessions:', err);
        }
      },
      refreshTeams: async () => {
        try {
          const teams = await chatApi.getTeams();
          if (Array.isArray(teams)) {
            const mapped: TeamScope[] = teams.map((t: any) => {
              const workspaces: any[] = [];
              if (t.identifiers && Array.isArray(t.identifiers)) {
                t.identifiers.forEach((id: string) => {
                  let type: 'jira' | 'slack' | 'github' = 'jira';
                  let label = id;
                  
                  if (id.includes(':')) {
                    const [tStr, value] = id.split(':');
                    type = tStr.toLowerCase() as any;
                    label = value;
                  } else if (id.includes('/') || id.includes('-')) {
                    // Heuristic for github
                    if (!id.match(/^[A-Z0-9]+$/)) {
                      type = 'github';
                    }
                  } else if (id.startsWith('#')) {
                    type = 'slack';
                  }

                  workspaces.push({ id, type, label });
                });
              }

              return {
                id: t.id,
                name: t.name,
                color: WORKSPACE_COLORS[t.name.toLowerCase() as any] || (workspaces[0]?.type ? WORKSPACE_COLORS[workspaces[0].type] : '#94a3b8'),
                chunks: 0,
                workspaces
              };
            });
            set({ 
              availableTeams: mapped
            });

            // Prune selected teams that no longer exist (except 'general')
            const { selectedTeams } = get();
            const valid = new Set(mapped.map(t => t.id));
            const pruned = selectedTeams.filter(id => id === 'general' || valid.has(id));
            if (pruned.length !== selectedTeams.length) {
              set({ selectedTeams: pruned });
            }
          }
        } catch (err) {
          console.error('Failed to refresh teams:', err);
        }
      },

      toggleTeam: (teamId) => {
        set((s) => {
          const cur = new Set(s.selectedTeams);
          cur.has(teamId) ? cur.delete(teamId) : cur.add(teamId);
          return { selectedTeams: [...cur] };
        });
      },
      setAvailableTeams: (teams) => set({ availableTeams: teams }),

      toggleWorkspace: (w) => {
        set((s) => {
          const cur = new Set(s.selectedTeams);
          cur.has(w) ? cur.delete(w) : cur.add(w);
          return { selectedTeams: [...cur] };
        });
      },

      setMode: (mode) => set({ mode }),
    }),
    { 
      name: 'must-iq-chat',
      partialize: (state) => ({ 
        selectedTeams: state.selectedTeams, 
        mode: state.mode 
      }),
    }
  )
);
