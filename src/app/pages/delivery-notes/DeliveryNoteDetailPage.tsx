import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { deliveryNotesApi, invoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft,
  Edit,
  Printer,
  Truck,
  Package,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { toast } from "sonner";

// Helper to convert MongoDB Decimal128 to number
const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

interface DeliveryNoteItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  description: string;
  quantity?: number;
  unit: string;
  qtyToDeliver?: number;
  deliveredQty?: number;
  orderedQty?: number;
  qty?: number;
  qtyOrdered?: number;
  [key: string]: any;
}

interface DeliveryNote {
  _id: string;
  referenceNo: string;
  quotation?: {
    _id: string;
    referenceNo: string;
  };
  salesOrder?: {
    _id: string;
    referenceNo: string;
  };
  client: {
    _id: string;
    name: string;
    code?: string;
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
    };
  };
  deliveryDate: string;
  status: 'draft' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  carrier?: string;
  trackingNumber?: string;
  deliveredBy?: string;
  vehicle?: string;
  deliveryAddress?: string;
  notes?: string;
  grandTotal: number;
  currencyCode: string;
  items: DeliveryNoteItem[];
  invoice?: {
    _id: string;
    referenceNo?: string;
    status?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function DeliveryNoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeliveryNote();
  }, [id]);

  const fetchDeliveryNote = async () => {
    try {
      setLoading(true);
      const response = await deliveryNotesApi.getById(id!);
      if (response.success) {
        console.log('Delivery Note Data:', response.data);
        console.log('Items:', (response.data as any).items);
        if ((response.data as any).items?.length > 0) {
          console.log('First item:', (response.data as any).items[0]);
        }
        setDeliveryNote(response.data as DeliveryNote);
      } else {
        toast.error('Failed to load delivery note');
      }
    } catch (error) {
      console.error('Error fetching delivery note:', error);
      toast.error('Failed to load delivery note');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      console.log('Starting confirm workflow for delivery note:', id);
      console.log('Current delivery note invoice:', deliveryNote?.invoice);
      
      // Step 1: Check if delivery note has an invoice linked
      let invoiceId = deliveryNote?.invoice?._id;
      
      // Step 2: If no invoice, create one from the delivery note
      if (!invoiceId) {
        toast.info('Creating invoice from delivery note...');
        console.log('No invoice linked, creating new invoice...');
        
        const createResponse = await deliveryNotesApi.createInvoice(id!, {
          confirmDelivery: true
        });
        console.log('Create invoice response:', createResponse);
        
        if (!createResponse.success) {
          toast.error((createResponse as any).message || 'Failed to create invoice');
          return;
        }
        
        invoiceId = (createResponse.data as any)?._id;
        console.log('Created invoice ID:', invoiceId);
        
        if (!invoiceId) {
          toast.success('Delivery note confirmed successfully');
          fetchDeliveryNote();
          return;
        }
        
        toast.success('Delivery note confirmed successfully');
        fetchDeliveryNote();
        return;
      }

      // Step 3: If invoice exists but not confirmed, create and confirm
      const invoiceStatus = (deliveryNote?.invoice as any)?.status;
      if (invoiceStatus === 'draft') {
        toast.info('Confirming invoice...');
        console.log('Confirming invoice:', invoiceId);
        
        const confirmInvoiceResponse = await invoicesApi.confirm(invoiceId);
        console.log('Confirm invoice response:', confirmInvoiceResponse);
        
        if (!confirmInvoiceResponse.success) {
          toast.error((confirmInvoiceResponse as any).message || 'Failed to confirm invoice');
          return;
        }
        toast.success('Invoice confirmed');
      }

      // Step 4: Confirm the delivery note
      toast.info('Confirming delivery note...');
      console.log('Confirming delivery note:', id);
      
      const response = await deliveryNotesApi.confirm(id!, {});
      console.log('Confirm delivery note response:', response);
      
      if (response.success) {
        toast.success('Delivery note confirmed successfully');
        fetchDeliveryNote();
      } else {
        toast.error((response as any).message || 'Failed to confirm delivery note');
      }
    } catch (error: any) {
      console.error('Error in confirm workflow:', error);
      toast.error(error?.message || 'Failed to complete confirmation workflow');
    }
  };

  const handleDispatch = async () => {
    try {
      const response = await deliveryNotesApi.dispatch(id!, {
        carrier: deliveryNote?.carrier,
        trackingNumber: deliveryNote?.trackingNumber
      });
      if (response.success) {
        toast.success('Delivery note dispatched');
        fetchDeliveryNote();
      } else {
        toast.error(response.message || 'Failed to dispatch');
      }
    } catch (error) {
      toast.error('Failed to dispatch delivery note');
    }
  };

  const handleMarkDelivered = async () => {
    try {
      const response = await deliveryNotesApi.markDelivered(id!);
      if (response.success) {
        toast.success('Marked as delivered');
        fetchDeliveryNote();
      } else {
        toast.error(response.message || 'Failed to mark delivered');
      }
    } catch (error) {
      toast.error('Failed to mark as delivered');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this delivery note?')) return;
    try {
      const response = await deliveryNotesApi.cancel(id!);
      if (response.success) {
        toast.success('Delivery note cancelled');
        fetchDeliveryNote();
      } else {
        toast.error(response.message || 'Failed to cancel');
      }
    } catch (error) {
      toast.error('Failed to cancel delivery note');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; icon: any }> = {
      draft: { className: 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200', icon: Clock },
      confirmed: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: CheckCircle },
      dispatched: { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: Truck },
      delivered: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle },
      cancelled: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle },
    };
    
    const config = statusConfig[status] || { className: 'bg-gray-100 dark:bg-slate-700 dark:text-gray-200', icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(toNumber(amount));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!deliveryNote) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Delivery Note Not Found</h2>
            <Button onClick={() => navigate('/delivery-notes')} className="mt-4">
              Back to Delivery Notes
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
        {/* Header */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="outline" size="icon" onClick={() => navigate('/delivery-notes')} className="h-8 w-8 flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">{deliveryNote.referenceNo}</h1>
              <div className="flex items-center gap-1 sm:gap-2">
                {getStatusBadge(deliveryNote.status)}
                <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">•</span>
                <span className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">{formatDate(deliveryNote.deliveryDate)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={() => window.print()} className="h-8 w-8">
              <Printer className="h-4 w-4" />
            </Button>
            {deliveryNote.status === 'draft' && (
              <Button size="icon" onClick={() => navigate(`/delivery-notes/${id}/edit`)} className="h-8 w-8">
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
          {deliveryNote.status === 'draft' && (
            <Button size="sm" onClick={handleConfirm} className="bg-blue-600 flex-1 sm:flex-none justify-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Confirm</span>
              <span className="sm:hidden">Confirm</span>
            </Button>
          )}
          {deliveryNote.status === 'confirmed' && (
            <Button size="sm" onClick={handleDispatch} className="bg-yellow-600 flex-1 sm:flex-none justify-center">
              <Truck className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Dispatch</span>
              <span className="sm:hidden">Dispatch</span>
            </Button>
          )}
          {deliveryNote.status === 'dispatched' && (
            <Button size="sm" onClick={handleMarkDelivered} className="bg-green-600 flex-1 sm:flex-none justify-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Mark Delivered</span>
              <span className="sm:hidden">Delivered</span>
            </Button>
          )}
          {(deliveryNote.status === 'draft' || deliveryNote.status === 'confirmed') && (
            <Button size="sm" variant="destructive" onClick={handleCancel} className="flex-1 sm:flex-none justify-center">
              <XCircle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Cancel</span>
              <span className="sm:hidden">Cancel</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Package className="h-5 w-5" />
                  Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Product</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Description</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Qty</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                        {deliveryNote.items?.map((item: DeliveryNoteItem, idx: number) => (
                        <tr key={item._id}>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium dark:text-white">{item.product?.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{item.product?.sku}</div>
                              {idx === 0 && <div className="text-xs text-red-400 mt-1">{JSON.stringify(item)}</div>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.description || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium dark:text-white">{
                            (() => {
                              const val = item.quantity ?? item.qtyToDeliver ?? item.deliveredQty ?? item.orderedQty ?? item.qty ?? item.qtyOrdered;
                              console.log('Item:', item.product?.name, 'Raw qty:', val, 'Type:', typeof val, 'toNumber:', toNumber(val ?? 0));
                              return toNumber(val ?? 0);
                            })()
                          }</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.unit || 'pcs'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {deliveryNote.notes && (
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="dark:text-white">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{deliveryNote.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Info */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <User className="h-5 w-5" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-medium text-lg dark:text-white">{deliveryNote.client?.name}</div>
                  {deliveryNote.client?.code && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Code: {deliveryNote.client.code}</div>
                  )}
                </div>
                {deliveryNote.client?.contact && (
                  <>
                    <Separator />
                    {deliveryNote.client.contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Phone className="h-4 w-4" />
                        {deliveryNote.client.contact.phone}
                      </div>
                    )}
                    {deliveryNote.client.contact.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Mail className="h-4 w-4" />
                        {deliveryNote.client.contact.email}
                      </div>
                    )}
                    {deliveryNote.client.contact.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <MapPin className="h-4 w-4" />
                        {deliveryNote.client.contact.address}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Delivery Info */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Truck className="h-5 w-5" />
                  Delivery Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Date:</span>
                  <span className="font-medium dark:text-white">{formatDate(deliveryNote.deliveryDate)}</span>
                </div>
                {deliveryNote.carrier && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Carrier:</span>
                    <span className="font-medium dark:text-white">{deliveryNote.carrier}</span>
                  </div>
                )}
                {deliveryNote.trackingNumber && (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Tracking:</span>
                    <span className="font-medium dark:text-white">{deliveryNote.trackingNumber}</span>
                  </div>
                )}
                {deliveryNote.deliveredBy && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Delivered By:</span>
                    <span className="font-medium dark:text-white">{deliveryNote.deliveredBy}</span>
                  </div>
                )}
                {deliveryNote.vehicle && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Vehicle:</span>
                    <span className="font-medium dark:text-white">{deliveryNote.vehicle}</span>
                  </div>
                )}
                {deliveryNote.deliveryAddress && (
                  <>
                    <Separator />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Delivery Address:</div>
                      <div className="text-sm dark:text-gray-300">{deliveryNote.deliveryAddress}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deliveryNote.quotation && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Quotation:</span>
                    <span className="font-medium dark:text-white">{deliveryNote.quotation.referenceNo}</span>
                  </div>
                )}
                {deliveryNote.salesOrder && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Sales Order:</span>
                    <span className="font-medium dark:text-white">{deliveryNote.salesOrder.referenceNo}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Items:</span>
                  <span className="font-medium dark:text-white">{deliveryNote.items?.length || 0}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="dark:text-white">Total:</span>
                  <span className="dark:text-white">{formatCurrency(deliveryNote.grandTotal, deliveryNote.currencyCode)}</span>
                </div>
                <Separator />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <div>Created: {formatDate(deliveryNote.createdAt)}</div>
                  <div>Updated: {formatDate(deliveryNote.updatedAt)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
