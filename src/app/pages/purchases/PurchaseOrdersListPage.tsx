import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { purchaseOrdersApi, suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  CheckCircle, 
  XCircle,
  Loader2,
  FileText,
  Download,
  Calendar
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

interface PurchaseOrder {
  _id: string;
  referenceNo: string;
  supplier: {
    _id: string;
    name: string;
    code?: string;
  };
  warehouse?: {
    _id: string;
    name: string;
  };
  orderDate: string;
  expectedDeliveryDate?: string;
  status: 'draft' | 'approved' | 'partially_received' | 'fully_received' | 'cancelled';
  currencyCode: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  linesCount: number;
  createdAt: string;
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

export default function PurchaseOrdersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [poList, setPoList] = useState<PurchaseOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const fetchSuppliers = useCallback(async () => {
    try {
      console.log('[PurchaseOrdersListPage] Fetching suppliers...');
      const response = await suppliersApi.getAll({ limit: 100 });
      console.log('[PurchaseOrdersListPage] Suppliers response:', response);
      if (response.success && Array.isArray(response.data)) {
        setSuppliers(response.data as Supplier[]);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[PurchaseOrdersListPage] Fetching with params:', { page, statusFilter, supplierFilter, dateFrom, dateTo });
      const params: any = {
        page: page,
        limit: 20,
      };
      
      if (statusFilter) params.status = statusFilter;
      if (supplierFilter) params.supplier_id = supplierFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (searchQuery) params.search = searchQuery;
      
      const response = await purchaseOrdersApi.getAll(params);
      console.log('[PurchaseOrdersListPage] API Response:', response);
      
      if (response.success) {
        setPoList(response.data as PurchaseOrder[]);
        if (response.pagination) {
          setPagination(response.pagination as PaginationInfo);
        }
      } else {
        console.error('[PurchaseOrdersListPage] API returned error:', response);
      }
    } catch (error) {
      console.error('[PurchaseOrdersListPage] Failed to fetch purchase orders:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, supplierFilter, dateFrom, dateTo, searchQuery]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const handleApprove = async (id: string) => {
    try {
      await purchaseOrdersApi.approve(id);
      fetchPurchaseOrders();
    } catch (error) {
      console.error('Failed to approve PO:', error);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await purchaseOrdersApi.cancel(id);
      fetchPurchaseOrders();
    } catch (error) {
      console.error('Failed to cancel PO:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('purchase.status.draft', 'Draft') },
      approved: { variant: 'default', label: t('purchase.status.approved', 'Approved') },
      partially_received: { variant: 'outline', label: t('purchase.status.partially_received', 'Partial') },
      fully_received: { variant: 'default', label: t('purchase.status.fully_received', 'Received') },
      cancelled: { variant: 'destructive', label: t('purchase.status.cancelled', 'Cancelled') },
    };
    
    const config = statusConfig[status] || { variant: 'secondary', label: status };
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

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('purchase.orders.title', 'Purchase Orders')}</h1>
            <p className="text-muted-foreground">{t('purchase.orders.description', 'Manage your purchase orders')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t('common.import', 'Import')}
            </Button>
            <Button onClick={() => navigate('/purchase-orders/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('purchase.orders.newPO', 'New PO')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('purchase.orders.search', 'Search')}</label>
              <Input 
                placeholder={t('purchase.orders.searchPlaceholder', 'Search by reference...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('purchase.orders.status', 'Status')}</label>
              <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('purchase.orders.allStatuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('purchase.orders.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="draft">{t('purchase.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="approved">{t('purchase.status.approved', 'Approved')}</SelectItem>
                  <SelectItem value="partially_received">{t('purchase.status.partially_received', 'Partially Received')}</SelectItem>
                  <SelectItem value="fully_received">{t('purchase.status.fully_received', 'Fully Received')}</SelectItem>
                  <SelectItem value="cancelled">{t('purchase.status.cancelled', 'Cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('purchase.orders.supplier', 'Supplier')}</label>
              <Select value={supplierFilter || 'all'} onValueChange={(value) => setSupplierFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('purchase.orders.allSuppliers', 'All Suppliers')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('purchase.orders.allSuppliers', 'All Suppliers')}</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('purchase.orders.dateFrom', 'Date From')}</label>
              <Input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('purchase.orders.dateTo', 'Date To')}</label>
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
                  <TableHead>{t('purchase.orders.reference', 'Reference')}</TableHead>
                  <TableHead>{t('purchase.orders.supplier', 'Supplier')}</TableHead>
                  <TableHead>{t('purchase.orders.orderDate', 'Order Date')}</TableHead>
                  <TableHead>{t('purchase.orders.expectedDelivery', 'Expected Delivery')}</TableHead>
                  <TableHead>{t('purchase.orders.status', 'Status')}</TableHead>
                  <TableHead>{t('purchase.orders.totalAmount', 'Total Amount')}</TableHead>
                  <TableHead>{t('purchase.orders.lines', 'Lines')}</TableHead>
                  <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('purchase.orders.noOrders', 'No purchase orders found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  poList.map((po) => (
                    <TableRow key={po._id}>
                      <TableCell className="font-medium">
                        <FileText className="inline-block mr-2 h-4 w-4" />
                        {po.referenceNo || 'N/A'}
                      </TableCell>
                      <TableCell>{po.supplier?.name || '-'}</TableCell>
                      <TableCell>{formatDate(po.orderDate)}</TableCell>
                      <TableCell>{po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '-'}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(po.totalAmount, po.currencyCode)}
                      </TableCell>
                      <TableCell>{po.linesCount || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/purchase-orders/${po._id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {po.status === 'draft' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/purchase-orders/${po._id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleApprove(po._id)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCancel(po._id)}
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </>
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
          <div className="flex justify-center mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      onClick={() => handlePageChange(page)}
                      isActive={page === pagination.currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    className={pagination.currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </Layout>
  );
}