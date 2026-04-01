import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router';
import { Layout } from '../layout/Layout';
import {
  Users,
  Search,
  Shield,
  UserPlus,
  RefreshCw,
  UserX,
  Loader2,
  ArrowLeft,
  Send,
  Key,
  Mail,
  Lock,
  Copy,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent } from '@/app/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  mustChangePassword?: boolean;
}

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'sales', label: 'Sales' },
  { value: 'stock_manager', label: 'Stock Manager' },
  { value: 'viewer', label: 'Viewer' },
];

const roleLabel = (role: string) => ROLES.find(r => r.value === role)?.label || role;

type DrawerMode = 'invite' | 'create' | 'role' | 'password' | null;

export default function UsersPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Invite form
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'viewer' });

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'viewer', password: '' });

  // Change role
  const [newRole, setNewRole] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersApi.getAll({ limit: 100 });
      setUsers((response.data as UserRow[]) || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const closeDrawer = () => {
    setDrawerMode(null);
    setSelectedUser(null);
    setGeneratedPassword(null);
    setInviteForm({ name: '', email: '', role: 'viewer' });
    setCreateForm({ name: '', email: '', role: 'viewer', password: '' });
    setNewRole('');
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('invite');
    try {
      await usersApi.create(inviteForm);
      toast.success(`Invite sent to ${inviteForm.email}`);
      closeDrawer();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');
    try {
      const response = await usersApi.create({
        ...createForm,
        generateTemp: !createForm.password,
      });
      if (response.tempPassword) {
        setGeneratedPassword(response.tempPassword);
        toast.success('User created with temporary password');
      } else {
        toast.success('User created successfully');
        closeDrawer();
      }
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return;
    setActionLoading('role');
    try {
      await usersApi.update(selectedUser._id, { role: newRole });
      toast.success(`Role changed to ${roleLabel(newRole)}`);
      closeDrawer();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (user: UserRow) => {
    if (!confirm(`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}?`)) return;
    setActionLoading(user._id);
    try {
      await usersApi.toggleStatus(user._id);
      toast.success(user.isActive ? `${user.name} deactivated` : `${user.name} activated`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (user: UserRow) => {
    setSelectedUser(user);
    setActionLoading('reset');
    try {
      const response = await usersApi.resetPassword(user._id);
      if (response.tempPassword) {
        setGeneratedPassword(response.tempPassword);
        setDrawerMode('password');
        toast.success('Password reset successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const openChangeRole = (user: UserRow) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setDrawerMode('role');
  };

  if (!isAdmin()) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground mt-2">You need administrator privileges to manage users.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                User Management
              </h1>
              <p className="text-muted-foreground">Manage team members and their roles</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setDrawerMode('invite')} variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Invite User
            </Button>
            <Button onClick={() => setDrawerMode('create')} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Create User
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabel(user.role)}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge className="bg-green-100/80 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                        ) : (
                          <Badge className="bg-red-100/80 text-red-800 dark:bg-red-900/30 dark:text-red-400">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(user.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Change Role"
                            onClick={() => openChangeRole(user)}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Reset Password"
                            onClick={() => handleResetPassword(user)}
                            disabled={actionLoading === 'reset'}
                          >
                            {actionLoading === 'reset' && selectedUser?._id === user._id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Key className="h-4 w-4" />
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${user.isActive ? 'text-destructive hover:text-destructive' : 'text-green-600 hover:text-green-600'}`}
                            title={user.isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => handleDeactivate(user)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Drawer ──────────────────────────────────────────────── */}
        {drawerMode && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l z-50 shadow-xl flex flex-col">

              {/* ── Invite User Drawer ─────────────────────────────── */}
              {drawerMode === 'invite' && (
                <>
                  <div className="flex items-center justify-between p-6 border-b">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Invite User
                      </h2>
                      <p className="text-sm text-muted-foreground">Send an invitation to join your team</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeDrawer}>✕</Button>
                  </div>
                  <form onSubmit={handleInviteUser} className="flex-1 p-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={inviteForm.name}
                        onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input
                        type="email"
                        value={inviteForm.email}
                        onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select
                        value={inviteForm.role}
                        onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="pt-4">
                      <Button type="submit" className="w-full gap-2" disabled={actionLoading === 'invite'}>
                        {actionLoading === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send Invitation
                      </Button>
                    </div>
                  </form>
                </>
              )}

              {/* ── Create User Drawer ─────────────────────────────── */}
              {drawerMode === 'create' && (
                <>
                  <div className="flex items-center justify-between p-6 border-b">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Create User
                      </h2>
                      <p className="text-sm text-muted-foreground">Set up credentials for a new team member</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeDrawer}>✕</Button>
                  </div>
                  <form onSubmit={handleCreateUser} className="flex-1 p-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={createForm.name}
                        onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <Input
                        type="email"
                        value={createForm.email}
                        onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <select
                        value={createForm.role}
                        onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><Lock className="h-3 w-3" /> Password</Label>
                      <Input
                        type="password"
                        value={createForm.password}
                        onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                        placeholder="Leave blank to auto-generate"
                      />
                      <p className="text-xs text-muted-foreground">If left blank, a temporary password will be generated</p>
                    </div>
                    {!generatedPassword && (
                      <div className="pt-4">
                        <Button type="submit" className="w-full gap-2" disabled={actionLoading === 'create'}>
                          {actionLoading === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                          Create User
                        </Button>
                      </div>
                    )}
                    {generatedPassword && (
                      <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">User created successfully</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">Temporary password (share securely):</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white dark:bg-slate-800 px-3 py-2 rounded border font-mono text-sm">
                            {generatedPassword}
                          </code>
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedPassword)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="outline" className="w-full mt-3" onClick={closeDrawer}>Done</Button>
                      </div>
                    )}
                  </form>
                </>
              )}

              {/* ── Change Role Drawer ─────────────────────────────── */}
              {drawerMode === 'role' && selectedUser && (
                <>
                  <div className="flex items-center justify-between p-6 border-b">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Change Role
                      </h2>
                      <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeDrawer}>✕</Button>
                  </div>
                  <div className="flex-1 p-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Current Role</Label>
                      <Badge variant="outline" className="text-sm">{roleLabel(selectedUser.role)}</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label>New Role</Label>
                      <select
                        value={newRole}
                        onChange={e => setNewRole(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                    <Button onClick={handleChangeRole} className="w-full" disabled={actionLoading === 'role' || newRole === selectedUser.role}>
                      {actionLoading === 'role' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Update Role
                    </Button>
                  </div>
                </>
              )}

              {/* ── Password Result Drawer ─────────────────────────── */}
              {drawerMode === 'password' && selectedUser && generatedPassword && (
                <>
                  <div className="flex items-center justify-between p-6 border-b">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        Password Reset
                      </h2>
                      <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeDrawer}>✕</Button>
                  </div>
                  <div className="flex-1 p-6 space-y-4">
                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm font-medium mb-2">New temporary password:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white dark:bg-slate-800 px-3 py-2 rounded border font-mono text-sm">
                          {generatedPassword}
                        </code>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedPassword)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Share this password with the user securely. They will be prompted to change it on first login.</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={closeDrawer}>Done</Button>
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
