import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { clientsApi } from '@/lib/api';
import { useNavigate } from 'react-router';
import { Users, Plus, Search, Edit, Trash2, X, Loader2, FileDown, MoreHorizontal, Eye, History, Power, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface Client {
  _id: string;
  name: string;
  code?: string;
  type: 'individual' | 'company';
  contact: {
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  taxId?: string;
  paymentTerms: string;
  creditLimit: number;
  outstandingBalance: number;
  totalPurchases: number;
  lastPurchaseDate?: string;
  notes?: string;
  isActive: boolean;
  outstandingInvoices?: number;
}

const PAYMENT_TERMS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_7', label: 'Credit 7 Days' },
  { value: 'credit_15', label: 'Credit 15 Days' },
  { value: 'credit_30', label: 'Credit 30 Days' },
  { value: 'credit_45', label: 'Credit 45 Days' },
  { value: 'credit_60', label: 'Credit 60 Days' },
];

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'FRW 0.00';
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(value);
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Form fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'individual' | 'company'>('individual');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formTaxId, setFormTaxId] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('cash');
  const [formCreditLimit, setFormCreditLimit] = useState(0);
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  useEffect(() => {
    fetchClients();
  }, [filterType, filterStatus]);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClick = () => setShowActionsMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | undefined> = { page: 1, limit: 50 };
      if (filterType) params.type = filterType;
      if (filterStatus) params.isActive = filterStatus;
      
      const response = await clientsApi.getWithStats(params);
      if (response.success) {
        const data = response as { data: Client[] };
        setClients(data.data || []);
      }
    } catch (err) {
      console.error('Failed:', err);
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormName(client.name);
      setFormType(client.type || 'individual');
      setFormPhone(client.contact?.phone || '');
      setFormEmail(client.contact?.email || '');
      setFormAddress(client.contact?.address || '');
      setFormCity(client.contact?.city || '');
      setFormCountry(client.contact?.country || '');
      setFormTaxId(client.taxId || '');
      setFormPaymentTerms(client.paymentTerms || 'cash');
      setFormCreditLimit(client.creditLimit || 0);
      setFormNotes(client.notes || '');
      setFormIsActive(client.isActive !== false);
    } else {
      setEditingClient(null);
      setFormName('');
      setFormType('individual');
      setFormPhone('');
      setFormEmail('');
      setFormAddress('');
      setFormCity('');
      setFormCountry('');
      setFormTaxId('');
      setFormPaymentTerms('cash');
      setFormCreditLimit(0);
      setFormNotes('');
      setFormIsActive(true);
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.areYouSure'))) return;
    try {
      await clientsApi.delete(id);
      fetchClients();
    } catch (err) {
      console.error('Failed:', err);
      setError('Failed to delete');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await clientsApi.toggleStatus(id);
      fetchClients();
    } catch (err) {
      console.error('Failed:', err);
      setError('Failed to update status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const clientData = {
      name: formName,
      type: formType,
      contact: {
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        city: formCity,
        country: formCountry,
      },
      taxId: formTaxId,
      paymentTerms: formPaymentTerms,
      creditLimit: formCreditLimit,
      notes: formNotes,
      isActive: formIsActive,
    };

    try {
      if (editingClient) {
        await clientsApi.update(editingClient._id, clientData);
      } else {
        await clientsApi.create(clientData);
      }
      setShowModal(false);
      fetchClients();
    } catch (err: unknown) {
      console.error('Failed:', err);
      // Try to extract error message from API response
      const errorMessage = (err as any)?.response?.data?.message || (err as any)?.message || 'Failed to save';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.isActive = filterStatus;
      
      const blob = await clientsApi.exportPDF(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clients-report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export:', err);
      setError('Failed to export');
    }
  };

  const handleViewProfile = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const handleViewHistory = (clientId: string) => {
    navigate(`/clients/${clientId}?tab=history`);
  };

  const toggleActionsMenu = (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation();
    setShowActionsMenu(showActionsMenu === clientId ? null : clientId);
  };

  const filteredClients = clients.filter(client => 
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

const canEditClients = hasPermission('clients:create') || hasPermission('clients:update') || hasPermission('clients:delete');

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{t('clients.title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{t('clients.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex-1 sm:flex-none text-sm bg-white dark:bg-slate-800"
            >
              <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">{t('common.export')}</span>
            </button>
            {hasPermission('clients:create') && (
              <button onClick={() => openModal()} className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg flex-1 sm:flex-none text-sm">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('clients.addClient')}</span>
              </button>
            )}
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 md:mb-6">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('clients.searchPlaceholder')} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" 
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2 py-2 border rounded-lg text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">{t('clients.allTypes')}</option>
              <option value="individual">{t('clients.individual')}</option>
              <option value="company">{t('clients.company')}</option>
            </select>
            
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-2 border rounded-lg text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">{t('clients.allStatus')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">{t('clients.noClients')}</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.code')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.name')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.type')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.email')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.phone')}</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('clients.totalPurchases')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('clients.lastPurchase')}</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('clients.unpaid')}</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('clients.balanceLimit')}</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.status')}</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredClients.map((client) => (
                    <tr 
                      key={client._id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                      onClick={() => navigate(`/clients/${client._id}`)}
                    >
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{client.code || '-'}</td>
                      <td className="p-4 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">{client.name}</td>
                      <td className="p-4 text-sm capitalize text-slate-600 dark:text-slate-300">{client.type || 'individual'}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{client.contact?.email || '-'}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{client.contact?.phone || '-'}</td>
                      <td className="p-4 text-sm text-right font-medium text-slate-600 dark:text-slate-300">{formatCurrency(client.totalPurchases)}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(client.lastPurchaseDate)}</td>
                      <td className="p-4 text-center">
                        {client.outstandingInvoices && client.outstandingInvoices > 0 ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-amber-100 dark:bg-yellow-900/30 text-amber-700 dark:text-yellow-400 font-medium">
                            {t('clients.outstandingInvoices', { count: client.outstandingInvoices })}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-right text-slate-600 dark:text-slate-300">
                        {formatCurrency(client.outstandingBalance)} / {formatCurrency(client.creditLimit)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${client.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                          {client.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="p-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => toggleActionsMenu(e, client._id)}
                          className="p-2 hover:bg-slate-100 rounded-lg"
                        >
                          <MoreHorizontal className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                        </button>
                        
                        {showActionsMenu === client._id && (
                          <div className="absolute right-4 top-10 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg z-10 w-48 py-1">
                            <button 
                              onClick={() => handleViewProfile(client._id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-slate-300"
                            >
                              <Eye className="h-4 w-4" /> {t('common.viewProfile')}
                            </button>
                            {hasPermission('clients:update') && (
                              <>
                                <button 
                                  onClick={() => openModal(client)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-slate-300"
                                >
                                  <Edit className="h-4 w-4" /> {t('common.edit')}
                                </button>
                                <button 
                                  onClick={() => handleViewHistory(client._id)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-slate-300"
                                >
                                  <History className="h-4 w-4" /> {t('clients.purchaseHistory')}
                                </button>
                                <button 
                                  onClick={() => handleToggleStatus(client._id)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-slate-300"
                                >
                                  <Power className="h-4 w-4" /> 
                                  {client.isActive ? t('common.deactivate') : t('common.activate')}
                                </button>
                              </>
                            )}
                            {hasPermission('clients:delete') && (
                              <>
                                <hr className="my-1 border-slate-200 dark:border-slate-700" />
                                <button 
                                  onClick={() => handleDelete(client._id)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" /> {t('common.delete')}
                                </button>
                              </>
                            )}
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

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">{editingClient ? t('clients.editClient') : t('clients.addClient')}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="h-5 w-5 dark:text-slate-300" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.name')} *</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.type')}</label>
                    <select value={formType} onChange={(e) => setFormType(e.target.value as 'individual' | 'company')} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                      <option value="individual">{t('clients.individual')}</option>
                      <option value="company">{t('clients.company')}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.email')}</label>
                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.phone')}</label>
                    <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.address')}</label>
                  <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.city')}</label>
                    <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.country')}</label>
                    <input type="text" value={formCountry} onChange={(e) => setFormCountry(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div className="sm:col-span-1 col-span-2">
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.taxId')}</label>
                    <input type="text" value={formTaxId} onChange={(e) => setFormTaxId(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.paymentTerms')}</label>
                    <select value={formPaymentTerms} onChange={(e) => setFormPaymentTerms(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                      {PAYMENT_TERMS.map(term => <option key={term.value} value={term.value}>{term.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.creditLimit')}</label>
                    <input type="number" step="0.01" value={formCreditLimit} onChange={(e) => setFormCreditLimit(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.notes')}</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                  <label htmlFor="isActive" className="text-sm font-medium dark:text-slate-300">{t('common.active')}</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">{t('common.cancel')}</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">
                    {submitting ? t('common.saving') : (editingClient ? t('common.update') : t('common.create'))}
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
