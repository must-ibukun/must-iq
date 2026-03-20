import { apiClient } from '@must-iq-web/lib/api/core';
import { API_ENDPOINTS } from '@must-iq-web/lib/api/config';

export const getAuditLog = async (): Promise<{ data: any[]; meta: any }> => {
    const res = await apiClient.get<{ data: any[]; meta: any }>(API_ENDPOINTS.admin.auditLog);
    return res.data;
};

