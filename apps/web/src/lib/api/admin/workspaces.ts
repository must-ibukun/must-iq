import { apiClient } from '@must-iq-web/lib/api/core';
import { API_ENDPOINTS } from '@must-iq-web/lib/api/config';

export const getWorkspaces = async (): Promise<{ data: any[]; meta: any }> => {
    const res = await apiClient.get<{ data: any[]; meta: any }>(API_ENDPOINTS.admin.workspaces);
    return res.data;
};

export const getWorkspacesGrouped = async (): Promise<Record<string, any[]>> => {
    const res = await apiClient.get<Record<string, any[]>>(API_ENDPOINTS.admin.workspacesGrouped);
    return res.data;
};

export const getAvailableWorkspaces = async (): Promise<any[]> => {
    const res = await apiClient.get<any[]>(API_ENDPOINTS.admin.workspacesAvailable);
    return res.data;
};

export const bulkSyncWorkspaces = async (data?: { items: any[] }): Promise<any> => {
    const res = await apiClient.post(API_ENDPOINTS.admin.workspaces + '/sync', data || {});
    return res.data;
};

export const createWorkspace = async (data: any): Promise<any> => {
    const res = await apiClient.post<any>(API_ENDPOINTS.admin.workspaces, data);
    return res.data;
};

export const updateWorkspace = async (id: string, data: any): Promise<any> => {
    const res = await apiClient.patch<any>(`${API_ENDPOINTS.admin.workspaces}/${id}`, data);
    return res.data;
};

export const deleteWorkspace = async (id: string): Promise<any> => {
    const res = await apiClient.delete<any>(`${API_ENDPOINTS.admin.workspaces}/${id}`);
    return res.data;
};
