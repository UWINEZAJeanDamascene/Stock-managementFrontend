import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, companyApi } from '@/lib/api';
import { UserRole, hasPermission, hasAnyPermission, canEdit, isAdmin, Permission } from '@/lib/permissions';

interface Company {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  company: Company | string;
  mustChangePassword?: boolean;
}

interface LoginResponse {
  success: boolean;
  token: string;
  data: User;
  company?: Company;
  requirePasswordChange?: boolean;
  isPlatformAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  token: string | null;
  loading: boolean;
  requirePasswordChange: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerCompany: (companyData: { name: string; email: string; tin?: string; phone?: string }, adminData: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  // Role checking functions
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  canEdit: () => boolean;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await authApi.getMe();
          const userData = response.data as User;
          setUser(userData);
          // If company is populated
          if (userData.company) {
            if (typeof userData.company === 'object') {
              setCompany(userData.company as Company);
            }
          }
        } catch {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password) as unknown as LoginResponse;
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.data);
    
    // Set company from response
    if (response.company) {
      setCompany(response.company);
    }
    
    // Check if user needs to change password
    if (response.requirePasswordChange) {
      setRequirePasswordChange(true);
    }
    
    // Store platform admin flag
    if (response.isPlatformAdmin) {
      localStorage.setItem('isPlatformAdmin', 'true');
    } else {
      localStorage.removeItem('isPlatformAdmin');
    }
  };

  const registerCompany = async (
    companyData: { name: string; email: string; tin?: string; phone?: string },
    adminData: { name: string; email: string; password: string }
  ) => {
    const response = await companyApi.register(companyData, adminData);
    // Don't set token - company needs approval first
    // The response contains company info but no token
    // User will need to wait for approval before logging in
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('isPlatformAdmin');
      setToken(null);
      setUser(null);
      setCompany(null);
    }
  };

  // Get user role
  const userRole = user?.role as UserRole | undefined;

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        loading,
        requirePasswordChange,
        login,
        registerCompany,
        logout,
        isAuthenticated: !!token && !!user,
        hasPermission: (permission: Permission) => hasPermission(userRole, permission),
        hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
        canEdit: () => canEdit(userRole),
        isAdmin: () => isAdmin(userRole),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
