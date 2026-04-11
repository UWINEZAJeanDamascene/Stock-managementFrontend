import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { creditNotesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Edit,
  CheckCircle,
  X,
  Printer,
  FileText,
  Loader2,
  Package,
  Receipt,
  ArrowRightLeft,
  Calendar,
  User,
  AlertTriangle,
  Trash2
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
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Separator } from '@/app/components/ui/separator';
import { toast } from 'sonner';

interface CreditNoteLine {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku?: string;
  };
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
  returnToWarehouse?: {
    _id: string;
    name: string;
    code: string;
  };
  cogsAmount?: number;
}

interface JournalEntry {
  _id: string;
  entryNumber: string;
  date: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
}

interface CreditNote {
  _id: string;
  referenceNo: string;
  creditNoteNumber?: string;
  creditDate: string;
  type: 'goods_return' | 'price_adjustment' | 'cancelled_order';
  status: 'draft' | 'confirmed' | 'cancelled' | 'issued' | 'applied' | 'refunded';
  currencyCode: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  grandTotal?: number;
  reason: string;
  notes?: string;
  lines: CreditNoteLine[];
  stockReversed?: boolean;
  confirmedBy?: {
    _id: string;
    name: string;
  };
  confirmedAt?: string;
  revenueReversalEntry?: JournalEntry;
  cogsReversalEntry?: JournalEntry;
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  invoice?: {
    _id: string;
    referenceNo: string;
    invoiceNumber?: string;
    status: string;
  };
  client?: {
    _id: string;
    name: string;
    code?: string;
    taxId?: string;
  };
}

// Helper to convert Decimal values
const toNumber = (val: any): number => {
  if (typeof val === 'object' && val?.$numberDecimal) {
    return parseFloat(val.$numberDecimal);
  }
  return Number(val) || 0;
};

