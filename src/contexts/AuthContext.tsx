import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useAuthStore, User, Membership } from '@/store/authStore';

// Auth Context Type
interface AuthContextType {
  user: User | null;
  companyId: string | null;
  accessToken: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  canEdit: () => boolean;
  isAdmin: () => boolean;
  login: (user: User, accessToken: string, refreshToken: string, memberships: Membership[]) => void;
  logout: () => void;
  refreshTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<User>) => void;
  setActiveCompany: (companyId: string, role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAuthStore();
  
  // Check permissions based on user role/permissions
  const hasPermission = useCallback((permission: string) => {
    if (!store.user) return false;
    // Admin has all permissions
    if (store.user.role === 'admin' || store.user.role === 'super_admin') return true;
    // Check if permission exists in user's permissions array
    const permissions = store.user.permissions as string[] | undefined;
    return permissions?.includes(permission) ?? false;
  }, [store.user]);
  
  const hasAnyPermission = useCallback((permissions: string[]) => {
    if (!store.user) return false;
    // Admin has all permissions
    if (store.user.role === 'admin' || store.user.role === 'super_admin') return true;
    const userPermissions = store.user.permissions as string[] | undefined;
    return permissions.some(permission => userPermissions?.includes(permission));
  }, [store.user]);
  
  const canEdit = useCallback(() => {
    if (!store.user) return false;
    // Admin and editor roles can edit
    return ['admin', 'super_admin', 'editor'].includes(store.user.role ?? '');
  }, [store.user]);
  
  const isAdmin = useCallback(() => {
    if (!store.user) return false;
    return store.user.role === 'admin' || store.user.role === 'super_admin';
  }, [store.user]);
  
  const value: AuthContextType = {
    user: store.user,
    companyId: store.activeCompanyId,
    accessToken: store.accessToken,
    loading: store.loading,
    isAuthenticated: store.isAuthenticated,
    hasPermission,
    hasAnyPermission,
    canEdit,
    isAdmin,
    login: store.login,
    logout: store.logout,
    refreshTokens: store.refreshTokens,
    updateUser: store.updateUser,
    setActiveCompany: store.setActiveCompany,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return default values matching the store
    const store = useAuthStore.getState();
    return {
      user: store.user,
      companyId: store.activeCompanyId,
      accessToken: store.accessToken,
      loading: store.loading,
      isAuthenticated: store.isAuthenticated,
      hasPermission: () => false,
      hasAnyPermission: () => false,
      canEdit: () => false,
      isAdmin: () => false,
      login: store.login,
      logout: store.logout,
      refreshTokens: store.refreshTokens,
      updateUser: store.updateUser,
      setActiveCompany: store.setActiveCompany,
    };
  }
  return context;
}
