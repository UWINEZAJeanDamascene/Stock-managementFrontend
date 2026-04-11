import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { purchaseReturnsApi, grnApi, suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  Plus, 
  Eye, 
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface PurchaseReturn {
  _id: string;
  referenceNo: string;
  grn?: {
    _id: string;
    referenceNo: string;
  };
  supplier?: {
    _id: string;
    name: string;
    code?: string;
  };
  returnDate: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  totalAmount: number;
}

interface Supplier {
  _id: string;
  name: string;
  code?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}

export default function PurchaseReturnsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [returnList, setReturnList] = useState<PurchaseReturn[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchSuppliers = useCallback(async () => {
    try {
      console.log('[PurchaseReturnsListPage] Fetching suppliers...');
      const response = await suppliersApi.getAll({ limit: 100 });
      console.log('[PurchaseReturnsListPage] Suppliers response:', response);
      
      if (response.success && response.data) {
        const supplierData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as unknown[]);
        setSuppliers(supplierData as Supplier[]);
      }
    } catch (error) {
      console.error('[PurchaseReturnsListPage] Failed to fetch suppliers:', error);
    }
  }, []);

  const fetchPurchaseReturns = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[PurchaseReturnsListPage] Fetching returns with params:', { statusFilter, supplierFilter, dateFrom, dateTo, page });
      const params: any = {
        page: page,
        limit: 20,
      };
      
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (supplierFilter && supplierFilter !== 'all') params.supplier_id = supplierFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await purchaseReturnsApi.getAll(params);
      console.log('[PurchaseReturnsListPage] Returns response:', response);
      
      if (response.success) {
        const returnData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as unknown[]);
        setReturnList(returnData as PurchaseReturn[]);
        if (response.pagination) {
          setPagination(response.pagination as PaginationInfo);
        }
      }
    } catch (error) {
      console.error('[PurchaseReturnsListPage] Failed to fetch purchase returns:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, supplierFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchPurchaseReturns();
  }, [fetchPurchaseReturns]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('purchaseReturn.status.draft', 'Draft') },
      confirmed: { variant: 'default', label: t('purchaseReturn.status.confirmed', 'Confirmed') },
      cancelled: { variant: 'destructive', label: t('purchaseReturn.status.cancelled', 'Cancelled') },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-gray-100">{t('purchaseReturn.title', 'Purchase Returns')}</h1>
            <p className="text-muted-foreground dark:text-gray-400">{t('purchaseReturn.description', 'Manage your purchase returns')}</p>
          </div>
          <Button onClick={() => navigate('/purchase-returns/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('purchaseReturn.newReturn', 'New Return')}
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 mb-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-gray-200">{t('purchaseReturn.status', 'Status')}</label>
              <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectValue placeholder={t('purchaseReturn.allStatuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="all" className="dark:text-gray-200">{t('purchaseReturn.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="draft" className="dark:text-gray-200">{t('purchaseReturn.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="confirmed" className="dark:text-gray-200">{t('purchaseReturn.status.confirmed', 'Confirmed')}</SelectItem>
                  <SelectItem value="cancelled" className="dark:text-gray-200">{t('purchaseReturn.status.cancelled', 'Cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-gray-200">{t('purchaseReturn.supplier', 'Supplier')}</label>
              <Select value={supplierFilter || 'all'} onValueChange={(value) => setSupplierFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectValue placeholder={t('purchaseReturn.allSuppliers', 'All Suppliers')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="all" className="dark:text-gray-200">{t('purchaseReturn.allSuppliers', 'All Suppliers')}</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier._id} value={supplier._id} className="dark:text-gray-200">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-gray-200">{t('purchaseReturn.dateFrom', 'Date From')}</label>
              <Input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block dark:text-gray-200">{t('purchaseReturn.dateTo', 'Date To')}</label>
              <Input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border dark:border-slate-700 dark:bg-slate-800">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader className="dark:bg-slate-800">
                <TableRow className="dark:hover:bg-slate-700/50">
                  <TableHead className="dark:text-gray-300">{t('purchaseReturn.reference', 'Reference')}</TableHead>
                  <TableHead className="dark:text-gray-300">{t('purchaseReturn.grnReference', 'GRN Reference')}</TableHead>
                  <TableHead className="dark:text-gray-300">{t('purchaseReturn.supplier', 'Supplier')}</TableHead>
                  <TableHead className="dark:text-gray-300">{t('purchaseReturn.returnDate', 'Return Date')}</TableHead>
                  <TableHead className="dark:text-gray-300">{t('purchaseReturn.status', 'Status')}</TableHead>
                  <TableHead className="dark:text-gray-300">{t('purchaseReturn.totalAmount', 'Total Amount')}</TableHead>
                  <TableHead className="text-right dark:text-gray-300">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="dark:bg-slate-800">
                {returnList.length === 0 ? (
                  <TableRow className="dark:hover:bg-slate-700/50">
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground dark:text-gray-400">
                      {t('purchaseReturn.noReturns', 'No purchase returns found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  returnList.map((pr) => (
                    <TableRow key={pr._id} className="dark:hover:bg-slate-700/50">
                      <TableCell className="font-medium dark:text-gray-200">
                        <FileText className="inline-block mr-2 h-4 w-4" />
                        {pr.referenceNo || 'N/A'}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{pr.grn?.referenceNo || '-'}</TableCell>
                      <TableCell className="dark:text-gray-300">{pr.supplier?.name || '-'}</TableCell>
                      <TableCell className="dark:text-gray-300">{formatDate(pr.returnDate)}</TableCell>
                      <TableCell>{getStatusBadge(pr.status)}</TableCell>
                      <TableCell className="font-medium dark:text-gray-200">
                        {formatCurrency(pr.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/purchase-returns/${pr._id}`)}
                          className="dark:hover:bg-slate-700"
                        >
                          <Eye className="h-4 w-4 dark:text-gray-300" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2">
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={pagination.currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === i + 1 ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => setPage(page + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
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