/**
 * Core API utility
 */
import axios, { AxiosRequestConfig } from 'axios';

export const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1`;

export function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    // Zustand persist stores JSON; extract just the token
    try {
        const raw = localStorage.getItem('must-iq-auth');
        if (!raw) return null;
        return JSON.parse(raw)?.state?.accessToken ?? null;
    } catch {
        return null;
    }
}

// Create the core Axios instance
export const apiClient = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Intercept requests to inject the authorization token
apiClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Intercept responses to handle global errors (like 401)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized globally
        if (error.response?.status === 401) {
            // Skip global redirect if we're on the login page or trying to login
            const isLoginRequest = error.config?.url?.includes('/auth/login');
            
            if (!isLoginRequest && typeof window !== 'undefined') {
                console.warn('Unauthorized request detected. Redirecting to home/login.');
                // Clear auth data
                localStorage.removeItem('must-iq-auth');
                // Clear cookies
                document.cookie = 'must-iq-token=; path=/; max-age=0';
                document.cookie = 'must-iq-role=; path=/; max-age=0';
                // Redirect to landing page / login
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);
