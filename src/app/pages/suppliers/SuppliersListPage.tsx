import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { useCurrency } from '@/contexts/CurrencyContext';
import { 
  Plus, 
  Search,
  Eye,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2
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
import { toast } from 'sonner';

interface Supplier {
  _id: string;
  name: string;
  code: string;
  contact: {
    email?: string;
    phone?: string;
    contactPerson?: string;
    city?: string;
    country?: string;
  };
  paymentTerms: string;
  isActive: boolean;
  totalPurchases: number;
  productsCount?: number;
  productsSupplied?: unknown[];
}

export default function SuppliersListPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.isActive = statusFilter;

      const response: any = await suppliersApi.getAll(params);
      if (response.success) {
        setSuppliers(response.data || []);
        setTotalPages(response.pages || 1);
        setTotal(response.total || 0);
      }
    } catch (error) {
      console.error('[SuppliersListPage] Failed to fetch suppliers:', error);
      toast.error(t('suppliers.errors.fetchFailed', 'Failed to load suppliers'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, t]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('suppliers.confirmDelete', 'Are you sure you want to delete this supplier?'))) return;
    try {
      const response: any = await suppliersApi.delete(id);
      if (response.success) {
        toast.success(t('suppliers.success.deleted', 'Supplier deleted successfully'));
        fetchSuppliers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('suppliers.errors.deleteFailed', 'Failed to delete supplier'));
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const response: any = await suppliersApi.toggleStatus(id);
      if (response.success) {
        toast.success(t('suppliers.success.statusToggled', 'Supplier status updated'));
        fetchSuppliers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('suppliers.errors.toggleFailed', 'Failed to update status'));
    }
  };

  const getPaymentTermsLabel = (terms: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      credit_7: 'Credit 7 Days',
      credit_15: 'Credit 15 Days',
      credit_30: 'Credit 30 Days',
      credit_45: 'Credit 45 Days',
      credit_60: 'Credit 60 Days',
    };
    return labels[terms] || terms;
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('suppliers.title', 'Suppliers')}</h1>
            <p className="text-muted-foreground">{t('suppliers.subtitle', 'Manage supplier relationships')}</p>
          </div>
          <Button onClick={() => navigate('/suppliers/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('suppliers.addSupplier', 'Add Supplier')}
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t('suppliers.searchPlaceholder', 'Search by name, code, or email...')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
            >
              <option value="">{t('suppliers.allStatus', 'All Status')}</option>
              <option value="true">{t('common.active', 'Active')}</option>
              <option value="false">{t('common.inactive', 'Inactive')}</option>
            </select>
            <Button type="submit" variant="secondary">
              {t('common.search', 'Search')}
            </Button>
          </form>
        </div>

        {/* Table */}
        <div className="bg-card dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="dark:bg-slate-700">
                  <TableHead className="dark:text-white">{t('suppliers.code', 'Code')}</TableHead>
                  <TableHead className="dark:text-white">{t('suppliers.name', 'Name')}</TableHead>
                  <TableHead className="dark:text-white">{t('suppliers.contact', 'Contact')}</TableHead>
                  <TableHead className="dark:text-white">{t('suppliers.paymentTerms', 'Payment Terms')}</TableHead>
                  <TableHead className="text-right dark:text-white">{t('suppliers.totalPurchases', 'Total Purchases')}</TableHead>
                  <TableHead className="dark:text-white">{t('suppliers.status', 'Status')}</TableHead>
                  <TableHead className="text-right dark:text-white">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground dark:text-slate-400">
                      {t('suppliers.noSuppliers', 'No suppliers found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier._id} className="dark:hover:bg-slate-700/50">
                      <TableCell className="font-mono text-sm dark:text-slate-200">{supplier.code}</TableCell>
                      <TableCell className="font-medium dark:text-slate-200">{supplier.name}</TableCell>
                      <TableCell className="dark:text-slate-300">
                        <div className="text-sm">
                          {supplier.contact?.contactPerson && <div className="dark:text-slate-200">{supplier.contact.contactPerson}</div>}
                          {supplier.contact?.email && <div className="text-muted-foreground dark:text-slate-400">{supplier.contact.email}</div>}
                          {supplier.contact?.phone && <div className="text-muted-foreground dark:text-slate-400">{supplier.contact.phone}</div>}
                          {!supplier.contact?.email && !supplier.contact?.phone && !supplier.contact?.contactPerson && '-'}
                        </div>
                      </TableCell>
                      <TableCell className="dark:text-slate-300">{getPaymentTermsLabel(supplier.paymentTerms)}</TableCell>
                      <TableCell className="text-right dark:text-slate-200">{formatCurrency(supplier.totalPurchases)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={supplier.isActive ? 'default' : 'secondary'}
                          className={supplier.isActive ? 'bg-green-500 dark:bg-green-600' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleToggleStatus(supplier._id)}
                        >
                          {supplier.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/suppliers/${supplier._id}`)}
                            title={t('common.view', 'View')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/suppliers/${supplier._id}/edit`)}
                            title={t('common.edit', 'Edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(supplier._id)}
                            title={t('common.delete', 'Delete')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('common.showing', 'Showing')} {suppliers.length} {t('common.of', 'of')} {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${page === 1 ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${page === pageNum ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${page === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
