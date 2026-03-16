import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { suppliersApi } from '@/lib/api';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Loader2, Package, History, FileText, MapPin, Phone, Mail, Calendar, DollarSign, Edit, Power } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface Supplier {
  _id: string;
  name: string;
  code?: string;
  contact: {
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  taxId?: string;
  paymentTerms: string;
  notes?: string;
  isActive: boolean;
  totalPurchases: number;
  lastPurchaseDate?: string;
  productsSupplied?: { _id: string; name: string; sku: string; unit: string }[];
  createdAt?: string;
  updatedAt?: string;
}

interface PurchaseHistory {
  _id: string;
  product: { _id: string; name: string; sku: string; unit: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
  movementDate: string;
  batchNumber?: string;
  notes?: string;
  performedBy?: { name: string };
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

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'products' | 'history'>('profile');
  const [historySummary, setHistorySummary] = useState<{ totalAmount: number; totalQuantity: number; totalPurchases: number } | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'history') {
      setActiveTab('history');
    }
  }, [searchParams]);

  useEffect(() => {
    if (id) {
      fetchSupplier();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'history' && id) {
      fetchPurchaseHistory();
    }
  }, [activeTab, id]);

  const fetchSupplier = async () => {
    try {
      setLoading(true);
      const response = await suppliersApi.getById(id!);
      if (response.success) {
        const data = response as { data: Supplier };
        setSupplier(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch supplier:', err);
      setError('Failed to load supplier details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await suppliersApi.getPurchaseHistory(id!, { limit: 50 });
      if (response.success) {
        const data = response as unknown as { data: PurchaseHistory[]; summary: { totalAmount: number; totalQuantity: number; totalPurchases: number } };
        setPurchaseHistory(data.data || []);
        setHistorySummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch purchase history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!supplier) return;
    try {
      await suppliersApi.toggleStatus(supplier._id);
      fetchSupplier();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      setError('Failed to update supplier status');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </Layout>
    );
  }

  if (!supplier) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">Supplier not found</p>
          <button onClick={() => navigate('/suppliers')} className="mt-4 text-indigo-600 hover:underline">
            Back to Suppliers
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
            onClick={() => navigate('/suppliers')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-white truncate">{supplier.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden md:block">Supplier Code: {supplier.code || '-'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${supplier.isActive ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              {supplier.isActive ? 'Active' : 'Inactive'}
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
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(supplier.totalPurchases)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Package className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Products Supplied</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">{supplier.productsSupplied?.length || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Last Supply</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">{formatDate(supplier.lastPurchaseDate)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <FileText className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Payment Terms</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">{PAYMENT_TERMS_LABELS[supplier.paymentTerms] || supplier.paymentTerms}</p>
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
              onClick={() => setActiveTab('products')}
              className={`pb-2 md:pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'products' 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Products ({supplier.productsSupplied?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 md:pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history' 
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Supply History
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
                      <span className="text-sm truncate text-slate-700 dark:text-slate-300">{supplier.contact?.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <Phone className="h-4 w-4 md:h-5 md:w-5 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">{supplier.contact?.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                      <MapPin className="h-4 w-4 md:h-5 md:w-5 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {[supplier.contact?.address, supplier.contact?.city, supplier.contact?.country].filter(Boolean).join(', ') || '-'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 text-slate-800 dark:text-white">Business Details</h3>
                  <div className="space-y-2 md:space-y-3">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Tax ID</p>
                      <p className="text-sm md:text-base text-slate-800 dark:text-white">{supplier.taxId || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Payment Terms</p>
                      <p className="text-sm md:text-base text-slate-800 dark:text-white">{PAYMENT_TERMS_LABELS[supplier.paymentTerms] || supplier.paymentTerms}</p>
                    </div>
                    {supplier.notes && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Notes</p>
                        <p className="text-sm md:text-base text-slate-800 dark:text-white">{supplier.notes}</p>
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
                  <span className="hidden sm:inline">{supplier.isActive ? 'Deactivate' : 'Activate'} Supplier</span>
                  <span className="sm:hidden">{supplier.isActive ? 'Deactivate' : 'Activate'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            {supplier.productsSupplied && supplier.productsSupplied.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {supplier.productsSupplied.map((product) => (
                  <div key={product._id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                        <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{product.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {product.sku} | Unit: {product.unit}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                No products linked to this supplier
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 md:space-y-4">
            {/* Summary */}
            {historySummary && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Orders</p>
                  <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white truncate">{historySummary.totalPurchases}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Quantity</p>
                  <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white truncate">{historySummary.totalQuantity.toLocaleString()}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 md:p-4">
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Value</p>
                  <p className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(historySummary.totalAmount)}</p>
                </div>
              </div>
            )}

            {/* History Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              {historyLoading ? (
                <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
              ) : purchaseHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="text-left p-3 md:p-4 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Date</th>
                        <th className="text-left p-3 md:p-4 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Product</th>
                        <th className="text-right p-3 md:p-4 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Quantity</th>
                        <th className="text-right p-3 md:p-4 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Unit Cost</th>
                        <th className="text-right p-3 md:p-4 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Total</th>
                        <th className="text-left p-3 md:p-4 text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Batch #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {purchaseHistory.map((purchase) => (
                        <tr key={purchase._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="p-3 md:p-4 text-xs md:text-sm text-slate-700 dark:text-slate-300">{formatDate(purchase.movementDate)}</td>
                          <td className="p-3 md:p-4 text-xs md:text-sm">
                            <p className="font-medium text-slate-800 dark:text-white">{purchase.product?.name || '-'}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">{purchase.product?.sku}</p>
                          </td>
                          <td className="p-3 md:p-4 text-xs md:text-sm text-right text-slate-700 dark:text-slate-300">{purchase.quantity} {purchase.product?.unit}</td>
                          <td className="p-3 md:p-4 text-xs md:text-sm text-right text-slate-700 dark:text-slate-300">{formatCurrency(purchase.unitCost)}</td>
                          <td className="p-3 md:p-4 text-xs md:text-sm text-right font-medium text-slate-800 dark:text-white">{formatCurrency(purchase.totalCost)}</td>
                          <td className="p-3 md:p-4 text-xs md:text-sm text-slate-700 dark:text-slate-300">{purchase.batchNumber || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 md:p-8 text-center text-slate-500 dark:text-slate-400">
                  No purchase history found for this supplier
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
