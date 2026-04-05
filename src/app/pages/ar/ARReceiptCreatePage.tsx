import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { arReceiptsApi, clientsApi, bankAccountsApi, invoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Calculator,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/app/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

interface Client {
  _id: string;
  name: string;
  code?: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  referenceNo: string;
  dueDate: string;
  balance: string;
  amountOutstanding: string;
}

interface Allocation {
  invoice: string;
  amount: number;
}

interface BankAccount {
  _id: string;
  accountName: string;
  accountCode: string;
  accountNumber: string;
}

interface ARReceiptFormData {
  client: string;
  receiptDate: string;
  paymentMethod: string;
  bankAccount: string;
  amountReceived: number;
  currencyCode: string;
  reference: string;
  notes: string;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'RWF', 'KES', 'UGX', 'TZS'];

export default function ARReceiptCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  const [formData, setFormData] = useState<ARReceiptFormData>({
    client: '',
    receiptDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    bankAccount: '',
    amountReceived: 0,
    currencyCode: 'USD',
    reference: '',
    notes: '',
  });

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setClients(response.data as Client[]);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  }, []);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success && Array.isArray(response.data)) {
        setBankAccounts(response.data as any[]);
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    }
  }, []);

  const fetchInvoices = useCallback(async (clientId: string) => {
    try {
      // Get outstanding invoices for this client
      const response = await invoicesApi.getAll({
        clientId: clientId,
        status: 'confirmed', // Only confirmed invoices have outstanding balance
        limit: 100
      });
      if (response.success && Array.isArray(response.data)) {
        // Filter to only show invoices with outstanding balance
        const outstandingInvoices = (response.data as Invoice[]).filter(
          (inv) => parseFloat(inv.balance || inv.amountOutstanding || '0') > 0
        );
        setInvoices(outstandingInvoices);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  }, []);

  const fetchReceipt = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await arReceiptsApi.getById(id);
      if (response.success) {
        const receipt = response.data;
        setFormData({
          client: receipt.client?._id || '',
          receiptDate: receipt.receiptDate ? new Date(receipt.receiptDate).toISOString().split('T')[0] : '',
          paymentMethod: receipt.paymentMethod || 'bank_transfer',
          bankAccount: receipt.bankAccount?._id || '',
          amountReceived: parseFloat(receipt.amountReceived) || 0,
          currencyCode: receipt.currencyCode || 'USD',
          reference: receipt.reference || '',
          notes: receipt.notes || '',
        });

        // Set allocations from response
        if (response.allocations && response.allocations.length > 0) {
          setAllocations(
            response.allocations.map((a) => ({
              invoice: a.invoice._id,
              amount: parseFloat(a.amountAllocated),
            }))
          );
        }

        // Fetch invoices for the client
        if (receipt.client?._id) {
          fetchInvoices(receipt.client._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch receipt:', error);
    } finally {
      setLoading(false);
    }
  }, [id, fetchInvoices]);

  useEffect(() => {
    fetchClients();
    fetchBankAccounts();
  }, [fetchClients, fetchBankAccounts]);

  useEffect(() => {
    if (isEdit && id) {
      fetchReceipt();
    }
  }, [isEdit, id, fetchReceipt]);

  // When client changes, fetch their outstanding invoices
  useEffect(() => {
    if (formData.client) {
      fetchInvoices(formData.client);
    } else {
      setInvoices([]);
      setAllocations([]);
    }
  }, [formData.client, fetchInvoices]);

  const handleAllocationChange = (invoiceId: string, amount: number) => {
    const existingIndex = allocations.findIndex((a) => a.invoice === invoiceId);
    if (existingIndex >= 0) {
      const newAllocations = [...allocations];
      if (amount <= 0) {
        newAllocations.splice(existingIndex, 1);
      } else {
        newAllocations[existingIndex].amount = amount;
      }
      setAllocations(newAllocations);
    } else if (amount > 0) {
      setAllocations([...allocations, { invoice: invoiceId, amount }]);
    }
  };

  const calculateAllocatedTotal = () => {
    return allocations.reduce((sum, a) => sum + a.amount, 0);
  };

  const calculateUnallocated = () => {
    return formData.amountReceived - calculateAllocatedTotal();
  };

  const handleSave = async (postImmediately: boolean = false) => {
    if (!formData.client || !formData.amountReceived) {
      alert(t('arReceipt.fillRequired', 'Please fill in required fields'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        bankAccount: formData.bankAccount || undefined,
      };

      let receiptId = id;

      if (isEdit && id) {
        await arReceiptsApi.update(id, payload);
      } else {
        const response = await arReceiptsApi.create(payload);
        if (response.data?._id) {
          receiptId = response.data._id;
        }
      }

      // If there are allocations, apply them
      if (receiptId && allocations.length > 0) {
        for (const allocation of allocations) {
          await arReceiptsApi.allocate(receiptId, {
            invoiceId: allocation.invoice,
            amount: allocation.amount,
          });
        }
      }

      // If postImmediately is true, post the receipt
      if (postImmediately && receiptId) {
        await arReceiptsApi.post(receiptId);
      }

      navigate('/ar-receipts');
    } catch (error) {
      console.error('Failed to save receipt:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currencyCode,
    }).format(amount);
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

  return (
    <TooltipProvider>
      <Layout>
        <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/ar-receipts')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Back')}
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit
              ? t('arReceipt.editTitle', 'Edit Receipt')
              : t('arReceipt.createTitle', 'Create Receipt')}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Receipt Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t('arReceipt.details', 'Receipt Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('arReceipt.client', 'Client')} *</Label>
                    <Select
                      value={formData.client}
                      onValueChange={(value) => setFormData({ ...formData, client: value })}
                      disabled={isEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('arReceipt.selectClient', 'Select client')} />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client._id} value={client._id}>
                            {client.name} ({client.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('arReceipt.receiptDate', 'Receipt Date')}</Label>
                    <Input
                      type="date"
                      value={formData.receiptDate}
                      onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('arReceipt.paymentMethod', 'Payment Method')} *</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('arReceipt.bankAccount', 'Bank Account')}</Label>
                    <Select
                      value={formData.bankAccount}
                      onValueChange={(value) => setFormData({ ...formData, bankAccount: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('arReceipt.selectBank', 'Select bank account')} />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account._id} value={account._id}>
                            {account.name} ({account.accountNumber || account.bankName || account.accountType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('arReceipt.amount', 'Amount Received')} *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amountReceived}
                      onChange={(e) => setFormData({ ...formData, amountReceived: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>{t('arReceipt.currency', 'Currency')}</Label>
                    <Select
                      value={formData.currencyCode}
                      onValueChange={(value) => setFormData({ ...formData, currencyCode: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('arReceipt.reference', 'Reference')}</Label>
                    <Input
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder={t('arReceipt.referencePlaceholder', 'Cheque number, bank ref...')}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('arReceipt.notes', 'Notes')}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('arReceipt.notesPlaceholder', 'Add any notes...')}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Allocation */}
            {formData.client && invoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('arReceipt.invoiceAllocation', 'Invoice Allocation')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('arReceipt.invoice', 'Invoice')}</TableHead>
                        <TableHead>{t('arReceipt.dueDate', 'Due Date')}</TableHead>
                        <TableHead className="text-right">{t('arReceipt.balance', 'Balance')}</TableHead>
                        <TableHead className="text-right">{t('arReceipt.allocate', 'Allocate')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => {
                        const balance = parseFloat(invoice.balance || invoice.amountOutstanding || '0');
                        const allocated = allocations.find((a) => a.invoice === invoice._id)?.amount || 0;
                        return (
                          <TableRow key={invoice._id}>
                            <TableCell>
                              <div className="font-medium">{invoice.invoiceNumber}</div>
                              <div className="text-sm text-muted-foreground">{invoice.referenceNo}</div>
                            </TableCell>
                            <TableCell>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</TableCell>
                            <TableCell className="text-right">{formatCurrency(balance)}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                max={balance}
                                className="w-28 text-right"
                                value={allocated || ''}
                                onChange={(e) => handleAllocationChange(invoice._id, parseFloat(e.target.value) || 0)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {formData.client && invoices.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Calculator className="mx-auto h-8 w-8 mb-2" />
                  <p>{t('arReceipt.noInvoices', 'No outstanding invoices for this client')}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('arReceipt.summary', 'Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>{t('arReceipt.amountReceived', 'Amount Received')}</span>
                  <span className="font-medium">{formatCurrency(formData.amountReceived)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('arReceipt.allocated', 'Allocated')}</span>
                  <span className="font-medium">{formatCurrency(calculateAllocatedTotal())}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span>{t('arReceipt.unallocated', 'Unallocated')}</span>
                  <span className={`font-bold ${calculateUnallocated() !== 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {formatCurrency(calculateUnallocated())}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => handleSave(false)}
                    disabled={saving || !formData.client || !formData.amountReceived}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t('arReceipt.saveAsDraft', 'Save as Draft')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('arReceipt.saveAsDraftTooltip', 'Save receipt as draft to edit later')}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    onClick={() => handleSave(true)}
                    disabled={saving || !formData.client || !formData.amountReceived}
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {t('arReceipt.saveAndPost', 'Save & Post')}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('arReceipt.saveAndPostTooltip', 'Save and post receipt to apply payment')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </Layout>
    </TooltipProvider>
  );
}