import { apiClient } from '@must-iq-web/lib/api/core';
import { API_ENDPOINTS } from '@must-iq-web/lib/api/config';

export const getStats = async () => {
    const res = await apiClient.get<any>(API_ENDPOINTS.admin.stats);
    return res.data;
};
