import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, AuthUser } from '@must-iq-web/types/auth.types';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      setUser: (user: AuthUser) => set({ user }),
      logout: () => {

        set({ user: null, accessToken: null, isAuthenticated: false });

        if (typeof document !== 'undefined') {
          document.cookie = 'must-iq-token=; path=/; max-age=0';
          document.cookie = 'must-iq-role=; path=/; max-age=0';
        }
      },
    }),
    { name: 'must-iq-auth' }
  )
);
