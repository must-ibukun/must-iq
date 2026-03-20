import { apiClient } from '@must-iq-web/lib/api/core';
import { API_ENDPOINTS } from '@must-iq-web/lib/api/config';

export const getLLMSettings = async () => {
    const res = await apiClient.get<any>(API_ENDPOINTS.admin.llmSettings);
    return res.data;
};

export const saveLLMSettings = async (data: any) => {
    const res = await apiClient.put<any>(API_ENDPOINTS.admin.llmSettings, data);
    return res.data;
};

export const getAvailableProviders = async () => {
    const res = await apiClient.get<any>(`${API_ENDPOINTS.admin.llmSettings}/providers`);
    return res.data;
};

export const getSystemSettings = async () => {
    // Note: LLM settings use API_ENDPOINTS.admin.llmSettings, but we can just use the literal route since it is in settings controller.
    const res = await apiClient.get<any>('/settings/system');
    return res.data;
};

export const saveSystemSettings = async (data: any) => {
    const res = await apiClient.put<any>('/settings/system', data);
    return res.data;
};
