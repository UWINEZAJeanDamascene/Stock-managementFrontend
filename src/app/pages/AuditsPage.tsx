import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { stockAuditApi, warehouseApi, categoriesApi } from '@/lib/api';
import { Plus, Search, X, Loader2, ClipboardCheck, Check, AlertTriangle } from 'lucide-react';

interface Audit {
  _id: string;
  auditNumber: string;
  warehouse?: { _id: string; name: string; code: string };
  category?: { _id: string; name: string };
  type: 'full' | 'partial' | 'cycle_count' | 'spot_check';
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  totalItems: number;
  itemsCounted: number;
  itemsWithVariance: number;
  startDate: string;
  dueDate?: string;
  completedDate?: string;
}

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formWarehouse, setFormWarehouse] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState('cycle_count');
  const [formDueDate, setFormDueDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [auditsRes, warehousesRes, categoriesRes] = await Promise.all([
        stockAuditApi.getAll({ status: filterStatus || undefined }),
        warehouseApi.getAll({ limit: 100 }),
        categoriesApi.getAll()
      ]);
      
      if (auditsRes.success) {
        setAudits((auditsRes as any).data || []);
      }
      if (warehousesRes.success) {
        setWarehouses((warehousesRes as any).data || []);
      }
      if (categoriesRes.success) {
        setCategories((categoriesRes as any).data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setFormWarehouse('');
    setFormCategory('');
    setFormType('cycle_count');
    setFormDueDate('');
    setFormNotes('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        warehouse: formWarehouse || undefined,
        category: formCategory || undefined,
        type: formType,
        dueDate: formDueDate || undefined,
        notes: formNotes || undefined
      };

      await stockAuditApi.create(data);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to create audit:', err);
      // If the API returned a message, surface it to the user for debugging
      const msg = err?.message || (err?.data && err.data.message) || 'Failed to create audit';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Complete this audit and adjust stock based on counted quantities?')) return;
    try {
      await stockAuditApi.complete(id, { adjustStock: true });
      fetchData();
    } catch (err) {
      console.error('Failed to complete:', err);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this audit?')) return;
    try {
      await stockAuditApi.cancel(id, 'Cancelled by user');
      fetchData();
    } catch (err) {
      console.error('Failed to cancel:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
      case 'in_progress': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'completed': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'full': return 'Full Audit';
      case 'partial': return 'Partial';
      case 'cycle_count': return 'Cycle Count';
      case 'spot_check': return 'Spot Check';
      default: return type;
    }
  };

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col gap-3 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ClipboardCheck className="h-6 w-6" /> Stock Audits
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Perform stock audits and cycle counts</p>
            </div>
            <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> New Audit
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm min-w-[150px]">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : audits.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">No audits found</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Audit #</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Type</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Warehouse</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Progress</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Variance</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Date</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {audits.map((audit) => (
                    <tr key={audit._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 text-sm dark:text-white font-medium">{audit.auditNumber}</td>
                      <td className="p-4 text-sm dark:text-slate-300">{getTypeLabel(audit.type)}</td>
                      <td className="p-4 text-sm dark:text-slate-300">{audit.warehouse?.name || 'All'}</td>
                      <td className="p-4 text-sm dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600" 
                              style={{ width: `${audit.totalItems > 0 ? (audit.itemsCounted / audit.totalItems) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-xs">{audit.itemsCounted}/{audit.totalItems}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {audit.itemsWithVariance > 0 ? (
                          <span className="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="h-4 w-4" />
                            {audit.itemsWithVariance}
                          </span>
                        ) : (
                          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="h-4 w-4" />
                            0
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(audit.status)}`}>
                          {getStatusLabel(audit.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm dark:text-slate-300">
                        {audit.startDate ? new Date(audit.startDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(audit.status === 'draft' || audit.status === 'in_progress') && (
                            <>
                              {audit.itemsCounted === audit.totalItems && audit.totalItems > 0 && (
                                <button onClick={() => handleComplete(audit._id)} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                                  Complete
                                </button>
                              )}
                              <button onClick={() => handleCancel(audit._id)} className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Cancel">
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">New Stock Audit</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <X className="h-5 w-5 dark:text-slate-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Audit Type *</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                    <option value="cycle_count">Cycle Count</option>
                    <option value="full">Full Audit</option>
                    <option value="partial">Partial</option>
                    <option value="spot_check">Spot Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Warehouse</label>
                  <select value={formWarehouse} onChange={(e) => setFormWarehouse(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                    <option value="">All Warehouses</option>
                    {warehouses.map(w => (
                      <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                    <option value="">All Categories</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Due Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Audit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
