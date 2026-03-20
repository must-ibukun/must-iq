'use client';

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'VIEWER';

import { IBaseInterface } from './base.types';

export interface AuthUser extends Omit<IBaseInterface, 'createdAt' | 'updatedAt'> {
    name: string;
    email: string;
    role: UserRole;
    teamIds: string[];
    teamNames: string[];
    initials: string;
    tokenLimit: number;
    deepSearchEnabled: boolean;
}

export interface AuthState {
    user: AuthUser | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    setAuth: (user: AuthUser, accessToken: string) => void;
    setUser: (user: AuthUser) => void;
    logout: () => void;
}
