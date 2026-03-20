import { apiClient } from '@must-iq-web/lib/api/core';
import { API_ENDPOINTS } from '@must-iq-web/lib/api/config';

export const getUsers = async (): Promise<{ data: any[]; meta: any }> => {
    const res = await apiClient.get<{ data: any[]; meta: any }>(API_ENDPOINTS.admin.users);
    return res.data;
};

export const inviteUser = async (data: any) => {
    const res = await apiClient.post<any>(API_ENDPOINTS.admin.inviteUser, data);
    return res.data;
};

export const updateUser = async (id: string, data: any) => {
    const res = await apiClient.patch<any>(`${API_ENDPOINTS.admin.users}/${id}`, data);
    return res.data;
};

export const updateUserTeams = async (id: string, teamIds: string[]) => {
    const res = await apiClient.post<any>(API_ENDPOINTS.admin.updateUserTeams(id), { teamIds });
    return res.data;
};
