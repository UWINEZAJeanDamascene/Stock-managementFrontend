import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { invoicesApi, clientsApi, productsApi, quotationsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { FileText, Plus, Search, Eye, Download, X, Loader2, DollarSign, Clock, CheckCircle, CreditCard, Trash2, Check, AlertCircle, Trash } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface InvoiceItem {
  product: { _id: string; name: string; sku: string };
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxCode: 'A' | 'B' | 'None';
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalWithTax: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  client: { _id: string; name: string; taxId?: string; contact?: { address?: string } };
  customerTin?: string;
  customerName?: string;
  customerAddress?: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  totalAEx: number;
  totalB18: number;
  totalTaxA: number;
  totalTaxB: number;
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  roundedAmount: number;
  amountPaid: number;
  balance: number;
  status: 'draft' | 'confirmed' | 'partial' | 'paid' | 'cancelled';
  currency: string;
  paymentTerms: string;
  quotation?: { _id: string; quotationNumber: string };
  terms?: string;
  notes?: string;
  stockDeducted: boolean;
  receiptMetadata?: {
    sdcId?: string;
    receiptNumber?: string;
    receiptSignature?: string;
    mrcCode?: string;
  };
}

interface Client {
  _id: string;
  name: string;
  code?: string;
  taxId?: string;
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
  };
  paymentTerms?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  averageCost: number;
  sellingPrice: number;
}

interface Quotation {
  _id: string;
  quotationNumber: string;
  client: string;
  status: string;
  grandTotal: number;
}

interface FormItem {
  id: string;
  product: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxCode: 'A' | 'B' | 'None';
  taxRate: number;
}

const CURRENCIES = [
  { value: 'FRW', label: 'FRW - Rwandan Franc' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'LBP', label: 'LBP - Lebanese Pound' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'AED', label: 'AED - UAE Dirham' },
];

const PAYMENT_TERMS = [
  { value: 'cash', label: 'Cash on Delivery' },
  { value: 'credit_7', label: 'Credit 7 Days' },
  { value: 'credit_15', label: 'Credit 15 Days' },
  { value: 'credit_30', label: 'Credit 30 Days' },
  { value: 'credit_45', label: 'Credit 45 Days' },
  { value: 'credit_60', label: 'Credit 60 Days' },
];

