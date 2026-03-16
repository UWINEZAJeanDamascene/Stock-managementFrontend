import { useState, useEffect } from 'react';
import { Layout } from '../layout/Layout';
import { accessApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { 
  Shield, Plus, Edit2, Trash2, X, Check, 
  Users, Lock, Globe, Smartphone
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';

interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  company?: string;
  createdAt: string;
}

const PERMISSIONS_LIST = [
  { category: 'Products', permissions: ['products:read', 'products:create', 'products:update', 'products:delete'] },
  { category: 'Invoices', permissions: ['invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete'] },
  { category: 'Purchases', permissions: ['purchases:read', 'purchases:create', 'purchases:update', 'purchases:delete'] },
  { category: 'Quotations', permissions: ['quotations:read', 'quotations:create', 'quotations:update', 'quotations:delete'] },
  { category: 'Clients', permissions: ['clients:read', 'clients:create', 'clients:update', 'clients:delete'] },
  { category: 'Suppliers', permissions: ['suppliers:read', 'suppliers:create', 'suppliers:update', 'suppliers:delete'] },
  { category: 'Categories', permissions: ['categories:read', 'categories:create', 'categories:update', 'categories:delete'] },
  { category: 'Stock', permissions: ['stock:read', 'stock:update'] },
  { category: 'Users', permissions: ['users:read', 'users:create', 'users:update', 'users:delete'] },
  { category: 'Reports', permissions: ['reports:read', 'reports:export'] },
  { category: 'Dashboard', permissions: ['dashboard:read'] },
];

export default function RolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', permissions: [] as string[] });

  const canManage = hasPermission(user?.role, 'access:manage');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const res = await accessApi.getRoles() as { success: boolean; data: Role[] };
      if (res.success) {
        setRoles(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingRole) {
        await accessApi.updateRole(editingRole._id, formData);
      } else {
        await accessApi.createRole(formData);
      }
      setShowModal(false);
      setEditingRole(null);
      setFormData({ name: '', description: '', permissions: [] });
      loadRoles();
    } catch (err) {
      console.error('Failed to save role:', err);
      alert('Failed to save role');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await accessApi.deleteRole(id);
      loadRoles();
    } catch (err) {
      console.error('Failed to delete role:', err);
      alert('Failed to delete role');
    }
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || '', permissions: role.permissions || [] });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '', permissions: [] });
    setShowModal(true);
  };

  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Role Management</h1>
          </div>
          {canManage && (
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Add Role
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Loading...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map(role => (
              <div key={role._id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-white">{role.name}</h3>
                    {role.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{role.description}</p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(role)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(role._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.permissions?.slice(0, 5).map(perm => (
                    <Badge key={perm} variant="secondary" className="text-xs">
                      {perm.split(':')[1]}
                    </Badge>
                  ))}
                  {(role.permissions?.length || 0) > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{role.permissions.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Role Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sales Manager"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="space-y-3 mt-2">
                  {PERMISSIONS_LIST.map(cat => (
                    <div key={cat.category} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">{cat.category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {cat.permissions.map(perm => (
                          <button
                            key={perm}
                            onClick={() => togglePermission(perm)}
                            className={`px-2 py-1 text-xs rounded border transition-colors ${
                              formData.permissions.includes(perm)
                                ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {perm.split(':')[1]}
                            {formData.permissions.includes(perm) && <Check className="inline h-3 w-3 ml-1" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingRole ? 'Save Changes' : 'Create Role'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
