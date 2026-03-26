import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { grnApi, suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  Plus, 
  Search, 
  Eye, 
  CheckCircle,
  Loader2,
  FileText,
  Calendar,
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/app/components/ui/pagination';
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface GRN {
  _id: string;
  referenceNo: string;
  purchaseOrder?: {
    _id: string;
    referenceNo: string;
  };
  supplier?: {
    _id: string;
    name: string;
    code?: string;
  };
  receivedDate: string;
  status: 'draft' | 'confirmed';
  totalAmount: number;
  paymentStatus: 'pending' | 'partially_paid' | 'paid';
  supplierInvoiceNo?: string;
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

export default function GRNListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we came from a PO detail page with a purchaseOrderId
  const state = location.state as { purchaseOrderId?: string; purchaseOrderRef?: string } | null;
  const initialPO = state?.purchaseOrderId;
  
  const [loading, setLoading] = useState(true);
  const [grnList, setGrnList] = useState<GRN[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchSuppliers = useCallback(async () => {
    try {
      console.log('[GRNListPage] Fetching suppliers...');
      const response = await suppliersApi.getAll({ limit: 100 });
      console.log('[GRNListPage] Suppliers response:', response);
      
      if (response.success && response.data) {
        const supplierData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as unknown[]);
        setSuppliers(supplierData as Supplier[]);
      }
    } catch (error) {
      console.error('[GRNListPage] Failed to fetch suppliers:', error);
    }
  }, []);

  const fetchGRNs = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[GRNListPage] Fetching GRNs with params:', { statusFilter, supplierFilter, dateFrom, dateTo, page });
      const params: any = {
        page: page,
        limit: 20,
      };
      
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (supplierFilter && supplierFilter !== 'all') params.supplier_id = supplierFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const response = await grnApi.getAll(params);
      console.log('[GRNListPage] GRNs response:', response);
      
      if (response.success) {
        const grnData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as unknown[]);
        setGrnList(grnData as GRN[]);
        if (response.pagination) {
          setPagination(response.pagination as PaginationInfo);
        }
      }
    } catch (error) {
      console.error('[GRNListPage] Failed to fetch GRNs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, supplierFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchGRNs();
  }, [fetchGRNs]);

  const handleConfirm = async (id: string) => {
    try {
      await grnApi.confirm(id);
      fetchGRNs();
    } catch (error) {
      console.error('Failed to confirm GRN:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('grn.status.draft', 'Draft') },
      confirmed: { variant: 'default', label: t('grn.status.confirmed', 'Confirmed') },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      pending: { variant: 'outline', label: t('grn.payment.pending', 'Pending') },
      partially_paid: { variant: 'outline', label: t('grn.payment.partially_paid', 'Partial') },
      paid: { variant: 'default', label: t('grn.payment.paid', 'Paid') },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number | string, currency: string = 'USD') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  // If we have an initial PO, redirect to create page
  useEffect(() => {
    if (initialPO) {
      navigate('/grn/new', { state: { purchaseOrderId: initialPO, purchaseOrderRef: state?.purchaseOrderRef }, replace: true });
    }
  }, [initialPO, navigate, state]);

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('grn.title', 'Goods Received Notes')}</h1>
            <p className="text-muted-foreground">{t('grn.description', 'Manage your GRNs')}</p>
          </div>
          <Button onClick={() => navigate('/grn/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('grn.newGRN', 'New GRN')}
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('grn.status', 'Status')}</label>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('grn.allStatuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('grn.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="draft">{t('grn.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="confirmed">{t('grn.status.confirmed', 'Confirmed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('grn.supplier', 'Supplier')}</label>
              <Select value={supplierFilter} onValueChange={(val) => setSupplierFilter(val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('grn.allSuppliers', 'All Suppliers')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('grn.allSuppliers', 'All Suppliers')}</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('grn.dateFrom', 'Date From')}</label>
              <Input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('grn.dateTo', 'Date To')}</label>
              <Input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('grn.reference', 'Reference')}</TableHead>
                  <TableHead>{t('grn.poReference', 'PO Reference')}</TableHead>
                  <TableHead>{t('grn.supplier', 'Supplier')}</TableHead>
                  <TableHead>{t('grn.receivedDate', 'Received Date')}</TableHead>
                  <TableHead>{t('grn.status', 'Status')}</TableHead>
                  <TableHead>{t('grn.totalAmount', 'Total Amount')}</TableHead>
                  <TableHead>{t('grn.paymentStatus', 'Payment Status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grnList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('grn.noGRNs', 'No GRNs found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  grnList.map((grn) => (
                    <TableRow key={grn._id}>
                      <TableCell className="font-medium">
                        <FileText className="inline-block mr-2 h-4 w-4" />
                        {grn.referenceNo || 'N/A'}
                      </TableCell>
                      <TableCell>{grn.purchaseOrder?.referenceNo || '-'}</TableCell>
                      <TableCell>{grn.supplier?.name || '-'}</TableCell>
                      <TableCell>{formatDate(grn.receivedDate)}</TableCell>
                      <TableCell>{getStatusBadge(grn.status)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(grn.totalAmount)}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(grn.paymentStatus)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/grn/${grn._id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {grn.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleConfirm(grn._id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          )}
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
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <a 
                    className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                    onClick={() => setPage(Math.max(1, page - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </a>
                </PaginationItem>
                {Array.from({ length: pagination.totalPages }, (_, i) => (
                  <PaginationItem key={i + 1}>
                    <PaginationLink 
                      onClick={() => setStatusFilter('')}
                      isActive={pagination.currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <a 
                    className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : ''}`}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </Layout>
  );
}