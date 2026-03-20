import { apiClient } from '@must-iq-web/lib/api/core';
import { API_ENDPOINTS } from '@must-iq-web/lib/api/config';

export const getAdminDocs = async () => {
    const res = await apiClient.get<any[]>(API_ENDPOINTS.admin.docs);
    return res.data;
};

export const getAdminDocContent = async (filename: string) => {
    const res = await apiClient.get<{ content: string }>(API_ENDPOINTS.admin.docContent(filename));
    return res.data;
};
