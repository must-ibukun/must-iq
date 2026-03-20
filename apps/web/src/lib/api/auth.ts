/**
 * Auth API Service
 */
import { apiClient, API_BASE } from '@must-iq-web/lib/api/core';
import { API_ENDPOINTS } from '@must-iq-web/lib/api/config';

export const authApi = {
    login: (email: string, password: string) =>
        apiClient.post<{ user: any; accessToken: string }>('/auth/login', { email, password }).then(res => res.data),
    ssoRedirect: () => `${API_BASE}/auth/sso`,

    getProfile: () => apiClient.get<any>(API_ENDPOINTS.auth.profile).then(res => res.data),
    updateProfile: (data: { name?: string; teamIds?: string[]; deepSearchEnabled?: boolean }) =>
        apiClient.patch<any>(API_ENDPOINTS.auth.profile, data).then(res => res.data),
    changePassword: (data: any) =>
        apiClient.post<any>(API_ENDPOINTS.auth.changePassword, data).then(res => res.data),
    forgotPassword: (email: string) =>
        apiClient.post<any>(API_ENDPOINTS.auth.forgotPassword, { email }).then(res => res.data),
    resetPassword: (data: any) =>
        apiClient.post<any>(API_ENDPOINTS.auth.resetPassword, data).then(res => res.data),
};
