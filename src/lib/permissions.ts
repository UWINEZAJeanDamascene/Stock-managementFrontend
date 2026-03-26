// Permission types
export type Permission = string;

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

// Role display names mapping
export const roleDisplayNames: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  user: 'User',
  viewer: 'Viewer',
};

// Stub permission functions - always return false
export function hasPermission(_role: UserRole | undefined, _permission: Permission): boolean {
  return false;
}

export function hasAnyPermission(_role: UserRole | undefined, _permissions: Permission[]): boolean {
  return false;
}

export function canEdit(_role: UserRole | undefined): boolean {
  return false;
}

export function isAdmin(_role: UserRole | undefined): boolean {
  return false;
}