export default function CreditNoteDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchCreditNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await creditNotesApi.getById(id);
      if (response.success && response.data) {
        setCreditNote(response.data as CreditNote);
      } else {
        toast.error('Failed to load credit note');
      }
    } catch (error) {
      console.error('Failed to fetch credit note:', error);
      toast.error('Failed to load credit note');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCreditNote();
  }, [fetchCreditNote]);

  const handleConfirm = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const response = await creditNotesApi.confirm(id);
      if (response.success) {
        toast.success('Credit note confirmed successfully');
        setConfirmDialogOpen(false);
        fetchCreditNote();
      } else {
        toast.error((response as any).message || 'Failed to confirm credit note');
      }
    } catch (error: any) {
      console.error('Failed to confirm credit note:', error);
      toast.error(error?.message || 'Failed to confirm credit note');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !creditNote) return;
    setProcessing(true);
    try {
      // Delete draft credit notes, or update status for confirmed ones
      if (creditNote.status === 'draft') {
        const response = await creditNotesApi.delete(id);
        if (response.success) {
          toast.success('Credit note deleted');
          navigate('/credit-notes');
        } else {
          toast.error(response.message || 'Failed to delete credit note');
        }
      } else {
        // For confirmed notes, we'd need a cancel endpoint
        toast.info('Cancel functionality requires backend endpoint');
      }
    } catch (error: any) {
      console.error('Failed to cancel credit note:', error);
      toast.error(error?.message || 'Failed to cancel credit note');
    } finally {
      setProcessing(false);
      setCancelDialogOpen(false);
    }
  };

  const formatCurrency = (amount: number | any, currency: string = 'USD') => {
    const num = toNumber(amount);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; className?: string }> = {
      draft: { variant: 'secondary', label: t('creditNotes.statusList.draft', 'Draft'), className: 'dark:bg-slate-700 dark:text-gray-200' },
      confirmed: { variant: 'default', label: t('creditNotes.statusList.confirmed', 'Confirmed'), className: 'dark:bg-blue-900 dark:text-blue-200' },
      issued: { variant: 'default', label: t('creditNotes.statusList.issued', 'Issued'), className: 'dark:bg-green-900 dark:text-green-200' },
      applied: { variant: 'outline', label: t('creditNotes.statusList.applied', 'Applied'), className: 'dark:text-yellow-300 dark:border-yellow-600' },
      refunded: { variant: 'outline', label: t('creditNotes.statusList.refunded', 'Refunded'), className: 'dark:text-purple-300 dark:border-purple-600' },
      cancelled: { variant: 'destructive', label: t('creditNotes.statusList.cancelled', 'Cancelled'), className: 'dark:bg-red-900 dark:text-red-200' },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status, className: 'dark:text-gray-300 dark:border-gray-600' };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string; className?: string }> = {
      goods_return: { variant: 'outline', label: t('creditNotes.typeList.goods_return', 'Goods Return'), className: 'dark:text-gray-300 dark:border-gray-600' },
      price_adjustment: { variant: 'secondary', label: t('creditNotes.typeList.price_adjustment', 'Price Adjustment'), className: 'dark:bg-slate-700 dark:text-gray-200' },
      cancelled_order: { variant: 'outline', label: t('creditNotes.typeList.cancelled_order', 'Cancelled Order'), className: 'dark:text-gray-300 dark:border-gray-600' },
    };
    
    const config = typeConfig[type] || { variant: 'outline', label: type, className: 'dark:text-gray-300 dark:border-gray-600' };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!creditNote) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Credit Note Not Found</h3>
            <Button onClick={() => navigate('/credit-notes')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Credit Notes
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const lineSums = creditNote.lines.reduce((acc, line) => ({
    subtotal: acc.subtotal + toNumber(line.lineSubtotal),
    taxAmount: acc.taxAmount + toNumber(line.lineTax),
    totalAmount: acc.totalAmount + toNumber(line.lineTotal),
  }), { subtotal: 0, taxAmount: 0, totalAmount: 0 });

  // Prefer backend-provided totals when present (creditNote.taxAmount / totalAmount / grandTotal),
  // otherwise fall back to sums computed from lines. This handles cases where the backend stores
  // totals at the root instead of populating per-line tax fields.
  const displaySubtotal = (creditNote.subtotal ?? creditNote.totalAmount ?? creditNote.grandTotal) ? (creditNote.subtotal ?? lineSums.subtotal) : lineSums.subtotal;
  const displayTax = typeof creditNote.taxAmount === 'number' && !isNaN(creditNote.taxAmount) ? creditNote.taxAmount : lineSums.taxAmount;
  const displayTotal = typeof creditNote.totalAmount === 'number' && !isNaN(creditNote.totalAmount) ? creditNote.totalAmount : (typeof creditNote.grandTotal === 'number' && !isNaN(creditNote.grandTotal) ? creditNote.grandTotal : lineSums.totalAmount);

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/credit-notes')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold dark:text-white">
                {creditNote.referenceNo || creditNote.creditNoteNumber}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(creditNote.status)}
                {getTypeBadge(creditNote.type)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              {t('common.print', 'Print')}
            </Button>
            {creditNote.status === 'draft' && (
              <>
                <Button variant="outline" onClick={() => navigate(`/credit-notes/${id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t('common.edit', 'Edit')}
                </Button>
                <Button variant="destructive" onClick={() => setCancelDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common.delete', 'Delete')}
                </Button>
                <Button onClick={() => setConfirmDialogOpen(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('creditNotes.confirm', 'Confirm')}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Credit Note Details */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <FileText className="h-5 w-5" />
                  {t('creditNotes.details', 'Credit Note Details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground dark:text-gray-400">{t('creditNotes.invoice', 'Invoice')}</label>
                    <p className="font-medium dark:text-white">
                      {creditNote.invoice?.referenceNo || '-'}
                      {creditNote.invoice && (
                        <Button 
                          variant="link" 
                          className="h-auto p-0 ml-2"
                          onClick={() => navigate(`/invoices/${creditNote.invoice?._id}`)}
                        >
                          View Invoice
                        </Button>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground dark:text-gray-400">{t('creditNotes.client', 'Client')}</label>
                    <p className="font-medium dark:text-white">{creditNote.client?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground dark:text-gray-400">{t('creditNotes.date', 'Credit Date')}</label>
                    <p className="font-medium dark:text-white">{formatDate(creditNote.creditDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground dark:text-gray-400">{t('creditNotes.created', 'Created')}</label>
                    <p className="font-medium dark:text-white">{formatDate(creditNote.createdAt)}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <label className="text-sm text-muted-foreground dark:text-gray-400">{t('creditNotes.reason', 'Reason')}</label>
                  <p className="font-medium mt-1 dark:text-white">{creditNote.reason}</p>
                </div>
                {creditNote.notes && (
                  <div>
                    <label className="text-sm text-muted-foreground dark:text-gray-400">{t('creditNotes.notes', 'Notes')}</label>
                    <p className="mt-1 dark:text-gray-300">{creditNote.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Package className="h-5 w-5" />
                  {t('creditNotes.lineItems', 'Line Items')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:hover:bg-slate-700">
                      <TableHead className="dark:text-gray-300">{t('creditNotes.product', 'Product')}</TableHead>
                      <TableHead className="text-right dark:text-gray-300">{t('creditNotes.quantity', 'Qty')}</TableHead>
                      <TableHead className="text-right dark:text-gray-300">{t('creditNotes.unitPrice', 'Unit Price')}</TableHead>
                      <TableHead className="text-right dark:text-gray-300">{t('creditNotes.taxRate', 'Tax Rate')}</TableHead>
                      <TableHead className="text-right dark:text-gray-300">{t('creditNotes.lineTax', 'Tax Amount')}</TableHead>
                      <TableHead className="text-right dark:text-gray-300">{t('creditNotes.lineTotal', 'Total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditNote.lines.map((line) => (
                      <TableRow key={line._id} className="dark:hover:bg-slate-700">
                        <TableCell>
                          <div className="font-medium dark:text-white">{line.productName}</div>
                          <div className="text-sm text-muted-foreground">{line.productCode}</div>
                        </TableCell>
                        <TableCell className="text-right dark:text-white">{toNumber(line.quantity)}</TableCell>
                        <TableCell className="text-right dark:text-white">{formatCurrency(line.unitPrice, creditNote.currencyCode)}</TableCell>
                        <TableCell className="text-right dark:text-white">{toNumber(line.taxRate)}%</TableCell>
                        <TableCell className="text-right dark:text-white">{formatCurrency(line.lineTax, creditNote.currencyCode)}</TableCell>
                        <TableCell className="text-right font-medium dark:text-white">{formatCurrency(line.lineTotal, creditNote.currencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Journal Entries */}
            {(creditNote.revenueReversalEntry || creditNote.cogsReversalEntry) && (
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Receipt className="h-5 w-5" />
                    {t('creditNotes.journalEntries', 'Journal Entries')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {creditNote.revenueReversalEntry && (
                    <div className="p-4 bg-muted dark:bg-slate-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium dark:text-white">Revenue Reversal Entry</h4>
                          <p className="text-sm text-muted-foreground">
                            {creditNote.revenueReversalEntry.entryNumber} • {formatDate(creditNote.revenueReversalEntry.date)}
                          </p>
                          <p className="text-sm mt-1 dark:text-gray-300">{creditNote.revenueReversalEntry.description}</p>
                        </div>
                        <Badge variant="outline" className="dark:border-slate-500 dark:text-white">{formatCurrency(creditNote.revenueReversalEntry.totalDebit, creditNote.currencyCode)}</Badge>
                      </div>
                    </div>
                  )}
                  {creditNote.cogsReversalEntry && (
                    <div className="p-4 bg-muted dark:bg-slate-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium dark:text-white">COGS Reversal Entry</h4>
                          <p className="text-sm text-muted-foreground">
                            {creditNote.cogsReversalEntry.entryNumber} • {formatDate(creditNote.cogsReversalEntry.date)}
                          </p>
                          <p className="text-sm mt-1 dark:text-gray-300">{creditNote.cogsReversalEntry.description}</p>
                        </div>
                        <Badge variant="outline" className="dark:border-slate-500 dark:text-white">{formatCurrency(creditNote.cogsReversalEntry.totalDebit, creditNote.currencyCode)}</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">{t('creditNotes.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-400">{t('creditNotes.subtotal', 'Subtotal')}</span>
                  <span className="font-medium dark:text-white">{formatCurrency(displaySubtotal, creditNote.currencyCode)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-400">{t('creditNotes.tax', 'Tax')}</span>
                  <span className="font-medium dark:text-white">{formatCurrency(displayTax, creditNote.currencyCode)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-bold dark:text-white">{t('creditNotes.total', 'Total')}</span>
                  <span className="font-bold text-lg dark:text-white">{formatCurrency(displayTotal, creditNote.currencyCode)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Stock Status */}
            {creditNote.type === 'goods_return' && (
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <ArrowRightLeft className="h-5 w-5" />
                    {t('creditNotes.stockStatus', 'Stock Status')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground dark:text-gray-400">Stock Reversed</span>
                    <Badge variant={creditNote.stockReversed ? 'default' : 'secondary'}>
                      {creditNote.stockReversed ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Confirmation Info */}
            {creditNote.confirmedBy && (
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Calendar className="h-5 w-5" />
                    {t('creditNotes.confirmation', 'Confirmation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-400">Confirmed By</span>
                    <span className="font-medium dark:text-white">{creditNote.confirmedBy?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-gray-400">Confirmed At</span>
                    <span className="font-medium dark:text-white">{formatDate(creditNote.confirmedAt || '')}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Created By */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <User className="h-5 w-5" />
                  {t('creditNotes.createdBy', 'Created By')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-gray-400">User</span>
                  <span className="font-medium dark:text-white">{creditNote.createdBy?.name || '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('creditNotes.confirmTitle', 'Confirm Credit Note')}</DialogTitle>
            <DialogDescription>
              {t('creditNotes.confirmDescription', 'This will process the credit note, reverse the journal entries, and return stock to inventory (for goods returns). This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
              <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Total Amount:</span>
                <span className="font-bold">{formatCurrency(displayTotal, creditNote.currencyCode)}</span>
              </div>
              {creditNote.type === 'goods_return' && (
                <div className="flex justify-between text-sm">
                  <span>Stock to Return:</span>
                  <span>{creditNote.lines.reduce((sum, l) => sum + toNumber(l.quantity), 0)} items</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={processing}>
              <X className="mr-2 h-4 w-4" />
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={processing}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('creditNotes.confirm', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel/Delete Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditNote.status === 'draft' 
                ? t('creditNotes.deleteTitle', 'Delete Credit Note')
                : t('creditNotes.cancelTitle', 'Cancel Credit Note')
              }
            </DialogTitle>
            <DialogDescription>
              {creditNote.status === 'draft'
                ? t('creditNotes.deleteDescription', 'Are you sure you want to delete this draft credit note? This action cannot be undone.')
                : t('creditNotes.cancelDescription', 'Are you sure you want to cancel this credit note? This will reverse all associated transactions.')
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={processing}>
              <X className="mr-2 h-4 w-4" />
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={processing}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              {creditNote.status === 'draft' ? t('common.delete', 'Delete') : t('common.cancel', 'Cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
