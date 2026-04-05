import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { salesOrdersApi, clientsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  Plus, 
  Search, 
  Loader2,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Filter,
  User,
  Package
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
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
import { toast } from 'sonner';

interface SalesOrderLine {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  description: string;
  qty: number;
  qtyReserved: number;
  unitPrice: number;
  lineTotal: number;
}

interface SalesOrder {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  quotation?: {
    _id: string;
    referenceNo: string;
  };
  orderDate: string;
  expectedDate?: string;
  status: 'draft' | 'confirmed' | 'picking' | 'packed' | 'delivered' | 'invoiced' | 'closed' | 'cancelled';
  lines: SalesOrderLine[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  currencyCode: string;
  isBackorder: boolean;
  fulfillmentStatus?: string;
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'picking', label: 'Picking' },
  { value: 'packed', label: 'Packed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  picking: 'bg-yellow-100 text-yellow-800',
  packed: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  invoiced: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function SalesOrdersListPage() {
  console.log('[SalesOrdersListPage] Component starting render');
  const navigate = useNavigate();
  console.log('[SalesOrdersListPage] useNavigate called');
  const [loading, setLoading] = useState(true);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const fetchSalesOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (clientFilter && clientFilter !== 'all') params.clientId = clientFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;

      const response = await salesOrdersApi.getAll(params);
      if (response.success) {
        setSalesOrders(response.data as SalesOrder[]);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: (response.pagination as any).total || 0,
            pages: (response.pagination as any).pages || 1,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      toast.error('Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, clientFilter, dateFrom, dateTo]);

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsApi.getAll({ limit: 1000 });
      if (response.success) {
        setClients(response.data as Client[]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchSalesOrders();
  }, [fetchSalesOrders]);

  const handleConfirm = async (id: string) => {
    try {
      const response = await salesOrdersApi.confirm(id);
      if (response.success) {
        toast.success('Sales order confirmed successfully');
        fetchSalesOrders();
      }
    } catch (error) {
      console.error('Error confirming sales order:', error);
      toast.error('Failed to confirm sales order');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this sales order?')) return;
    
    try {
      const response = await salesOrdersApi.cancel(id, 'Cancelled by user');
      if (response.success) {
        toast.success('Sales order cancelled successfully');
        fetchSalesOrders();
      }
    } catch (error) {
      console.error('Error cancelling sales order:', error);
      toast.error('Failed to cancel sales order');
    }
  };

  const formatCurrency = (amount: any, currency: string) => {
    let value = 0;
    if (typeof amount === 'number') value = amount;
    else if (amount && typeof amount === 'object' && '$numberDecimal' in amount) value = parseFloat(amount.$numberDecimal);
    else value = parseFloat(String(amount)) || 0;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  console.log('[SalesOrdersListPage] About to render Layout');
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold">Sales Orders Debug</h1>
        <p>If you see this, the page is rendering correctly.</p>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Orders</h1>
            <p className="text-gray-500 mt-1">Manage sales orders and fulfillment workflow</p>
          </div>
          <Button onClick={() => navigate('/sales-orders/create')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Sales Order
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by reference or client..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-[180px]">
                    <User className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="From"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[140px]"
                  />
                  <Input
                    type="date"
                    placeholder="To"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    </TableCell>
                  </TableRow>
                ) : salesOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No sales orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  salesOrders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{order.referenceNo}</span>
                          {order.isBackorder && (
                            <Badge variant="destructive" className="text-xs">Backorder</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{order.client?.name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell>{formatDate(order.expectedDate || '')}</TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[order.status]} capitalize`}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.grandTotal ?? (order as any).totalAmount, order.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/sales-orders/${order._id}`)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {order.status === 'draft' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate(`/sales-orders/${order._id}/edit`)}
                                title="Edit"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleConfirm(order._id)}
                                title="Confirm"
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleCancel(order._id)}
                                title="Cancel"
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {order.status === 'confirmed' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => navigate(`/pick-packs/create?salesOrderId=${order._id}`)}
                              title="Create Pick & Pack"
                              className="text-blue-600"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {!loading && salesOrders.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {salesOrders.length} of {pagination.total} sales orders
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
