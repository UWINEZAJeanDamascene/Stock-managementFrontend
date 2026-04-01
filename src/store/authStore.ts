import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types matching backend response
export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  company?: string;
  isActive?: boolean;
  lastLogin?: string;
  mustChangePassword?: boolean;
  permissions?: string[];
  [key: string]: unknown;
}

export interface Company {
  _id: string;
  id?: string;
  name: string;
  email?: string;
  isActive?: boolean;
  approvalStatus?: string;
  [key: string]: unknown;
}

// Membership from login response
export interface Membership {
  companyId: string;
  role: string;
}

interface AuthState {
  // Auth data - matching backend response
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  
  // Multi-tenancy - from memberships
  companies: Membership[];
  activeCompanyId: string | null;
  activeRole: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setRefreshToken: (token: string | null) => void;
  setCompanies: (companies: Membership[]) => void;
  setActiveCompany: (companyId: string, role: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Auth actions
  login: (
    user: User, 
    accessToken: string, 
    refreshToken: string, 
    memberships: Membership[]
  ) => void;
  logout: () => void;
  refreshTokens: (newAccessToken: string, newRefreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      
      // Multi-tenancy
      companies: [],
      activeCompanyId: null,
      activeRole: null,
      
      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ 
        accessToken, 
        isAuthenticated: !!accessToken 
      }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setCompanies: (companies) => set({ companies }),
      
      setActiveCompany: (companyId, role) => set({ 
        activeCompanyId: companyId,
        activeRole: role 
      }),
      
      setLoading: (loading) => set({ loading }),
      
      login: (user, accessToken, refreshToken, memberships) => {
        // Set first company as active if multiple
        const activeCompany = memberships[0] || null;
        
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          companies: memberships,
          activeCompanyId: activeCompany?.companyId || null,
          activeRole: activeCompany?.role || null,
        });
      },
      
      logout: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        companies: [],
        activeCompanyId: null,
        activeRole: null,
      }),
      
      refreshTokens: (newAccessToken, newRefreshToken) => set({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }),
      
      updateUser: (userData) => {
        const currentUser = get().user;
        set({ user: currentUser ? { ...currentUser, ...userData } : null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        companies: state.companies,
        activeCompanyId: state.activeCompanyId,
        activeRole: state.activeRole,
      }),
    }
  )
);

// Selectors
export const selectToken = (state: AuthState) => state.accessToken;
export const selectRefreshToken = (state: AuthState) => state.refreshToken;
export const selectActiveCompany = (state: AuthState) => state.activeCompanyId;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectUser = (state: AuthState) => state.user;
export const selectCompanies = (state: AuthState) => state.companies;
export const selectActiveRole = (state: AuthState) => state.activeRole;
