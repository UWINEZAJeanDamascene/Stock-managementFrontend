import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, roleDisplayNames } from '@/lib/permissions';
import { useNavigate } from 'react-router';
import { Layout } from '../layout/Layout';
import { 
  Users as UsersIcon, 
  Plus, 
  Search, 
  Trash2, 
  Key, 
  ToggleLeft,
  ToggleRight,
  Mail,
  User,
  Shield,
  AlertCircle,
  CheckCircle,
  Copy,
  ArrowLeft
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  tempPassword?: boolean;
  createdAt: string;
  lastLogin?: string;
  createdBy?: {
    name: string;
    email: string;
  };
}

export default function UsersPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState<'temp' | 'permanent'>('temp');
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'viewer' as UserRole,
    generateTemp: true,
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin()) {
      window.location.href = '/dashboard';
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getAll({ limit: 100 });
      setUsers(response.data as User[]);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const response = await usersApi.create(formData);
      if (response.tempPassword) {
        setTempPassword(response.tempPassword);
        setSuccess(`User created successfully! Temporary password: ${response.tempPassword}`);
      } else {
        setSuccess('User created successfully!');
      }
      setIsCreateDialogOpen(false);
      setFormData({ name: '', email: '', role: 'viewer', generateTemp: true, password: '' });
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    setError('');
    setActionLoading(true);

    try {
      if (resetMode === 'permanent' && newPassword) {
        // Set permanent password
        await usersApi.resetPassword(selectedUser._id, { newPassword });
        setSuccess('Password updated successfully!');
      } else {
        // Generate temporary password
        const response = await usersApi.resetPassword(selectedUser._id);
        if (response.tempPassword) {
          setTempPassword(response.tempPassword);
          setSuccess(`Password reset! New temporary password: ${response.tempPassword}`);
        }
      }
      setIsResetPasswordDialogOpen(false);
      setNewPassword('');
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await usersApi.toggleStatus(user._id);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await usersApi.delete(userId);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setIsResetPasswordDialogOpen(true);
    setTempPassword(null);
    setResetMode('temp');
    setNewPassword('');
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage user accounts and permissions</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="flex items-center gap-2 p-4 mb-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            {success}
            {tempPassword && (
              <button 
                onClick={() => tempPassword && copyToClipboard(tempPassword)}
                className="ml-2 flex items-center gap-1 text-sm underline"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            )}
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 p-4 mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="dark:border-slate-700">
              <TableHead className="dark:text-slate-300">Name</TableHead>
              <TableHead className="dark:text-slate-300">Email</TableHead>
              <TableHead className="dark:text-slate-300">Role</TableHead>
              <TableHead className="dark:text-slate-300">Status</TableHead>
              <TableHead className="dark:text-slate-300">Must Change Password</TableHead>
              <TableHead className="dark:text-slate-300">Created</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user._id} className="dark:border-slate-700">
                  <TableCell className="font-medium dark:text-white">{user.name}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {roleDisplayNames[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`flex items-center gap-1 ${
                        user.isActive ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {user.isActive ? (
                        <ToggleRight className="h-5 w-5" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                      <span className="text-sm">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell>
                    {user.mustChangePassword || user.tempPassword ? (
                      <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 dark:text-slate-400">
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-yellow-600 hover:text-yellow-700"
                        title="Reset Password"
                        onClick={() => openResetPasswordDialog(user)}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${user.isActive ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.isActive ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        title="Delete"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account. The user will receive temporary credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@company.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    required
                  >
                    <option value="admin">Administrator</option>
                    <option value="stock_manager">Stock Manager</option>
                    <option value="sales">Sales</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="generateTemp"
                  checked={formData.generateTemp}
                  onChange={(e) => setFormData({ ...formData, generateTemp: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <label htmlFor="generateTemp" className="text-sm text-slate-700">
                  Generate temporary password (recommended)
                </label>
              </div>
              {!formData.generateTemp && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Custom Password
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter custom password"
                    minLength={6}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.name}. Choose to generate a temporary password or set a permanent one.
            </DialogDescription>
          </DialogHeader>
          {!tempPassword && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="tempPassword"
                  name="resetMode"
                  checked={resetMode === 'temp'}
                  onChange={() => setResetMode('temp')}
                  className="rounded border-slate-300"
                />
                <label htmlFor="tempPassword" className="text-sm text-slate-700">
                  Generate temporary password (user must change on login)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="permanentPassword"
                  name="resetMode"
                  checked={resetMode === 'permanent'}
                  onChange={() => setResetMode('permanent')}
                  className="rounded border-slate-300"
                />
                <label htmlFor="permanentPassword" className="text-sm text-slate-700">
                  Set permanent password
                </label>
              </div>
              {resetMode === 'permanent' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter permanent password"
                    minLength={6}
                    required={resetMode === 'permanent'}
                  />
                </div>
              )}
            </div>
          )}
          {tempPassword && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 mb-2">New temporary password:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border font-mono">
                  {tempPassword}
                </code>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(tempPassword)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-yellow-600 mt-2">
                Please share this password with the user securely.
              </p>
            </div>
          )}
          <DialogFooter>
            {tempPassword ? (
              <Button onClick={() => { setIsResetPasswordDialogOpen(false); setTempPassword(null); }}>
                Done
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleResetPassword} 
                  disabled={actionLoading || (resetMode === 'permanent' && !newPassword)}
                >
                  {actionLoading ? 'Resetting...' : resetMode === 'permanent' ? 'Set Password' : 'Reset Password'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

