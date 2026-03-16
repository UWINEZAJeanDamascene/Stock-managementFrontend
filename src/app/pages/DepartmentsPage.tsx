import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { departmentsApi, usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Loader2,
  Users,
  UserPlus,
  UserMinus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Department {
  _id: string;
  name: string;
  description: string;
  userCount: number;
  createdAt: string;
  users?: DeptUser[];
}

interface DeptUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function DepartmentsPage() {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<DeptUser[]>([]);
  const [expandLoading, setExpandLoading] = useState(false);

  // Assign users state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignDeptId, setAssignDeptId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<DeptUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentsApi.getAll();
      if (response.success) {
        setDepartments(response.data as Department[]);
      }
    } catch {
      setError(t('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.areYouSure'))) return;
    try {
      await departmentsApi.delete(id);
      setSuccess(t('common.successDeleted'));
      fetchDepartments();
      if (expandedId === id) setExpandedId(null);
    } catch {
      setError(t('errors.deleteFailed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    };
    try {
      if (editingDept) {
        await departmentsApi.update(editingDept._id, data);
      } else {
        await departmentsApi.create(data);
      }
      setShowModal(false);
      setEditingDept(null);
      setSuccess(t('common.successSaved'));
      fetchDepartments();
    } catch (err: any) {
      setError(err?.message || t('errors.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setExpandLoading(true);
    try {
      const response = await departmentsApi.getById(id);
      if (response.success) {
        setExpandedUsers((response.data as any).users || []);
      }
    } catch {
      setExpandedUsers([]);
    } finally {
      setExpandLoading(false);
    }
  };

  const openAssignModal = async (deptId: string) => {
    setAssignDeptId(deptId);
    setSelectedUserIds([]);
    setShowAssignModal(true);
    try {
      const response = await usersApi.getAll({ limit: 200 });
      setAllUsers(response.data as DeptUser[]);
    } catch {
      setAllUsers([]);
    }
  };

  const handleAssignUsers = async () => {
    if (!assignDeptId || selectedUserIds.length === 0) return;
    setAssignLoading(true);
    try {
      await departmentsApi.assignUsers(assignDeptId, selectedUserIds);
      setShowAssignModal(false);
      setSuccess(t('departments.usersAssigned'));
      fetchDepartments();
      if (expandedId === assignDeptId) toggleExpand(assignDeptId);
    } catch {
      setError(t('errors.saveFailed'));
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveUser = async (deptId: string, userId: string) => {
    try {
      await departmentsApi.removeUser(deptId, userId);
      setSuccess(t('departments.userRemoved'));
      fetchDepartments();
      if (expandedId === deptId) toggleExpand(deptId);
    } catch {
      setError(t('errors.deleteFailed'));
    }
  };

  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Clear messages after 4 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  return (
    <Layout>
      <div className="p-3 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Building2 className="h-6 w-6 text-indigo-600" />
              {t('departments.title')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{t('departments.subtitle')}</p>
          </div>
          {isAdmin() && (
            <button
              onClick={() => { setEditingDept(null); setShowModal(true); }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" /> {t('departments.addDepartment')}
            </button>
          )}
        </div>

        {/* Messages */}
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">{success}</div>}

        {/* Search */}
        <div className="relative mb-4 md:mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('departments.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-sm"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
        ) : filteredDepts.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">{t('departments.noDepartments')}</div>
        ) : (
          <div className="space-y-3">
            {filteredDepts.map((dept) => (
              <div key={dept._id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between p-4 md:p-5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-white truncate">{dept.name}</h3>
                      {dept.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
                      <Users className="h-3.5 w-3.5" /> {dept.userCount}
                    </span>
                    {isAdmin() && (
                      <>
                        <button
                          onClick={() => openAssignModal(dept._id)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                          title={t('departments.assignUsers')}
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setEditingDept(dept); setShowModal(true); }}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg"
                          title={t('common.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept._id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toggleExpand(dept._id)}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      {expandedId === dept._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded user list */}
                {expandedId === dept._id && (
                  <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3">
                    {expandLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" /></div>
                    ) : expandedUsers.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">{t('departments.noUsersInDept')}</p>
                    ) : (
                      <div className="space-y-2">
                        {expandedUsers.map(user => (
                          <div key={user._id} className="flex items-center justify-between bg-white dark:bg-slate-700 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-slate-800 dark:text-white">{user.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{user.email} · {user.role}</p>
                            </div>
                            {isAdmin() && (
                              <button
                                onClick={() => handleRemoveUser(dept._id, user._id)}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                title={t('departments.removeUser')}
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  {editingDept ? t('departments.editDepartment') : t('departments.addDepartment')}
                </h2>
                <button onClick={() => { setShowModal(false); setEditingDept(null); }} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('common.name')} *</label>
                  <input
                    name="name"
                    defaultValue={editingDept?.name || ''}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                    placeholder={t('departments.namePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('common.description')}</label>
                  <textarea
                    name="description"
                    defaultValue={editingDept?.description || ''}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                    placeholder={t('departments.descriptionPlaceholder')}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingDept(null); }}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingDept ? t('common.update') : t('common.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Users Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t('departments.assignUsers')}</h2>
                <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {allUsers.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">{t('common.noData')}</p>
                ) : (
                  allUsers.map(user => (
                    <label key={user._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(prev => [...prev, user._id]);
                          } else {
                            setSelectedUserIds(prev => prev.filter(id => id !== user._id));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email} · {user.role}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleAssignUsers}
                  disabled={selectedUserIds.length === 0 || assignLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {assignLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('departments.assign')} ({selectedUserIds.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
