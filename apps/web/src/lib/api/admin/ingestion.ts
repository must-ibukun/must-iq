import { apiClient } from '@must-iq-web/lib/api/core';
import { API_ENDPOINTS } from '@must-iq-web/lib/api/config';
import { IngestionResult, PaginatedResponse, IngestionEvent } from '@must-iq/shared-types';

export const getIngestionEvents = async (options: { page?: number; size?: number; type?: string; startDate?: string; endDate?: string; } = {}): Promise<PaginatedResponse<IngestionEvent>> => {
    const { page = 1, size = 20, type, startDate, endDate } = options;
    let url = `${API_ENDPOINTS.admin.ingestionEvents}?page=${page}&size=${size}`;
    if (type) url += `&type=${type}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    const res = await apiClient.get<PaginatedResponse<IngestionEvent>>(url);
    return res.data;
};

export const uploadDocument = async (file: File, workspace: string): Promise<IngestionResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace', workspace);
    const res = await apiClient.post(API_ENDPOINTS.admin.ingestionUpload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const bulkIngest = async (payload: { teamId?: string; workspaceIds: string[]; all?: boolean; startDate?: string; endDate?: string }): Promise<any> => {
    const res = await apiClient.post(`/admin/ingestion/bulk`, payload);
    return res.data;
};

export const ingestRepository = async (payload: { repo: string; workspace: string; teamId?: string }): Promise<any> => {
    const res = await apiClient.post(`/admin/ingestion/repo`, payload);
    return res.data;
};
