import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Permission, UserRole } from '@/lib/permissions';

/**
 * Hook for checking user permissions
 */
export function usePermission() {
  const user = useAuthStore((state) => state.user);
  
  // Get user role
  const userRole = useMemo(() => {
    return user?.role as UserRole | undefined;
  }, [user?.role]);

  /**
   * Check if user has a specific permission
   */
  const has = useCallback((permission: Permission): boolean => {
    // Admins have all permissions
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      return true;
    }
    // Check if permission exists in user's permissions array
    const permissions = user?.permissions as string[] | undefined;
    return permissions?.includes(permission) ?? false;
  }, [user]);

  /**
   * Check if user has any of the specified permissions
   */
  const hasAny = useCallback((permissions: Permission[]): boolean => {
    // Admins have all permissions
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      return true;
    }
    // Check if user has any of the required permissions
    const userPermissions = user?.permissions as string[] | undefined;
    return permissions.some(permission => userPermissions?.includes(permission));
  }, [user]);

  /**
   * Check if user has ALL of the specified permissions
   */
  const hasAll = useCallback((permissions: Permission[]): boolean => {
    // Admins have all permissions
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      return true;
    }
    const userPermissions = user?.permissions as string[] | undefined;
    return permissions.every(permission => userPermissions?.includes(permission) ?? false);
  }, [user]);

  /**
   * Check if user can edit (has write access)
   */
  const canEdit_ = useCallback((): boolean => {
    // Admin, super_admin, and editor roles can edit
    return ['admin', 'super_admin', 'editor'].includes(user?.role ?? '');
  }, [user?.role]);

  /**
   * Check if user is admin
   */
  const isAdmin_ = useCallback((): boolean => {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }, [user?.role]);

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback((role: string): boolean => {
    return user?.role === role;
  }, [user?.role]);

  /**
   * Get an object with multiple permission checks
   */
  const check = useCallback((_permissions: Permission[]) => {
    return {
      has: (permission: Permission) => has(permission),
      hasAny: (perms: Permission[]) => hasAny(perms),
      hasAll: (perms: Permission[]) => hasAll(perms),
      canEdit: canEdit_(),
      isAdmin: isAdmin_(),
    };
  }, [has, hasAny, hasAll, canEdit_, isAdmin_]);

  return {
    // Individual checks
    has,
    hasAny,
    hasAll,
    canEdit: canEdit_,
    isAdmin: isAdmin_,
    hasRole,
    
    // Combined check object
    check,
    
    // Current role
    role: userRole,
  };
}

export default usePermission;
