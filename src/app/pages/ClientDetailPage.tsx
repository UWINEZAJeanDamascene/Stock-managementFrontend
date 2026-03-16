import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { clientsApi, invoicesApi, quotationsApi } from '@/lib/api';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Loader2, Package, History, FileText, MapPin, Phone, Mail, Calendar, DollarSign, Edit, Power, Receipt, Quote } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

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
  createdAt?: string;
  updatedAt?: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  grandTotal: number;
  amountPaid: number;
  balance: number;
  status: string;
  totalTax?: number;
  totalTaxA?: number;
  totalTaxB?: number;
}

interface Quotation {
  _id: string;
  quotationNumber: string;
  quotationDate: string;
  createdAt: string;
  grandTotal: number;
  status: string;
  validUntil?: string;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'FRW 0.00';
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(value);
}

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  cash: 'Cash',
  credit_7: 'Credit 7 Days',
  credit_15: 'Credit 15 Days',
  credit_30: 'Credit 30 Days',
  credit_45: 'Credit 45 Days',
  credit_60: 'Credit 60 Days',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'invoices' | 'quotations' | 'outstanding'>('profile');
  const [invoiceSummary, setInvoiceSummary] = useState<{ totalInvoices: number; totalAmount: number; totalPaid: number; totalOutstanding: number } | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'history' || tab === 'invoices') {
      setActiveTab('invoices');
    }
  }, [searchParams]);

  useEffect(() => {
    if (id) {
      fetchClient();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'invoices' && id) {
      fetchInvoices();
    }
    if (activeTab === 'quotations' && id) {
      fetchQuotations();
    }
    if (activeTab === 'outstanding' && id) {
      fetchOutstandingInvoices();
    }
  }, [activeTab, id]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await clientsApi.getById(id!);
      if (response.success) {
        const data = response as { data: Client };
        setClient(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch client:', err);
      setError('Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const response = await invoicesApi.getAll({ clientId: id, limit: 50 });
      if (response.success) {
        const data = response as { data: Invoice[] };
        const invoiceList = data.data || [];
        setInvoices(invoiceList);
        
        // Calculate summary
        const totalAmount = invoiceList.reduce((sum, inv) => sum + inv.grandTotal, 0);
        const totalPaid = invoiceList.reduce((sum, inv) => sum + inv.amountPaid, 0);
        const totalOutstanding = invoiceList.reduce((sum, inv) => sum + inv.balance, 0);
        setInvoiceSummary({
          totalInvoices: invoiceList.length,
          totalAmount,
          totalPaid,
          totalOutstanding
        });
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const fetchQuotations = async () => {
    try {
      setQuotationsLoading(true);
      const response = await quotationsApi.getAll({ clientId: id, limit: 50 });
      if (response.success) {
        const data = response as { data: Quotation[] };
        setQuotations(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch quotations:', err);
    } finally {
      setQuotationsLoading(false);
    }
  };

  const fetchOutstandingInvoices = async () => {
    try {
      setInvoicesLoading(true);
      const response = await clientsApi.getOutstandingInvoices(id!);
      if (response.success) {
        const data = response as { data: Invoice[] };
        setOutstandingInvoices(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch outstanding invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!client) return;
    try {
      await clientsApi.toggleStatus(client._id);
      fetchClient();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError('Failed to update client status');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      paid: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      partial: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
      pending: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
      overdue: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
      cancelled: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      accepted: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      rejected: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
      expired: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      draft: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    };
    return statusClasses[status] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">Client not found</p>
          <button onClick={() => navigate('/clients')} className="mt-4 text-indigo-600 hover:underline">
            Back to Clients
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
          <button 
            onClick={() => navigate('/clients')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-white truncate">{client.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden md:block">Client Code: {client.code || '-'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${client.isActive ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              {client.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Purchases</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(client.totalPurchases)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <Receipt className="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Outstanding Balance</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(client.outstandingBalance)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Last Purchase</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatDate(client.lastPurchaseDate)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Credit Limit</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(client.creditLimit)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 mb-4 md:mb-6 overflow-x-auto">
          <div className="flex gap-4 md:gap-6 min-w-max">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-2 md:pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile' 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`pb-2 md:pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invoices' 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('quotations')}
              className={`pb-2 md:pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'quotations' 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Quotations
            </button>
            <button
              onClick={() => setActiveTab('outstanding')}
              className={`pb-2 md:pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'outstanding' 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Outstanding
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-slate-800 dark:text-white">Contact Information</h3>
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Mail className="h-4 w-4 md:h-5 md:w-5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm truncate text-slate-700 dark:text-slate-300">{client.contact?.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <Phone className="h-4 w-4 md:h-5 md:w-5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">{client.contact?.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <MapPin className="h-4 w-4 md:h-5 md:w-5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {[client.contact?.address, client.contact?.city, client.contact?.country].filter(Boolean).join(', ') || '-'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-slate-800 dark:text-white">Business Details</h3>
                  <div className="space-y-2 md:space-y-3">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Type</p>
                      <p className="capitalize text-sm md:text-base text-slate-800 dark:text-white">{client.type || 'individual'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Tax ID</p>
                      <p className="text-sm md:text-base text-slate-800 dark:text-white">{client.taxId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Payment Terms</p>
                      <p className="text-sm md:text-base text-slate-800 dark:text-white">{PAYMENT_TERMS_LABELS[client.paymentTerms] || client.paymentTerms}</p>
                    </div>
                    {client.notes && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Notes</p>
                        <p className="text-sm md:text-base text-slate-800 dark:text-white">{client.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-3 md:pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 md:gap-3">
                <button 
                  onClick={handleToggleStatus}
                  className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-300"
                >
                  <Power className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">{client.isActive ? 'Deactivate' : 'Activate'} Client</span>
                  <span className="sm:hidden">{client.isActive ? 'Deactivate' : 'Activate'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-3 md:space-y-4">
            {/* Summary */}
            {invoiceSummary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Invoices</p>
                  <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{invoiceSummary.totalInvoices}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Amount</p>
                  <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(invoiceSummary.totalAmount)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Paid</p>
                  <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(invoiceSummary.totalPaid)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Outstanding</p>
                  <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(invoiceSummary.totalOutstanding)}</p>
                </div>
              </div>
            )}

            {/* Invoices Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              {invoicesLoading ? (
                <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
              ) : invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Invoice #</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Due Date</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Total</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Tax</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Paid</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Balance</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-4 text-sm font-medium text-slate-800 dark:text-white">{invoice.invoiceNumber}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(invoice.invoiceDate)}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(invoice.dueDate)}</td>
                        <td className="p-4 text-sm text-right font-medium text-slate-800 dark:text-white">{formatCurrency(invoice.grandTotal)}</td>
                        <td className="p-4 text-sm text-right font-medium text-slate-800 dark:text-white">{formatCurrency(invoice.totalTax || invoice.totalTaxA + invoice.totalTaxB || 0)}</td>
                        <td className="p-4 text-sm text-right text-slate-600 dark:text-slate-400">{formatCurrency(invoice.amountPaid)}</td>
                        <td className="p-4 text-sm text-right text-slate-600 dark:text-slate-400">{formatCurrency(invoice.balance)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : (
                <div className="p-6 md:p-8 text-center text-slate-500 dark:text-slate-400">
                  No invoices found for this client
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'quotations' && (
          <div className="space-y-3 md:space-y-4">
            {/* Quotations Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              {quotationsLoading ? (
                <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
              ) : quotations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Quotation #</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Valid Until</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Total</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {quotations.map((quotation) => (
                      <tr key={quotation._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-4 text-sm font-medium text-slate-800 dark:text-white">{quotation.quotationNumber}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(quotation.createdAt || quotation.quotationDate)}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(quotation.validUntil)}</td>
                        <td className="p-4 text-sm text-right font-medium text-slate-800 dark:text-white">{formatCurrency(quotation.grandTotal)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(quotation.status)}`}>
                            {quotation.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : (
                <div className="p-6 md:p-8 text-center text-slate-500 dark:text-slate-400">
                  No quotations found for this client
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'outstanding' && (
          <div className="space-y-3 md:space-y-4">
            {/* Outstanding Invoices Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              {invoicesLoading ? (
                <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
              ) : outstandingInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Invoice #</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Due Date</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Total</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Paid</th>
                      <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Balance</th>
                      <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {outstandingInvoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-4 text-sm font-medium text-slate-800 dark:text-white">{invoice.invoiceNumber}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(invoice.invoiceDate)}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(invoice.dueDate)}</td>
                        <td className="p-4 text-sm text-right font-medium text-slate-800 dark:text-white">{formatCurrency(invoice.grandTotal)}</td>
                        <td className="p-4 text-sm text-right text-slate-600 dark:text-slate-400">{formatCurrency(invoice.amountPaid)}</td>
                        <td className="p-4 text-sm text-right text-amber-600 dark:text-amber-400 font-medium">{formatCurrency(invoice.balance)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              ) : (
                <div className="p-6 md:p-8 text-center text-slate-500 dark:text-slate-400">
                  No outstanding invoices for this client
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
