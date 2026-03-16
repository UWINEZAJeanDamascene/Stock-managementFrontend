// Role types matching backend
export type UserRole = 'admin' | 'stock_manager' | 'sales' | 'viewer' | 'platform_admin';

// Permission types
export type Permission = 
  | 'products:read' | 'products:create' | 'products:update' | 'products:delete'
  | 'invoices:read' | 'invoices:create' | 'invoices:update' | 'invoices:delete'
  | 'purchases:read' | 'purchases:create' | 'purchases:update' | 'purchases:delete'
  | 'quotations:read' | 'quotations:create' | 'quotations:update' | 'quotations:delete'
  | 'clients:read' | 'clients:create' | 'clients:update' | 'clients:delete'
  | 'suppliers:read' | 'suppliers:create' | 'suppliers:update' | 'suppliers:delete'
  | 'categories:read' | 'categories:create' | 'categories:update' | 'categories:delete'
  | 'stock:read' | 'stock:update'
  | 'users:read' | 'users:create' | 'users:update' | 'users:delete'
  | 'reports:read' | 'reports:export'
  | 'dashboard:read'
  | 'access:manage';

// Role-Permission mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    // Products
    'products:read', 'products:create', 'products:update', 'products:delete',
    // Invoices
    'invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete',
    // Purchases
    'purchases:read', 'purchases:create', 'purchases:update', 'purchases:delete',
    // Quotations
    'quotations:read', 'quotations:create', 'quotations:update', 'quotations:delete',
    // Clients
    'clients:read', 'clients:create', 'clients:update', 'clients:delete',
    // Suppliers
    'suppliers:read', 'suppliers:create', 'suppliers:update', 'suppliers:delete',
    // Categories
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    // Stock
    'stock:read', 'stock:update',
    // Users
    'users:read', 'users:create', 'users:update', 'users:delete',
    // Reports
    'reports:read', 'reports:export',
    // Dashboard
    'dashboard:read',
    // Access Management
    'access:manage',
  ],
  stock_manager: [
    // Products - read only
    'products:read',
    // Categories - read only
    'categories:read',
    // Suppliers - read only
    'suppliers:read',
    // Stock - read only
    'stock:read',
    // Invoices - read only
    'invoices:read',
    // Purchases - read only
    'purchases:read',
    // Quotations - read only
    'quotations:read',
    // Clients - read only
    'clients:read',
    // Reports - read only
    'reports:read',
    // Dashboard
    'dashboard:read',
  ],
  sales: [
    // Products
    'products:read',
    // Invoices
    'invoices:read', 'invoices:create', 'invoices:update',
    // Purchases
    'purchases:read',
    // Quotations
    'quotations:read', 'quotations:create', 'quotations:update',
    // Clients
    'clients:read', 'clients:create', 'clients:update',
    // Suppliers
    'suppliers:read',
    // Categories
    'categories:read',
    // Stock
    'stock:read',
    // Reports
    'reports:read', 'reports:export',
    // Dashboard
    'dashboard:read',
  ],
  viewer: [
    // Read-only access
    'products:read',
    'invoices:read',
    'purchases:read',
    'quotations:read',
    'clients:read',
    'suppliers:read',
    'categories:read',
    'stock:read',
    'users:read',
    'reports:read',
    'dashboard:read',
  ],
  platform_admin: [
    // Full access to platform management
    'products:read', 'products:create', 'products:update', 'products:delete',
    'invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete',
    'purchases:read', 'purchases:create', 'purchases:update', 'purchases:delete',
    'quotations:read', 'quotations:create', 'quotations:update', 'quotations:delete',
    'clients:read', 'clients:create', 'clients:update', 'clients:delete',
    'suppliers:read', 'suppliers:create', 'suppliers:update', 'suppliers:delete',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'stock:read', 'stock:update',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'reports:read', 'reports:export',
    'dashboard:read',
  ],
};

// Check if a role has a specific permission
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) ?? false;
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(permission => rolePermissions[role]?.includes(permission));
}

// Check if role can edit (create, update, delete)
export function canEdit(role: UserRole | undefined): boolean {
  return hasAnyPermission(role, [
    'products:create', 'products:update', 'products:delete',
    'invoices:create', 'invoices:update', 'invoices:delete',
    'purchases:create', 'purchases:update', 'purchases:delete',
    'quotations:create', 'quotations:update', 'quotations:delete',
    'clients:create', 'clients:update', 'clients:delete',
    'suppliers:create', 'suppliers:update', 'suppliers:delete',
    'categories:create', 'categories:update', 'categories:delete',
    'users:create', 'users:update', 'users:delete',
  ]);
}

// Check if role is admin
export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin';
}

// Get all permissions for a role
export function getPermissions(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}

// Role display names
export const roleDisplayNames: Record<UserRole, string> = {
  admin: 'Administrator',
  stock_manager: 'Stock Manager',
  sales: 'Sales',
  viewer: 'Viewer',
  platform_admin: 'Platform Admin',
};
