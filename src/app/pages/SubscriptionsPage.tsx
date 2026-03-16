import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { subscriptionsApi, clientsApi, recurringApi } from '@/lib/api';
import { CreditCard, Plus, Search, Edit, Trash2, X, Loader2, MoreHorizontal, Play, Pause, Power } from 'lucide-react';

interface Subscription {
  _id: string;
  client: {
    _id: string;
    name: string;
  };
  recurringInvoice?: {
    _id: string;
    name: string;
  };
  planName: string;
  amount: number;
  currency: string;
  billingCycle: 'weekly' | 'monthly' | 'quarterly';
  interval: number;
  status: 'active' | 'paused' | 'cancelled';
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  createdBy: {
    _id: string;
    name: string;
  };
}

const BILLING_CYCLE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number, currency: string = 'RWF'): string {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: currency }).format(value);
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  // Form fields
  const [formClient, setFormClient] = useState('');
  const [formPlanName, setFormPlanName] = useState('');
  const [formAmount, setFormAmount] = useState(0);
  const [formCurrency, setFormCurrency] = useState('FRW');
  const [formBillingCycle, setFormBillingCycle] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [formInterval, setFormInterval] = useState(1);
  const [formStatus, setFormStatus] = useState<'active' | 'paused' | 'cancelled'>('active');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formRecurringInvoice, setFormRecurringInvoice] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClick = () => setShowActionsMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, tRes] = await Promise.all([
        subscriptionsApi.getAll(), 
        clientsApi.getAll({ limit: 100 }), 
        recurringApi.getAll()
      ]);
      if (sRes.success) setSubs((sRes as any).data || []);
      if (cRes.success) setClients((cRes as any).data || []);
      if (tRes.success) setTemplates((tRes as any).data || []);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const openModal = (sub?: Subscription) => {
    if (sub) {
      setEditingSub(sub);
      setFormClient(sub.client?._id || '');
      setFormPlanName(sub.planName);
      setFormAmount(sub.amount);
      setFormCurrency(sub.currency || 'FRW');
      setFormBillingCycle(sub.billingCycle || 'monthly');
      setFormInterval(sub.interval || 1);
      setFormStatus(sub.status || 'active');
      setFormStartDate(sub.startDate ? sub.startDate.split('T')[0] : '');
      setFormEndDate(sub.endDate ? sub.endDate.split('T')[0] : '');
      setFormRecurringInvoice(sub.recurringInvoice?._id || '');
    } else {
      setEditingSub(null);
      setFormClient('');
      setFormPlanName('');
      setFormAmount(0);
      setFormCurrency('FRW');
      setFormBillingCycle('monthly');
      setFormInterval(1);
      setFormStatus('active');
      setFormStartDate(new Date().toISOString().split('T')[0]);
      setFormEndDate('');
      setFormRecurringInvoice('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const subData = {
      client: formClient,
      planName: formPlanName,
      amount: formAmount,
      currency: formCurrency,
      billingCycle: formBillingCycle,
      interval: formInterval,
      status: formStatus,
      startDate: formStartDate,
      endDate: formEndDate || undefined,
      recurringInvoice: formRecurringInvoice || undefined
    };

    try {
      if (editingSub) {
        await subscriptionsApi.update(editingSub._id, subData);
      } else {
        await subscriptionsApi.create(subData);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    try {
      await subscriptionsApi.delete(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await subscriptionsApi.update(id, { status });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleActionsMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setShowActionsMenu(showActionsMenu === id ? null : id);
  };

  const filteredSubs = subs.filter(s => 
    s.planName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    }
  };

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Subscriptions</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Manage client subscriptions</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => openModal()} 
              className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg flex-1 sm:flex-none text-sm"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Subscription</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 md:mb-6">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search subscriptions..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : filteredSubs.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p>No subscriptions found</p>
            <button onClick={() => openModal()} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline">Create your first subscription</button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Client</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Plan</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Billing</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Next Billing</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredSubs.map((sub) => (
                    <tr key={sub._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{sub.client?.name || '-'}</td>
                      <td className="p-4 text-sm font-medium text-slate-800 dark:text-white">{sub.planName}</td>
                      <td className="p-4 text-sm text-right font-medium text-slate-800 dark:text-white">
                        {formatCurrency(sub.amount, sub.currency)}
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300 capitalize">
                        {sub.billingCycle}/{sub.interval}
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-4 text-center relative">
                        <button
                          onClick={(e) => toggleActionsMenu(e, sub._id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        >
                          <MoreHorizontal className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                        </button>
                        
                        {showActionsMenu === sub._id && (
                          <div className="absolute right-4 top-10 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg z-10 w-48 py-1">
                            {sub.status !== 'active' && (
                              <button 
                                onClick={() => handleUpdateStatus(sub._id, 'active')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-slate-300"
                              >
                                <Play className="h-4 w-4" /> Activate
                              </button>
                            )}
                            {sub.status === 'active' && (
                              <button 
                                onClick={() => handleUpdateStatus(sub._id, 'paused')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-slate-300"
                              >
                                <Pause className="h-4 w-4" /> Pause
                              </button>
                            )}
                            {sub.status !== 'cancelled' && (
                              <button 
                                onClick={() => handleUpdateStatus(sub._id, 'cancelled')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-slate-300"
                              >
                                <Power className="h-4 w-4" /> Cancel
                              </button>
                            )}
                            <button 
                              onClick={() => openModal(sub)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-slate-300"
                            >
                              <Edit className="h-4 w-4" /> Edit
                            </button>
                            <hr className="my-1 border-slate-200 dark:border-slate-700" />
                            <button 
                              onClick={() => handleDelete(sub._id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">
                  {editingSub ? 'Edit Subscription' : 'New Subscription'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <X className="h-5 w-5 dark:text-slate-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Client *</label>
                    <select 
                      value={formClient} 
                      onChange={(e) => setFormClient(e.target.value)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      required
                    >
                      <option value="">Select Client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Plan Name *</label>
                    <input 
                      type="text" 
                      value={formPlanName} 
                      onChange={(e) => setFormPlanName(e.target.value)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Amount *</label>
                    <input 
                      type="number" 
                      min={0}
                      step={0.01}
                      value={formAmount} 
                      onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Currency</label>
                    <select 
                      value={formCurrency} 
                      onChange={(e) => setFormCurrency(e.target.value)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    >
                      <option value="FRW">FRW</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Billing Cycle</label>
                    <select 
                      value={formBillingCycle} 
                      onChange={(e) => setFormBillingCycle(e.target.value as any)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    >
                      {BILLING_CYCLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Interval</label>
                    <input 
                      type="number" 
                      min={1}
                      value={formInterval} 
                      onChange={(e) => setFormInterval(parseInt(e.target.value) || 1)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Start Date</label>
                    <input 
                      type="date" 
                      value={formStartDate} 
                      onChange={(e) => setFormStartDate(e.target.value)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">End Date (Optional)</label>
                    <input 
                      type="date" 
                      value={formEndDate} 
                      onChange={(e) => setFormEndDate(e.target.value)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Status</label>
                    <select 
                      value={formStatus} 
                      onChange={(e) => setFormStatus(e.target.value as any)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    >
                      {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Linked Template (Optional)</label>
                    <select 
                      value={formRecurringInvoice} 
                      onChange={(e) => setFormRecurringInvoice(e.target.value)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    >
                      <option value="">None</option>
                      {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    {submitting ? 'Saving...' : (editingSub ? 'Update' : 'Create')}
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
