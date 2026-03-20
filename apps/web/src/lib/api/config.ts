/**
 * API Configuration mapping
 */
export const API_ENDPOINTS = {
    auth: {
        login: '/auth/login',
        sso: '/auth/sso',
        profile: '/auth/profile',
        changePassword: '/auth/change-password',
        forgotPassword: '/auth/forgot-password',
        resetPassword: '/auth/reset-password',
    },
    chat: {
        stream: '/chat',
    },
    admin: {
        stats: '/admin/stats',
        teams: '/admin/teams',
        team: (slug: string) => `/admin/teams/${slug}`,
        syncTeam: (slug: string) => `/admin/teams/${slug}/sync`,
        users: '/admin/users',
        updateUserTeams: (id: string) => `/admin/users/${id}/teams`,
        inviteUser: '/admin/users/invite',
        workspaces: '/admin/workspaces',
        workspacesGrouped: '/admin/workspaces/grouped',
        workspacesAvailable: '/admin/workspaces/available',
        ingestionEvents: '/admin/ingestion/events',
        ingestionUpload: '/admin/ingestion/upload',
        llmSettings: '/settings/llm',
        tokenUsage: '/admin/tokens/usage',
        auditLog: '/admin/audit',
        discovery: '/admin/discovery',
        docs: '/admin/docs',
        docContent: (filename: string) => `/admin/docs/${filename}`,
    },
};