const TAX_CODES = [
  { value: 'A', label: 'A (0%)', rate: 0 },
  { value: 'B', label: 'B (18%)', rate: 18 },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

export default function InvoicesPage() {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formClient, setFormClient] = useState('');
  const [formQuotation, setFormQuotation] = useState('');
  const [formCurrency, setFormCurrency] = useState('FRW');
  const [formPaymentTerms, setFormPaymentTerms] = useState('cash');
  const [formItems, setFormItems] = useState<FormItem[]>([{ id: '1', product: '', itemCode: '', quantity: 1, unitPrice: 0, discount: 0, taxCode: 'A', taxRate: 0 }]);
  const [formInvoiceDate, setFormInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formTerms, setFormTerms] = useState('Payment due within 30 days');
  const [formNotes, setFormNotes] = useState('');

  // Client search
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientData, setSelectedClientData] = useState<Client | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, clientsRes, productsRes, quotationsRes] = await Promise.all([
        invoicesApi.getAll({ page: 1, limit: 50 }),
        clientsApi.getAll({ page: 1, limit: 100 }),
        productsApi.getAll({ page: 1, limit: 100 }),
        quotationsApi.getAll({ page: 1, limit: 50, status: 'approved' })
      ]);
      
      if (invoicesRes.success) {
        const data = invoicesRes as { data: Invoice[] };
        setInvoices(data.data || []);
      }
      if (clientsRes.success) {
        setClients((clientsRes as { data: Client[] }).data || []);
      }
      if (productsRes.success) {
        setProducts((productsRes as { data: Product[] }).data || []);
      }
      if (quotationsRes.success) {
        setQuotations((quotationsRes as { data: Quotation[] }).data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.code?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.taxId?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredQuotations = quotations.filter(q => 
    !formClient || (q.client === formClient)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'confirmed': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'partial': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'overdue': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'cancelled': return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
      case 'draft': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const viewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const openCancelModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const openDeleteModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteModal(true);
  };

  const openReceiptModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowReceiptModal(true);
  };

  const openCreateModal = () => {
    setFormClient('');
    setFormQuotation('');
    setFormCurrency('FRW');
    setFormPaymentTerms('cash');
    setFormItems([{ id: '1', product: '', itemCode: '', quantity: 1, unitPrice: 0, discount: 0, taxCode: 'A', taxRate: 0 }]);
    setFormInvoiceDate(new Date().toISOString().split('T')[0]);
    setFormDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setFormTerms('Payment due within 30 days');
    setFormNotes('');
    setSelectedClientData(null);
    setClientSearch('');
    setShowModal(true);
  };

  const selectClient = (client: Client) => {
    setFormClient(client._id);
    setSelectedClientData(client);
    setClientSearch(client.name);
    setShowClientDropdown(false);
    
    // Set payment terms from client if available
    if (client.paymentTerms) {
      setFormPaymentTerms(client.paymentTerms);
    }
  };

  const addItem = () => {
    setFormItems([...formItems, { id: Date.now().toString(), product: '', itemCode: '', quantity: 1, unitPrice: 0, discount: 0, taxCode: 'A', taxRate: 0 }]);
  };

  const removeItem = (id: string) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof FormItem, value: string | number) => {
    setFormItems(formItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-fetch price and stock info when product is selected
        if (field === 'product' && value) {
          const product = products.find(p => p._id === value);
          if (product) {
            updated.unitPrice = product.sellingPrice || product.averageCost || 0;
            updated.itemCode = product.sku;
          }
        }
        
        // Update tax rate when tax code changes
        if (field === 'taxCode') {
          const tax = TAX_CODES.find(t => t.value === value);
          if (tax) {
            updated.taxRate = tax.rate;
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  const calculateItemTotal = (item: FormItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const discount = item.discount;
    const netAmount = subtotal - discount;
    const tax = netAmount * (item.taxRate / 100);
    return netAmount + tax;
  };

  const calculateTotals = () => {
    let totalAEx = 0;
    let totalB18 = 0;
    let totalTaxA = 0;
    let totalTaxB = 0;
    let subtotal = 0;
    let totalDiscount = 0;

    formItems.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discount;
      const netAmount = itemSubtotal - itemDiscount;
      
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;

      if (item.taxCode === 'A') {
        totalAEx += netAmount;
        totalTaxA += netAmount * (item.taxRate / 100);
      } else if (item.taxCode === 'B') {
        totalB18 += netAmount;
        totalTaxB += netAmount * (item.taxRate / 100);
      }
    });

    const totalTax = totalTaxA + totalTaxB;
    const grandTotal = subtotal - totalDiscount + totalTax;
    const roundedAmount = Math.round(grandTotal * 100) / 100;

    return { totalAEx, totalB18, totalTaxA, totalTaxB, subtotal, totalDiscount, totalTax, grandTotal, roundedAmount };
  };

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPaymentLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const paymentData = {
      amount: Number(formData.get('amount')),
      paymentMethod: formData.get('paymentMethod') as 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'mobile_money',
      reference: formData.get('reference') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    };
    
    try {
      if (selectedInvoice) {
        await invoicesApi.recordPayment(selectedInvoice._id, paymentData);
        setShowPaymentModal(false);
        setSelectedInvoice(null);
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      setError(err.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleConfirmInvoice = async () => {
    if (!selectedInvoice) return;
    
    setConfirmLoading(true);
    try {
      await invoicesApi.confirm(selectedInvoice._id);
      setShowViewModal(false);
      setSelectedInvoice(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to confirm invoice:', err);
      setError(err.message || 'Failed to confirm invoice');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleCancelInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    
    setPaymentLoading(true);
    try {
      await invoicesApi.cancel(selectedInvoice._id, cancelReason);
      setShowCancelModal(false);
      setSelectedInvoice(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to cancel invoice:', err);
      setError(err.message || 'Failed to cancel invoice');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    
    setDeleteLoading(true);
    try {
      await invoicesApi.delete(selectedInvoice._id);
      setShowDeleteModal(false);
      setSelectedInvoice(null);
      setShowViewModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      setError(err.message || 'Failed to delete invoice');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveReceiptMetadata = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    
    const formData = new FormData(e.currentTarget);
    const metadata = {
      sdcId: formData.get('sdcId') as string || undefined,
      receiptNumber: formData.get('receiptNumber') as string || undefined,
      receiptSignature: formData.get('receiptSignature') as string || undefined,
      mrcCode: formData.get('mrcCode') as string || undefined,
      internalData: formData.get('internalData') as string || undefined,
    };
    
    setPaymentLoading(true);
    try {
      await invoicesApi.saveReceiptMetadata(selectedInvoice._id, metadata);
      setShowReceiptModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to save receipt metadata:', err);
      setError(err.message || 'Failed to save receipt metadata');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      setPdfLoading(id);
      const blob = await invoicesApi.getPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setError('Failed to download PDF');
    } finally {
      setPdfLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClient) {
      setError('Please select a client');
      return;
    }
    if (formItems.some(item => !item.product)) {
      setError('Please select all products');
      return;
    }

    // Check stock availability
    for (const item of formItems) {
      const product = products.find(p => p._id === item.product);
      if (product && product.currentStock < item.quantity) {
        setError(`Insufficient stock for ${product.name}. Available: ${product.currentStock}, Required: ${item.quantity}`);
        return;
      }
    }

    setSubmitting(true);
    
    const items = formItems.map(item => {
      const product = products.find(p => p._id === item.product);
      const subtotal = item.quantity * item.unitPrice;
      const discount = item.discount;
      const netAmount = subtotal - discount;
      const taxRate = item.taxRate;
      const taxAmount = netAmount * (taxRate / 100);
      const totalWithTax = netAmount + taxAmount;
      
      return {
        product: item.product,
        itemCode: item.itemCode || product?.sku || '',
        description: `${product?.name || ''} - ${item.quantity} ${product?.unit || ''}`,
        quantity: item.quantity,
        unit: product?.unit || 'pcs',
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxCode: item.taxCode,
        taxRate: item.taxRate,
        taxAmount,
        subtotal,
        totalWithTax
      };
    });

    const totals = calculateTotals();

    const invoiceData = {
      client: formClient,
      quotation: formQuotation || undefined,
      currency: formCurrency,
      paymentTerms: formPaymentTerms,
      customerTin: selectedClientData?.taxId,
      customerName: selectedClientData?.name,
      customerAddress: selectedClientData?.contact?.address,
      items,
      invoiceDate: formInvoiceDate,
      dueDate: formDueDate,
      terms: formTerms,
      notes: formNotes,
      ...totals
    };

    try {
      await invoicesApi.create(invoiceData);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to save:', err);
      setError(err.message || 'Failed to save invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotals();
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.grandTotal ?? 0), 0);
  const pendingAmount = invoices.filter(i => i.status === 'confirmed' || i.status === 'partial').reduce((sum, i) => sum + ((i.grandTotal ?? 0) - (i.amountPaid ?? 0)), 0);
  const draftAmount = invoices.filter(i => i.status === 'draft').reduce((sum, i) => sum + (i.grandTotal ?? 0), 0);

const canEditInvoices = hasPermission('invoices:create') || hasPermission('invoices:update') || hasPermission('invoices:delete');

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Invoices</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Manage invoices and payments</p>
          </div>
          {hasPermission('invoices:create') && (
            <button onClick={openCreateModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium w-full sm:w-auto">
              <Plus className="h-4 w-4" /> Create Invoice
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30"><DollarSign className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Revenue</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30"><Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 dark:text-yellow-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Confirmed</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30"><FileText className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Draft</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(draftAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Invoices</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{invoices.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-4 md:mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 outline-none text-sm" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 md:h-64">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
            <FileText className="h-8 w-8 md:h-12 md:w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No invoices found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Invoice #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Due Date</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Amount</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Paid</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-800 dark:text-white">{invoice.client?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-800 dark:text-white text-right font-medium">{formatCurrency(invoice.roundedAmount)}</td>
                    <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400 text-right">{formatCurrency(invoice.amountPaid)}</td>
                    <td className="px-6 py-4 text-center"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>{invoice.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => viewInvoice(invoice)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="View"><Eye className="h-4 w-4" /></button>
                        {canEditInvoices && (invoice.status === 'confirmed' || invoice.status === 'partial') && (
                          <button onClick={() => openPaymentModal(invoice)} className="p-2 text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Record Payment"><CreditCard className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => handleDownloadPDF(invoice._id)} disabled={pdfLoading === invoice._id} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="Download PDF">{pdfLoading === invoice._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</button>
                        {hasPermission('invoices:delete') && (
                          <button onClick={() => openDeleteModal(invoice)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Invoice Modal */}
        {showViewModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 className="text-lg font-semibold dark:text-white">Invoice Details</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedInvoice.invoiceNumber}</p>
                </div>
                <button onClick={() => { setShowViewModal(false); setSelectedInvoice(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInvoice.status)}`}>{selectedInvoice.status}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Client</p>
                    <p className="font-semibold dark:text-white">{selectedInvoice.client?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Invoice Date</p>
                    <p className="font-semibold dark:text-white">{selectedInvoice.invoiceDate ? new Date(selectedInvoice.invoiceDate).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Due Date</p>
                    <p className="font-semibold dark:text-white">{selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : '-'}</p>
                  </div>
                </div>

                {selectedInvoice.customerTin && (
                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Customer TIN: {selectedInvoice.customerTin}</p>
                    {selectedInvoice.customerAddress && <p className="text-sm text-slate-500 dark:text-slate-400">Address: {selectedInvoice.customerAddress}</p>}
                  </div>
                )}
                
                <h3 className="font-semibold mb-3 dark:text-white">Items</h3>
                <table className="w-full mb-6">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="text-left p-2 text-xs font-semibold dark:text-slate-300">Item Code</th>
                      <th className="text-left p-2 text-xs font-semibold dark:text-slate-300">Item Description</th>
                      <th className="text-right p-2 text-xs font-semibold dark:text-slate-300">Qty</th>
                      <th className="text-center p-2 text-xs font-semibold dark:text-slate-300">Tax</th>
                      <th className="text-right p-2 text-xs font-semibold dark:text-slate-300">Unit Price</th>
                      <th className="text-right p-2 text-xs font-semibold dark:text-slate-300">Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items?.map((item, index) => (
                      <tr key={index} className="border-b border-slate-200 dark:border-slate-700">
                        <td className="p-2 text-sm dark:text-slate-300">{item.itemCode || '-'}</td>
                        <td className="p-2 text-sm dark:text-slate-300">{item.product?.name || item.description}</td>
                        <td className="p-2 text-sm dark:text-slate-300 text-right">{item.quantity} {item.unit}</td>
                        <td className="p-2 text-sm dark:text-slate-300 text-center">{item.taxCode}: {item.taxRate}%</td>
                        <td className="p-2 text-sm dark:text-slate-300 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-2 text-sm dark:text-white text-right font-medium">{formatCurrency(item.totalWithTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Tax Breakdown */}
                <div className="border-t pt-4 mb-4 border-slate-200 dark:border-slate-700">
                  <div className="flex justify-end">
                    <div>
                      <p className="text-sm font-semibold mb-2 dark:text-white">Summary</p>
                      <div className="space-y-1 text-sm dark:text-slate-300">
                        <p className="flex justify-between"><span>Total Rwf:</span> <span>{formatCurrency(selectedInvoice.roundedAmount)}</span></p>
                        <p className="flex justify-between"><span>Total A-EX Rwf:</span> <span>{formatCurrency(selectedInvoice.totalAEx)}</span></p>
                        <p className="flex justify-between"><span>Total B-18% Rwf:</span> <span>{formatCurrency(selectedInvoice.totalB18)}</span></p>
                        <p className="flex justify-between"><span>Total Tax B Rwf:</span> <span>{formatCurrency(selectedInvoice.totalTaxB)}</span></p>
                        <p className="flex justify-between font-bold dark:text-white"><span>Total Tax Rwf:</span> <span>{formatCurrency(selectedInvoice.totalTax)}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SDC/Receipt Info */}
                {selectedInvoice.receiptMetadata && (
                  <div className="border-t pt-4 mb-4 border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-semibold mb-2 dark:text-white">SDC/Receipt Information</p>
                    <div className="grid grid-cols-2 gap-2 text-sm dark:text-slate-300">
                      {selectedInvoice.receiptMetadata.sdcId && <p>SDC ID: {selectedInvoice.receiptMetadata.sdcId}</p>}
                      {selectedInvoice.receiptMetadata.receiptNumber && <p>Receipt #: {selectedInvoice.receiptMetadata.receiptNumber}</p>}
                      {selectedInvoice.receiptMetadata.mrcCode && <p>MRC Code: {selectedInvoice.receiptMetadata.mrcCode}</p>}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  {hasPermission('invoices:update') && selectedInvoice.status === 'draft' && (
                    <button onClick={handleConfirmInvoice} disabled={confirmLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700">
                      {confirmLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Check className="h-4 w-4" /> Confirm & Deduct Stock
                    </button>
                  )}
                  {canEditInvoices && (selectedInvoice.status === 'confirmed' || selectedInvoice.status === 'partial') && (
                    <button onClick={() => openPaymentModal(selectedInvoice)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700">
                      <CreditCard className="h-4 w-4" /> Record Payment
                    </button>
                  )}
                  {hasPermission('invoices:update') && selectedInvoice.status !== 'cancelled' && selectedInvoice.status !== 'paid' && (
                    <button onClick={() => openCancelModal(selectedInvoice)} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700">
                      <X className="h-4 w-4" /> Cancel Invoice
                    </button>
                  )}
                  {hasPermission('invoices:update') && (
                    <button onClick={() => openReceiptModal(selectedInvoice)} className="px-4 py-2 bg-slate-600 text-white rounded-lg flex items-center gap-2 hover:bg-slate-700">
                      <FileText className="h-4 w-4" /> SDC Info
                    </button>
                  )}
                  <button onClick={() => handleDownloadPDF(selectedInvoice._id)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                    <Download className="h-4 w-4" /> Download PDF
                  </button>
                  {hasPermission('invoices:delete') && selectedInvoice.status === 'draft' && (
                    <button onClick={() => openDeleteModal(selectedInvoice)} className="px-4 py-2 bg-red-700 text-white rounded-lg flex items-center gap-2 hover:bg-red-800">
                      <Trash className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
        {showPaymentModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">Record Payment</h2>
                <button onClick={() => { setShowPaymentModal(false); setSelectedInvoice(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Invoice Total: <span className="font-semibold dark:text-white">{formatCurrency(selectedInvoice.roundedAmount)}</span></p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Amount Paid: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(selectedInvoice.amountPaid)}</span></p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Balance Due: <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(selectedInvoice.balance)}</span></p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Amount *</label>
                  <input type="number" name="amount" step="0.01" min="0" max={selectedInvoice.balance} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Payment Method *</label>
                  <select name="paymentMethod" className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Reference</label>
                  <input type="text" name="reference" className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" placeholder="Transaction ID, Cheque #, etc." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes</label>
                  <textarea name="notes" rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedInvoice(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={paymentLoading}>Cancel</button>
                  <button type="submit" disabled={paymentLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700">
                    {paymentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Invoice Modal */}
        {showCancelModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-red-600">Cancel Invoice</h2>
                <button onClick={() => { setShowCancelModal(false); setSelectedInvoice(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCancelInvoice} className="p-6 space-y-4">
                {selectedInvoice.stockDeducted && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Warning: Stock will be reversed if you cancel this invoice</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Reason for cancellation *</label>
                  <textarea 
                    value={cancelReason} 
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3} 
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                    required 
                    placeholder="Please provide a reason..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowCancelModal(false); setSelectedInvoice(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={paymentLoading}>Close</button>
                  <button type="submit" disabled={paymentLoading} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700">
                    {paymentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Cancel Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Invoice Modal */}
        {showDeleteModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-red-600">Delete Invoice</h2>
                <button onClick={() => { setShowDeleteModal(false); setSelectedInvoice(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Warning: This action cannot be undone!</span>
                </div>
                <p className="dark:text-slate-300">Are you sure you want to delete invoice <strong className="dark:text-white">{selectedInvoice.invoiceNumber}</strong>? This will permanently remove the invoice from the system.</p>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowDeleteModal(false); setSelectedInvoice(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={deleteLoading}>Cancel</button>
                  <button onClick={handleDeleteInvoice} disabled={deleteLoading} className="px-4 py-2 bg-red-700 text-white rounded-lg flex items-center gap-2 hover:bg-red-800">
                    {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SDC Receipt Metadata Modal */}
        {showReceiptModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">SDC/Receipt Information</h2>
                <button onClick={() => { setShowReceiptModal(false); setSelectedInvoice(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleSaveReceiptMetadata} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">SDC ID</label>
                  <input type="text" name="sdcId" className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" placeholder="SDC ID from fiscal device" defaultValue={selectedInvoice.receiptMetadata?.sdcId} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Receipt Number</label>
                  <input type="text" name="receiptNumber" className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" placeholder="Fiscal receipt number" defaultValue={selectedInvoice.receiptMetadata?.receiptNumber} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">MRC Code</label>
                  <input type="text" name="mrcCode" className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" placeholder="Machine Readable Code" defaultValue={selectedInvoice.receiptMetadata?.mrcCode} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Receipt Signature</label>
                  <input type="text" name="receiptSignature" className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" placeholder="Digital signature" defaultValue={selectedInvoice.receiptMetadata?.receiptSignature} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Internal Data</label>
                  <textarea name="internalData" rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" placeholder="Additional internal data" defaultValue={selectedInvoice.receiptMetadata?.receiptSignature} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowReceiptModal(false); setSelectedInvoice(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={paymentLoading}>Close</button>
                  <button type="submit" disabled={paymentLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                    {paymentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Metadata
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Invoice Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">Create Invoice</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Close"><X className="h-5 w-5 dark:text-slate-300" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                {/* Invoice Header */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Customer *</label>
                    <input 
                      type="text" 
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                      onFocus={() => setShowClientDropdown(true)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      placeholder="Search by name, code, or TIN..."
                    />
                    {showClientDropdown && filteredClients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredClients.slice(0, 10).map(client => (
                          <button
                            key={client._id}
                            type="button"
                            onClick={() => selectClient(client)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b dark:border-slate-700 last:border-b-0"
                          >
                            <div className="font-medium dark:text-white">{client.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {client.code} {client.taxId && `| TIN: ${client.taxId}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Customer TIN</label>
                    <input type="text" value={selectedClientData?.taxId || ''} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg bg-slate-50 dark:bg-slate-700/50" readOnly placeholder="Auto-filled from client" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Customer Address</label>
                    <input type="text" value={selectedClientData?.contact?.address || ''} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg bg-slate-50 dark:bg-slate-700/50" readOnly placeholder="Auto-filled from client" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Currency</label>
                    <select value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                      {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Payment Terms</label>
                    <select value={formPaymentTerms} onChange={(e) => setFormPaymentTerms(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                      {PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Linked Quotation</label>
                    <select value={formQuotation} onChange={(e) => setFormQuotation(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                      <option value="">None</option>
                      {filteredQuotations.map(q => <option key={q._id} value={q._id}>{q.quotationNumber} - {formatCurrency(q.grandTotal)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Invoice Date</label>
                    <input type="date" value={formInvoiceDate} onChange={(e) => setFormInvoiceDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Due Date</label>
                    <input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Terms & Conditions</label>
                    <input type="text" value={formTerms} onChange={(e) => setFormTerms(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>

                {/* Items Table */}
                <h3 className="font-semibold mb-3 dark:text-white">Items</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="text-left p-2 text-xs font-semibold dark:text-slate-300">Item Code</th>
                        <th className="text-left p-2 text-xs font-semibold dark:text-slate-300">Item Description</th>
                        <th className="text-center p-2 text-xs font-semibold dark:text-slate-300 w-20">Qty</th>
                        <th className="text-center p-2 text-xs font-semibold dark:text-slate-300 w-20">Tax</th>
                        <th className="text-right p-2 text-xs font-semibold dark:text-slate-300 w-24">Unit Price</th>
                        <th className="text-right p-2 text-xs font-semibold dark:text-slate-300 w-24">Total Price</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((item) => {
                        const product = products.find(p => p._id === item.product);
                        const stockWarning = product && product.currentStock < item.quantity;
                        
                        return (
                          <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700">
                            <td className="p-2">
                              <input 
                                type="text" 
                                value={item.itemCode}
                                onChange={(e) => updateItem(item.id, 'itemCode', e.target.value)}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" 
                                placeholder="Item Code"
                              />
                            </td>
                            <td className="p-2">
                              <select value={item.product} onChange={(e) => updateItem(item.id, 'product', e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required>
                                <option value="">Select product</option>
                                {products.map(p => (
                                  <option key={p._id} value={p._id}>
                                    {p.name} ({p.sku}) - Stock: {p.currentStock}
                                  </option>
                                ))}
                              </select>
                              {stockWarning && (
                                <p className="text-xs text-red-500 mt-1">Insufficient stock!</p>
                              )}
                            </td>
                            <td className="p-2">
                              <input 
                                type="number" 
                                min="1" 
                                value={item.quantity} 
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} 
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" 
                                required 
                              />
                            </td>
                            <td className="p-2">
                              <select value={item.taxCode} onChange={(e) => updateItem(item.id, 'taxCode', e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">
                                {TAX_CODES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                            </td>
                            <td className="p-2">
                              <input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                value={item.unitPrice} 
                                onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} 
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" 
                                required 
                              />
                            </td>
                            <td className="p-2 text-right font-medium dark:text-white">
                              FRW {calculateItemTotal(item).toFixed(2)}
                            </td>
                            <td className="p-2">
                              <button type="button" onClick={() => removeItem(item.id)} disabled={formItems.length === 1} className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={addItem} className="mb-6 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">+ Add Item</button>

                {/* Tax & Totals Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold mb-3">Tax Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between font-bold border-b pb-2">
                        <span>Total:</span>
                        <span>FRW {totals.roundedAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total A-EX:</span>
                        <span>FRW {totals.totalAEx.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total B-18%:</span>
                        <span>FRW {totals.totalB18.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Tax B:</span>
                        <span>FRW {totals.totalTaxB.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-2">
                        <span>Total Tax:</span>
                        <span>FRW {totals.totalTax.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal:</span>
                        <span>FRW {totals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Discount:</span>
                        <span>-FRW {totals.totalDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tax:</span>
                        <span>FRW {totals.totalTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg text-indigo-600 border-t pt-2">
                        <span>Rounded Total:</span>
                        <span>FRW {totals.roundedAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full p-2 border rounded-lg text-sm" />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Invoice (Draft)
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
