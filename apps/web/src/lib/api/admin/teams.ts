import { apiClient } from '@must-iq-web/lib/api/core';
import { API_ENDPOINTS } from '@must-iq-web/lib/api/config';

export const getTeams = async (): Promise<{ data: any[]; meta: any }> => {
    const res = await apiClient.get<{ data: any[]; meta: any }>(API_ENDPOINTS.admin.teams);
    return res.data;
};

export const createTeam = async (data: any) => {
    const res = await apiClient.post<any>(API_ENDPOINTS.admin.teams, data);
    return res.data;
};

export const updateTeam = async (slug: string, data: any) => {
    const res = await apiClient.patch<any>(API_ENDPOINTS.admin.team(slug), data);
    return res.data;
};

export const deleteTeam = async (id: string) => {
    const res = await apiClient.delete<any>(API_ENDPOINTS.admin.team(id));
    return res.data;
};

export const syncTeam = async (slug: string) => {
    const res = await apiClient.post<any>(API_ENDPOINTS.admin.syncTeam(slug));
    return res.data;
};

export const discoverWorkspaces = async () => {
    const res = await apiClient.get<any>(API_ENDPOINTS.admin.discovery);
    return res.data;
};

// Backwards compatibility re-exports (deprecated)
export const getProjects = getTeams;
export const createProject = createTeam;
export const updateProject = updateTeam;
export const deleteProject = deleteTeam;
export const syncProject = syncTeam;
