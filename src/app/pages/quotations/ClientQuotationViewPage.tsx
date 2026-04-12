import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { quotationsApi, clientsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  Loader2,
  FileText,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface QuotationLine {
  _id?: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  productName?: string;
  productSku?: string;
  description: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number;
  lineTotal: number;
}

interface Quotation {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  quotationDate: string;
  expiryDate: string;
  currency: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  lines: QuotationLine[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  rejectionReason?: string;
  rejectionDate?: string;
  acceptedDate?: string;
}

export default function ClientQuotationViewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [clientName, setClientName] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuotation(id);
    }
  }, [id]);

  const fetchQuotation = async (quotationId: string) => {
    setLoading(true);
    try {
      const response = await quotationsApi.getById(quotationId);
      if (response.success && response.data) {
        const data = response.data as Quotation;
        setQuotation(data);
        if (data.client?._id) {
          fetchClientName(data.client._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch quotation:', error);
      toast.error('Failed to load quotation details');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientName = async (clientId: string) => {
    try {
      const response = await clientsApi.getById(clientId);
      if (response.success && response.data) {
        const client = response.data as any;
        setClientName(client.name);
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
    }
  };

  const handleAccept = async () => {
    if (!quotation) return;
    setProcessing(true);
    try {
      const response = await quotationsApi.accept(quotation._id);
      if (response.success) {
        toast.success('Quotation accepted successfully');
        // Update status locally first (optimistic update)
        setQuotation(prev => prev ? { ...prev, status: 'accepted', acceptedDate: new Date().toISOString() } : null);
        // Trigger notification
        await sendNotification('accepted');
      } else {
        toast.error('Failed to accept quotation: ' + (response as any).message || 'Unknown error');
      }
    } catch (error: any) {
      toast.error('Failed to accept quotation: ' + (error.message || 'Network error'));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!quotation || !rejectionReason.trim()) return;
    setProcessing(true);
    try {
      // Use the updated reject API with reason
      const response = await quotationsApi.reject(quotation._id, rejectionReason.trim());
      if (response.success) {
        toast.success('Quotation rejected');
        // Update status and reason locally first (optimistic update)
        setQuotation(prev => prev ? { ...prev, status: 'rejected', rejectionDate: new Date().toISOString(), rejectionReason: rejectionReason.trim() } : null);
        // Trigger notification
        await sendNotification('rejected', rejectionReason.trim());
        setShowRejectDialog(false);
        setRejectionReason('');
      } else {
        toast.error('Failed to reject quotation: ' + (response as any).message || 'Unknown error');
      }
    } catch (error: any) {
      toast.error('Failed to reject quotation: ' + (error.message || 'Network error'));
    } finally {
      setProcessing(false);
    }
  };

  const sendNotification = async (action: 'accepted' | 'rejected', reason?: string) => {
    try {
      // This will call the backend notification endpoint
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://stock-tenancy-system.onrender.com/api'}/notifications/quotation-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          quotationId: quotation?._id,
          quotationRef: quotation?.referenceNo,
          clientName: clientName || quotation?.client?.name,
          action,
          reason,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't show error to client, this is background
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success'; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      sent: { variant: 'default', label: 'Sent' },
      accepted: { variant: 'success', label: 'Accepted' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      expired: { variant: 'outline', label: 'Expired' },
      converted: { variant: 'success', label: 'Converted' },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!quotation) {
    return (
      <Layout>
        <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground dark:text-slate-400 mb-4" />
            <h3 className="text-lg font-medium dark:text-white">Quotation not found</h3>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const canTakeAction = quotation.status === 'sent';

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4 max-w-5xl min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="px-2">
              <ArrowLeft className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Quotation {quotation.referenceNo}</h1>
              <p className="text-sm text-muted-foreground dark:text-slate-400">Review your quotation details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(quotation.status)}
          </div>
        </div>

        {/* Action Buttons - Only show for 'sent' status */}
        {canTakeAction && (
          <Card className="mb-4 sm:mb-6 border-primary/20 bg-primary/5 dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-base sm:text-lg dark:text-white">Action Required</h3>
                  <p className="text-muted-foreground dark:text-slate-400 text-sm">
                    Please review and accept or reject this quotation
                  </p>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={processing}
                    className="flex-1 sm:flex-none"
                  >
                    <XCircle className="mr-1 h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="hidden sm:inline">Reject</span>
                    <span className="sm:hidden">Reject</span>
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleAccept}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  >
                    {processing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                    <span className="hidden sm:inline">Accept Quotation</span>
                    <span className="sm:hidden">Accept</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already Actioned Messages */}
        {quotation.status === 'accepted' && (
          <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="font-medium text-green-900 dark:text-green-400">Quotation Accepted</h3>
                  <p className="text-green-700 dark:text-green-400 text-sm">
                    You accepted this quotation on {formatDate(quotation.acceptedDate || new Date().toISOString())}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {quotation.status === 'rejected' && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900 dark:text-red-400">Quotation Rejected</h3>
                  <p className="text-red-700 dark:text-red-400 text-sm">
                    Rejected on {formatDate(quotation.rejectionDate || new Date().toISOString())}
                  </p>
                  {quotation.rejectionReason && (
                    <div className="mt-2 p-2 bg-white dark:bg-slate-800 rounded border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-800 dark:text-red-400">
                        <span className="font-medium">Reason:</span> {quotation.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Basic Information */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-slate-900 dark:text-white">
                  <FileText className="h-5 w-5" />
                  Quotation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground dark:text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground dark:text-slate-400">Client:</span>
                    <span className="text-sm font-medium dark:text-slate-200">{quotation.client?.name || clientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground dark:text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground dark:text-slate-400">Currency:</span>
                    <span className="text-sm font-medium dark:text-slate-200">{quotation.currency}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground dark:text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground dark:text-slate-400">Quotation Date:</span>
                    <span className="text-sm font-medium dark:text-slate-200">{formatDate(quotation.quotationDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground dark:text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground dark:text-slate-400">Expiry Date:</span>
                    <span className="text-sm font-medium dark:text-slate-200">{formatDate(quotation.expiryDate)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700">
                      <TableHead className="dark:text-white">Product</TableHead>
                      <TableHead className="dark:text-white">Description</TableHead>
                      <TableHead className="text-right dark:text-white">Qty</TableHead>
                      <TableHead className="text-right dark:text-white">Unit Price</TableHead>
                      <TableHead className="text-right dark:text-white">Discount %</TableHead>
                      <TableHead className="text-right dark:text-white">Tax %</TableHead>
                      <TableHead className="text-right dark:text-white">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotation.lines?.map((line, index) => (
                      <TableRow key={line._id || index} className="dark:hover:bg-slate-700/50">
                        <TableCell>
                          <div className="font-medium dark:text-slate-200">{line.productName || line.product?.name}</div>
                          <div className="text-sm text-muted-foreground dark:text-slate-400">{line.productSku || line.product?.sku}</div>
                        </TableCell>
                        <TableCell className="dark:text-slate-300">{line.description || '-'}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{line.qty}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{formatCurrency(line.unitPrice, quotation.currency)}</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{line.discountPercent}%</TableCell>
                        <TableCell className="text-right dark:text-slate-300">{line.taxRate}%</TableCell>
                        <TableCell className="text-right font-medium dark:text-slate-200">{formatCurrency(line.lineTotal, quotation.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Notes */}
            {quotation.notes && (
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground dark:text-slate-400">{quotation.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Summary */}
          <div className="space-y-6">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">Subtotal</span>
                  <span className="font-medium dark:text-slate-200">{formatCurrency(quotation.subtotal, quotation.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">Tax</span>
                  <span className="font-medium dark:text-slate-200">{formatCurrency(quotation.taxAmount, quotation.currency)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold dark:border-slate-600">
                  <span className="text-slate-900 dark:text-white">Total</span>
                  <span className="text-slate-900 dark:text-white">{formatCurrency(quotation.totalAmount, quotation.currency)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Validity Info */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Validity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground dark:text-slate-400">
                  This quotation is valid until <span className="font-medium text-foreground dark:text-slate-200">{formatDate(quotation.expiryDate)}</span>
                </p>
                {new Date(quotation.expiryDate) < new Date() && quotation.status === 'sent' && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                    <p className="text-sm text-yellow-800 dark:text-yellow-400">
                      This quotation has expired. Please contact us for an updated quotation.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Reject Quotation</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Please provide a reason for rejecting this quotation. This will help us understand your needs better.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter your reason for rejection..."
                className="min-h-[100px] bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={processing} className="dark:border-slate-600 dark:text-slate-200">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject} 
                disabled={processing || !rejectionReason.trim()}
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <XCircle className="mr-2 h-4 w-4" />
                Reject Quotation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
