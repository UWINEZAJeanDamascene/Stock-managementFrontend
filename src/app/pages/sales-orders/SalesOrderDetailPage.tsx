import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { salesOrdersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  FileText,
  Loader2,
  Calendar,
  User,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';

// Helper to convert MongoDB Decimal128 to number
const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

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
  discountPct: number;
  taxRate: number;
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
  fulfillmentStatus?: string;
  lines: SalesOrderLine[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  currencyCode: string;
  isBackorder: boolean;
  terms?: string;
  notes?: string;
  deliveryNotes?: string[];
  invoices?: string[];
  pickPacks?: string[];
  createdAt: string;
  updatedAt: string;
}

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

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [sendEmail, setSendEmail] = useState(false);

  useEffect(() => {
    if (id) {
      fetchSalesOrder();
    }
  }, [id]);

  const fetchSalesOrder = async () => {
    try {
      setLoading(true);
      const response = await salesOrdersApi.getById(id as string);
      if (response.success) {
        setOrder(response.data as SalesOrder);
        try {
          const workflowResponse = await salesOrdersApi.getWorkflow(id!);
          if (workflowResponse.success) {
            setWorkflow(workflowResponse.data);
          }
        } catch (e) {
          console.error('Error fetching workflow:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching sales order:', error);
      toast.error('Failed to fetch sales order details');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirm('Are you sure you want to confirm this sales order?')) return;
    
    try {
      const response = await salesOrdersApi.confirm(id!, sendEmail);
      if (response.success) {
        toast.success('Sales order confirmed successfully');
        fetchSalesOrder();
      }
    } catch (error: any) {
      console.error('Error confirming sales order:', error);
      toast.error(error.message || 'Failed to confirm sales order');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this sales order?')) return;
    
    try {
      const response = await salesOrdersApi.cancel(id!, 'Cancelled by user', sendEmail);
      if (response.success) {
        toast.success('Sales order cancelled successfully');
        fetchSalesOrder();
      }
    } catch (error: any) {
      console.error('Error cancelling sales order:', error);
      toast.error(error.message || 'Failed to cancel sales order');
    }
  };

  const handleCreatePickPack = () => {
    navigate(`/pick-packs/create?salesOrderId=${id}`);
  };

  const formatCurrency = (amount: any, currency: string) => {
    const value = toNumber(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Sales Order Not Found</h2>
            <p className="text-gray-500 mt-2">The sales order you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/sales-orders')} className="mt-4">
              Back to Sales Orders
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/sales-orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{order.referenceNo}</h1>
              <p className="text-gray-500 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created {formatDate(order.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {order.status === 'draft' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/sales-orders/${id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <div className="flex items-center gap-2 border rounded px-3">
                  <input
                    type="checkbox"
                    id="sendEmailSO"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="sendEmailSO" className="text-sm cursor-pointer">
                    Email
                  </Label>
                </div>
                <Button onClick={handleConfirm}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm
                </Button>
                <Button variant="destructive" onClick={handleCancel}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            {order.status === 'confirmed' && (
              <Button onClick={handleCreatePickPack}>
                <Package className="h-4 w-4 mr-2" />
                Create Pick & Pack
              </Button>
            )}
          </div>
        </div>

        <div className="mb-6">
          <Badge className={`${STATUS_COLORS[order.status]} text-lg px-4 py-2 capitalize`}>
            {order.status}
          </Badge>
          {order.isBackorder && (
            <Badge variant="destructive" className="ml-2">
              Backorder
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="lines">
              <TabsList>
                <TabsTrigger value="lines">Line Items</TabsTrigger>
                <TabsTrigger value="workflow">Workflow</TabsTrigger>
              </TabsList>

              <TabsContent value="lines">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Lines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b">
                          <tr>
                            <th className="text-left py-2">Product</th>
                            <th className="text-right py-2">Qty</th>
                            <th className="text-right py-2">Reserved</th>
                            <th className="text-right py-2">Unit Price</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.lines.map((line) => (
                            <tr key={line._id} className="border-b last:border-0">
                              <td className="py-3">
                                <div className="font-medium">{line.description}</div>
                                <div className="text-sm text-gray-500">{line.product?.sku}</div>
                              </td>
                              <td className="text-right py-3">{toNumber(line.qty)}</td>
                              <td className="text-right py-3">{toNumber(line.qtyReserved)}</td>
                              <td className="text-right py-3">
                                {formatCurrency(toNumber(line.unitPrice), order.currencyCode)}
                              </td>
                              <td className="text-right py-3 font-medium">
                                {formatCurrency(toNumber(line.lineTotal), order.currencyCode)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="workflow">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {workflow ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Current Status:</span>
                          <Badge className={`${STATUS_COLORS[workflow.currentStatus]} capitalize`}>
                            {workflow.currentStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Can Edit:</span>
                          <Badge variant={workflow.canEdit ? 'default' : 'secondary'}>
                            {workflow.canEdit ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Can Cancel:</span>
                          <Badge variant={workflow.canCancel ? 'destructive' : 'secondary'}>
                            {workflow.canCancel ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">Workflow information not available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {(order.terms || order.notes) && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.terms && (
                    <div>
                      <h4 className="font-medium mb-1">Terms & Conditions</h4>
                      <p className="text-gray-600">{order.terms}</p>
                    </div>
                  )}
                  {order.notes && (
                    <div>
                      <h4 className="font-medium mb-1">Notes</h4>
                      <p className="text-gray-600">{order.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{order.client?.name}</p>
                    {order.client?.code && (
                      <p className="text-sm text-gray-500">Code: {order.client.code}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order Date:</span>
                  <span>{formatDate(order.orderDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected Date:</span>
                  <span>{order.expectedDate ? formatDate(order.expectedDate) : '-'}</span>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>{formatCurrency(order.subtotal ?? (order as any).subtotal, order.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span>{formatCurrency(order.taxTotal ?? (order as any).taxAmount, order.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(order.grandTotal ?? (order as any).totalAmount, order.currencyCode)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {order.quotation && (
              <Card>
                <CardHeader>
                  <CardTitle>Linked Quotation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{order.quotation.referenceNo}</p>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm"
                        onClick={() => navigate(`/quotations/${order.quotation?._id}`)}
                      >
                        View Quotation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Order Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-gray-400" />
                  <span>{order.lines.length} line items</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Updated {formatDate(order.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
