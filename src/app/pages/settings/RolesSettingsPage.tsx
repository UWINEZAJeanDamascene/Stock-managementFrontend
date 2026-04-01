import { useState, useEffect } from 'react';
import { accessApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Shield,
  Plus,
  Loader2,
  Lock,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Save,
  ArrowLeft,
  Search
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

interface Permission {
  resource: string;
  actions: string[];
}

interface Role {
  _id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  permissions: Permission[];
}

const ALL_RESOURCES = [
  'products', 'stock', 'clients', 'suppliers', 'warehouses',
  'sales_invoices', 'quotations', 'delivery_notes', 'credit_notes',
  'purchase_orders', 'grn', 'purchase_returns',
  'journal_entries', 'chart_of_accounts', 'periods', 'bank_accounts',
  'ar_receipts', 'ap_payments', 'payroll', 'expenses',
  'assets', 'budgets', 'reports', 'users', 'roles',
  'stock_transfers', 'stock_audits', 'loans', 'petty_cash',
  'fixed_assets', 'tax', 'notifications', 'settings'
];

const ALL_ACTIONS = ['read', 'create', 'update', 'delete', 'approve', 'post', 'reverse', 'confirm', 'send', 'convert', 'close', 'reopen', 'depreciate', 'dispose'];

const resourceLabel = (r: string) => r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const actionLabel = (a: string) => a.charAt(0).toUpperCase() + a.slice(1);

export default function RolesSettingsPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState<Permission[]>([]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await accessApi.getRoles() as any;
      setRoles(response.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const closeDrawer = () => {
    setDrawerMode(null);
    setSelectedRole(null);
    setFormName('');
    setFormDescription('');
    setFormPermissions([]);
  };

  const openCreate = () => {
    setFormName('');
    setFormDescription('');
    setFormPermissions([]);
    setDrawerMode('create');
  };

  const openEdit = (role: Role) => {
    setSelectedRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissions(JSON.parse(JSON.stringify(role.permissions)));
    setDrawerMode('edit');
  };

  const openView = (role: Role) => {
    setSelectedRole(role);
    setDrawerMode('view');
  };

  const togglePermission = (resource: string, action: string) => {
    setFormPermissions(prev => {
      const copy = [...prev];
      const existing = copy.find(p => p.resource === resource);
      if (existing) {
        if (existing.actions.includes(action)) {
          existing.actions = existing.actions.filter(a => a !== action);
          if (existing.actions.length === 0) {
            return copy.filter(p => p.resource !== resource);
          }
        } else {
          existing.actions.push(action);
        }
        return copy;
      } else {
        return [...copy, { resource, actions: [action] }];
      }
    });
  };

  const handleCreate = async () => {
    if (!formName.trim()) { toast.error('Role name is required'); return; }
    setActionLoading('create');
    try {
      await accessApi.createRole({ name: formName, description: formDescription, permissions: formPermissions });
      toast.success('Role created');
      closeDrawer();
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRole) return;
    setActionLoading('update');
    try {
      await accessApi.updateRole(selectedRole._id, { name: formName, description: formDescription, permissions: formPermissions });
      toast.success('Role updated');
      closeDrawer();
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system_role) { toast.error('Cannot delete system roles'); return; }
    if (!confirm(`Delete role "${role.name}"?`)) return;
    setActionLoading(role._id);
    try {
      await accessApi.deleteRole(role._id);
      toast.success('Role deleted');
      fetchRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Roles & Permissions
              </h1>
              <p className="text-muted-foreground">Configure what each role can access and do</p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search roles..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        {/* Roles Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map(role => (
              <Card key={role._id} className={!role.is_system_role ? 'border-primary/30' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {role.is_system_role ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Shield className="h-4 w-4 text-primary" />}
                      {role.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </CardTitle>
                    {role.is_system_role ? (
                      <Badge variant="outline" className="text-xs">System</Badge>
                    ) : (
                      <Badge className="text-xs bg-primary/10 text-primary">Custom</Badge>
                    )}
                  </div>
                  {role.description && (
                    <CardDescription className="text-xs">{role.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 6).map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {p.resource === '*' ? 'All Resources' : resourceLabel(p.resource)}
                        </Badge>
                      ))}
                      {role.permissions.length > 6 && (
                        <Badge variant="secondary" className="text-xs">+{role.permissions.length - 6} more</Badge>
                      )}
                    </div>
                    <div className="flex gap-1 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openView(role)}>
                        View
                      </Button>
                      {!role.is_system_role && (
                        <>
                          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(role)}>
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(role)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Drawer ──────────────────────────────────────────────── */}
        {drawerMode && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-background border-l z-50 shadow-xl flex flex-col">

              {/* View Permissions */}
              {drawerMode === 'view' && selectedRole && (
                <>
                  <div className="flex items-center justify-between p-6 border-b">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {selectedRole.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {selectedRole.is_system_role && <Badge variant="outline" className="text-xs ml-2">System</Badge>}
                      </h2>
                      <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeDrawer}>✕</Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    {selectedRole.permissions.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No permissions assigned</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedRole.permissions.map((perm, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <span className="font-medium text-sm">
                              {perm.resource === '*' ? 'All Resources' : resourceLabel(perm.resource)}
                            </span>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {perm.actions.map(a => (
                                <Badge key={a} variant="secondary" className="text-xs">{actionLabel(a)}</Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Create / Edit */}
              {(drawerMode === 'create' || drawerMode === 'edit') && (
                <>
                  <div className="flex items-center justify-between p-6 border-b">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        {drawerMode === 'create' ? <Plus className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                        {drawerMode === 'create' ? 'Create Role' : 'Edit Role'}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {drawerMode === 'create' ? 'Define a new custom role with specific permissions' : `Editing: ${selectedRole?.name}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeDrawer}>✕</Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role Name *</Label>
                        <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. warehouse_staff" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="What this role does" />
                      </div>
                    </div>

                    <div>
                      <Label className="text-base mb-3 block">Permissions</Label>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left p-3 font-medium">Resource</th>
                              {ALL_ACTIONS.slice(0, 6).map(a => (
                                <th key={a} className="text-center p-3 font-medium w-16">{actionLabel(a)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {ALL_RESOURCES.map(resource => {
                              const perm = formPermissions.find(p => p.resource === resource);
                              return (
                                <tr key={resource} className="border-t">
                                  <td className="p-3 font-medium">{resourceLabel(resource)}</td>
                                  {ALL_ACTIONS.slice(0, 6).map(action => {
                                    const checked = perm?.actions.includes(action) || false;
                                    return (
                                      <td key={action} className="text-center p-3">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => togglePermission(resource, action)}
                                          className="h-4 w-4 rounded border-slate-300"
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 border-t">
                    <Button
                      onClick={drawerMode === 'create' ? handleCreate : handleUpdate}
                      className="w-full gap-2"
                      disabled={actionLoading === 'create' || actionLoading === 'update'}
                    >
                      {(actionLoading === 'create' || actionLoading === 'update')
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Save className="h-4 w-4" />
                      }
                      {drawerMode === 'create' ? 'Create Role' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
