import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { purchasesApi, suppliersApi, productsApi, companyApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { FileText, Plus, Search, Eye, Download, X, Loader2, DollarSign, Clock, CheckCircle, CreditCard, Trash2, Package, AlertCircle, Trash, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PurchaseItem {
  product: { _id: string; name: string; sku: string };
  itemCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  discount: number;
  taxCode: 'A' | 'B' | 'None';
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalWithTax: number;
}

interface Purchase {
  _id: string;
  purchaseNumber: string;
  supplier: { _id: string; name: string; taxId?: string; contact?: { address?: string } };
  supplierTin?: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierInvoiceNumber?: string;
  purchaseDate: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  items: PurchaseItem[];
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
  status: 'draft' | 'ordered' | 'received' | 'partial' | 'paid' | 'cancelled';
  currency: string;
  paymentTerms: string;
  terms?: string;
  notes?: string;
  stockAdded: boolean;
}

interface Supplier {
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
}

interface FormItem {
  id: string;
  product: string;
  itemCode: string;
  quantity: number;
  unitCost: number;
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
  { value: 'credit', label: 'Credit/Account' },
];

export default function PurchasesPage() {
  const { hasPermission } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capitalBalance, setCapitalBalance] = useState({ ownerCapital: 0, shareCapital: 0, totalCapital: 0 });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');

  // Form fields
  const [formSupplier, setFormSupplier] = useState('');
  const [formSupplierInvoice, setFormSupplierInvoice] = useState('');
  const [formCurrency, setFormCurrency] = useState('FRW');
  const [formPaymentTerms, setFormPaymentTerms] = useState('cash');
  const [formItems, setFormItems] = useState<FormItem[]>([{ id: '1', product: '', itemCode: '', quantity: 1, unitCost: 0, discount: 0, taxCode: 'A', taxRate: 0 }]);
  const [formPurchaseDate, setFormPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [formExpectedDate, setFormExpectedDate] = useState('');
  const [formTerms, setFormTerms] = useState('Payment due within 30 days');
  const [formNotes, setFormNotes] = useState('');

  // Supplier search
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplierData, setSelectedSupplierData] = useState<Supplier | null>(null);

  useEffect(() => {
    fetchData();
    fetchCapitalBalance();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        purchasesApi.getAll({ page: 1, limit: 50 }),
        suppliersApi.getAll({ page: 1, limit: 100 }),
        productsApi.getAll({ page: 1, limit: 100 })
      ]);
      
      if (purchasesRes.success) {
        const data = purchasesRes as { data: Purchase[] };
        setPurchases(data.data || []);
      }
      if (suppliersRes.success) {
        setSuppliers((suppliersRes as { data: Supplier[] }).data || []);
      }
      if (productsRes.success) {
        setProducts((productsRes as { data: Product[] }).data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCapitalBalance = async () => {
    try {
      const res = await companyApi.getCapitalBalance();
      if (res.success) {
        setCapitalBalance(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch capital balance:', err);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.purchaseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierInvoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s => 
    s.name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.code?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.taxId?.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'received': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'partial': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'ordered': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'cancelled': return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
      case 'draft': return 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const viewPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowViewModal(true);
  };

  const openPaymentModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setSelectedPaymentMethod('cash');
    setShowPaymentModal(true);
  };

  const openCancelModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const openDeleteModal = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowDeleteModal(true);
  };

  const openCreateModal = () => {
    setFormSupplier('');
    setFormSupplierInvoice('');
    setFormCurrency('FRW');
    setFormPaymentTerms('cash');
    setFormItems([{ id: '1', product: '', itemCode: '', quantity: 1, unitCost: 0, discount: 0, taxCode: 'A', taxRate: 0 }]);
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormExpectedDate('');
    setFormTerms('Payment due within 30 days');
    setFormNotes('');
    setSelectedSupplierData(null);
    setSupplierSearch('');
    setShowModal(true);
  };

  const selectSupplier = (supplier: Supplier) => {
    setFormSupplier(supplier._id);
    setSelectedSupplierData(supplier);
    setSupplierSearch(supplier.name);
    setShowSupplierDropdown(false);
    
    if (supplier.paymentTerms) {
      setFormPaymentTerms(supplier.paymentTerms);
    }
  };

  const addItem = () => {
    setFormItems([...formItems, { id: Date.now().toString(), product: '', itemCode: '', quantity: 1, unitCost: 0, discount: 0, taxCode: 'A', taxRate: 0 }]);
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
        
        if (field === 'product' && value) {
          const product = products.find(p => p._id === value);
          if (product) {
            updated.unitCost = product.averageCost || 0;
            updated.itemCode = product.sku;
          }
        }
        
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
    const subtotal = item.quantity * item.unitCost;
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
      const itemSubtotal = item.quantity * item.unitCost;
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

  const handleReceivePurchase = async () => {
    if (!selectedPurchase) return;
    
    setReceiveLoading(true);
    try {
      await purchasesApi.receive(selectedPurchase._id);
      setShowViewModal(false);
      setSelectedPurchase(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to receive purchase:', err);
      setError(err.message || 'Failed to receive purchase');
    } finally {
      setReceiveLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPaymentLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const paymentData = {
      amount: Number(formData.get('amount')),
      paymentMethod: selectedPaymentMethod === 'capital' ? 'bank_transfer' : (formData.get('paymentMethod') as 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'credit'),
      reference: formData.get('reference') as string || undefined,
      notes: formData.get('notes') as string || undefined,
      useCapital: selectedPaymentMethod === 'capital',
      capitalType: selectedPaymentMethod === 'capital' ? (formData.get('capitalType') as 'owner' | 'share') : undefined,
    };
    
    try {
      if (selectedPurchase) {
        await purchasesApi.recordPayment(selectedPurchase._id, paymentData);
        setShowPaymentModal(false);
        setSelectedPurchase(null);
        fetchData();
      }
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      setError(err.message || 'Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    
    setPaymentLoading(true);
    try {
      await purchasesApi.cancel(selectedPurchase._id, cancelReason);
      setShowCancelModal(false);
      setSelectedPurchase(null);
      fetchData();
    } catch (err: any) {
      console.error('Failed to cancel purchase:', err);
      setError(err.message || 'Failed to cancel purchase');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePurchase = async () => {
    if (!selectedPurchase) return;
    
    setDeleteLoading(true);
    try {
      await purchasesApi.delete(selectedPurchase._id);
      setShowDeleteModal(false);
      setSelectedPurchase(null);
      setShowViewModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete purchase:', err);
      setError(err.message || 'Failed to delete purchase');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      setPdfLoading(id);
      const blob = await purchasesApi.getPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchase-${id}.pdf`;
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
    if (!formSupplier) {
      setError('Please select a supplier');
      return;
    }
    if (formItems.some(item => !item.product)) {
      setError('Please select all products');
      return;
    }

    setSubmitting(true);
    
    const items = formItems.map(item => {
      const product = products.find(p => p._id === item.product);
      const subtotal = item.quantity * item.unitCost;
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
        unitCost: item.unitCost,
        discount: item.discount,
        taxCode: item.taxCode,
        taxRate: item.taxRate,
        taxAmount,
        subtotal,
        totalWithTax
      };
    });

    const totals = calculateTotals();

    const purchaseData = {
      supplier: formSupplier,
      supplierInvoiceNumber: formSupplierInvoice || undefined,
      currency: formCurrency,
      paymentTerms: formPaymentTerms,
      supplierTin: selectedSupplierData?.taxId,
      supplierName: selectedSupplierData?.name,
      supplierAddress: selectedSupplierData?.contact?.address,
      items,
      purchaseDate: formPurchaseDate,
      expectedDeliveryDate: formExpectedDate || undefined,
      terms: formTerms,
      notes: formNotes,
      ...totals
    };

    try {
      await purchasesApi.create(purchaseData);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to save:', err);
      setError(err.message || 'Failed to save purchase');
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotals();
  const totalPurchases = purchases.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + (p.roundedAmount ?? 0), 0);
  const totalPaid = purchases.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amountPaid ?? 0), 0);
  const totalDue = purchases.filter(p => p.status !== 'paid' && p.status !== 'cancelled').reduce((sum, p) => sum + (p.balance ?? 0), 0);

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Purchases</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Track purchases from suppliers</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Create Purchase
          </button>
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
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Purchases</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(totalPurchases)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Paid</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Clock className="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Due</p>
                <p className="text-lg md:text-xl font-bold text-amber-600 dark:text-amber-400 truncate">{formatCurrency(totalDue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30"><Package className="h-4 w-4 md:h-5 md:w-5 text-purple-600 dark:text-purple-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total Orders</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{purchases.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-4 md:mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-500/30 outline-none text-sm" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 md:h-64">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-emerald-600" />
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
            <FileText className="h-8 w-8 md:h-12 md:w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No purchases found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">PO #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Supplier</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Supplier Invoice</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Amount</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Paid</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">{purchase.purchaseNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-800 dark:text-white">{purchase.supplier?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{purchase.supplierInvoiceNumber || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-800 dark:text-white text-right font-medium">{formatCurrency(purchase.roundedAmount)}</td>
                    <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400 text-right">{formatCurrency(purchase.amountPaid)}</td>
                    <td className="px-6 py-4 text-center"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(purchase.status)}`}>{purchase.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => viewPurchase(purchase)} className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg" title="View"><Eye className="h-4 w-4" /></button>
                        {(purchase.status === 'received' || purchase.status === 'partial') && (
                          <button onClick={() => openPaymentModal(purchase)} className="p-2 text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Record Payment"><CreditCard className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => handleDownloadPDF(purchase._id)} disabled={pdfLoading === purchase._id} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="Download PDF">{pdfLoading === purchase._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</button>
                        <button onClick={() => openDeleteModal(purchase)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* View Purchase Modal */}
        {showViewModal && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <div>
                  <h2 className="text-lg font-semibold dark:text-white">Purchase Details</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPurchase.purchaseNumber}</p>
                </div>
                <button onClick={() => { setShowViewModal(false); setSelectedPurchase(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPurchase.status)}`}>{selectedPurchase.status}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Supplier</p>
                    <p className="font-semibold dark:text-white">{selectedPurchase.supplier?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Purchase Date</p>
                    <p className="font-semibold dark:text-white">{selectedPurchase.purchaseDate ? new Date(selectedPurchase.purchaseDate).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Supplier Invoice</p>
                    <p className="font-semibold dark:text-white">{selectedPurchase.supplierInvoiceNumber || '-'}</p>
                  </div>
                </div>

                {selectedPurchase.supplierTin && (
                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Supplier TIN: {selectedPurchase.supplierTin}</p>
                    {selectedPurchase.supplierAddress && <p className="text-sm text-slate-500 dark:text-slate-400">Address: {selectedPurchase.supplierAddress}</p>}
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
                    {selectedPurchase.items?.map((item, index) => (
                      <tr key={index} className="border-b border-slate-200 dark:border-slate-700">
                        <td className="p-2 text-sm dark:text-slate-300">{item.itemCode || '-'}</td>
                        <td className="p-2 text-sm dark:text-slate-300">{item.product?.name || item.description}</td>
                        <td className="p-2 text-sm dark:text-slate-300 text-right">{item.quantity} {item.unit}</td>
                        <td className="p-2 text-sm dark:text-slate-300 text-center">{item.taxCode}: {item.taxRate}%</td>
                        <td className="p-2 text-sm dark:text-slate-300 text-right">{formatCurrency(item.unitCost)}</td>
                        <td className="p-2 text-sm dark:text-white text-right font-medium">{formatCurrency(item.totalWithTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="border-t pt-4 border-slate-200 dark:border-slate-700">
                  <div className="flex justify-end">
                    <div>
                      <p className="text-sm font-semibold mb-2 dark:text-white">Summary</p>
                      <div className="space-y-1 text-sm dark:text-slate-300">
                        <p className="flex justify-between"><span>Total Rwf:</span> <span>FRW {selectedPurchase.roundedAmount?.toFixed(2)}</span></p>
                        <p className="flex justify-between"><span>Total A-EX Rwf:</span> <span>FRW {selectedPurchase.totalAEx?.toFixed(2) || '0.00'}</span></p>
                        <p className="flex justify-between"><span>Total B-18% Rwf:</span> <span>FRW {selectedPurchase.totalB18?.toFixed(2) || '0.00'}</span></p>
                        <p className="flex justify-between"><span>Total Tax B Rwf:</span> <span>FRW {selectedPurchase.totalTaxB?.toFixed(2) || '0.00'}</span></p>
                        <p className="flex justify-between font-bold dark:text-white"><span>Total Tax Rwf:</span> <span>FRW {selectedPurchase.totalTax?.toFixed(2)}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  {selectedPurchase.status === 'draft' && (
                    <button onClick={handleReceivePurchase} disabled={receiveLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700">
                      {receiveLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Package className="h-4 w-4" /> Receive & Add Stock
                    </button>
                  )}
                  {(selectedPurchase.status === 'received' || selectedPurchase.status === 'partial') && (
                    <button onClick={() => openPaymentModal(selectedPurchase)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700">
                      <CreditCard className="h-4 w-4" /> Record Payment
                    </button>
                  )}
                  {selectedPurchase.status !== 'cancelled' && selectedPurchase.status !== 'paid' && (
                    <button onClick={() => openCancelModal(selectedPurchase)} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700">
                      <X className="h-4 w-4" /> Cancel Purchase
                    </button>
                  )}
                  <button onClick={() => handleDownloadPDF(selectedPurchase._id)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 hover:bg-emerald-700">
                    <Download className="h-4 w-4" /> Download PDF
                  </button>
                  {selectedPurchase.status === 'draft' && (
                    <button onClick={() => openDeleteModal(selectedPurchase)} className="px-4 py-2 bg-red-700 text-white rounded-lg flex items-center gap-2 hover:bg-red-800">
                      <Trash className="h-4 w-4" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
        {showPaymentModal && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold">Record Payment</h2>
                <button onClick={() => { setShowPaymentModal(false); setSelectedPurchase(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                {/* Capital Balance Reminder */}
                <div className={`rounded-lg p-3 ${capitalBalance.totalCapital > 0 ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' : 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'}`}>
                  <div className="flex items-start gap-2">
                    {capitalBalance.totalCapital > 0 ? (
                      <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    )}
                    <div className="text-sm">
                      {capitalBalance.totalCapital > 0 ? (
                        <>
                          <p className="font-medium text-blue-800 dark:text-blue-300">Capital Available for Payments</p>
                          <p className="text-blue-600 dark:text-blue-400">
                            Owner's Capital: {formatCurrency(capitalBalance.ownerCapital)} | Share Capital: {formatCurrency(capitalBalance.shareCapital)}
                          </p>
                          <p className="text-blue-600 dark:text-blue-400">Total: {formatCurrency(capitalBalance.totalCapital)}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-amber-800 dark:text-amber-300">⚠️ No Capital Recorded!</p>
                          <p className="text-amber-700 dark:text-amber-400">
                            Please record Owner&apos;s Capital or Share Capital first in <strong>Journal Entries &gt; Record Capital</strong> before making payments.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Total: <span className="font-semibold dark:text-white">FRW {selectedPurchase.roundedAmount?.toFixed(2)}</span></p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Amount Paid: <span className="font-semibold text-green-600 dark:text-green-400">FRW {selectedPurchase.amountPaid?.toFixed(2)}</span></p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Balance Due: <span className="font-semibold text-red-600 dark:text-red-400">FRW {selectedPurchase.balance?.toFixed(2)}</span></p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Amount *</label>
                  <input type="number" name="amount" step="0.01" min="0" max={selectedPurchase.balance} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Payment Method *</label>
                  <select name="paymentMethod" className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value)}>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    <option value="capital">💰 Use Capital</option>
                  </select>
                </div>
                {selectedPaymentMethod === 'capital' && (
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Capital Type *</label>
                    <select name="capitalType" className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                      <option value="owner">Owner's Capital (Available: {formatCurrency(capitalBalance.ownerCapital)})</option>
                      <option value="share">Share Capital (Available: {formatCurrency(capitalBalance.shareCapital)})</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Total Capital Available: {formatCurrency(capitalBalance.totalCapital)}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Reference</label>
                  <input type="text" name="reference" className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" placeholder="Transaction ID, Cheque #, etc." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes</label>
                  <textarea name="notes" rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowPaymentModal(false); setSelectedPurchase(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={paymentLoading}>Cancel</button>
                  <button type="submit" disabled={paymentLoading} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700">
                    {paymentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Purchase Modal */}
        {showCancelModal && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-red-600">Cancel Purchase</h2>
                <button onClick={() => { setShowCancelModal(false); setSelectedPurchase(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleCancelPurchase} className="p-6 space-y-4">
                {selectedPurchase.stockAdded && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Warning: Stock will be reversed if you cancel this purchase</span>
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
                  <button type="button" onClick={() => { setShowCancelModal(false); setSelectedPurchase(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={paymentLoading}>Close</button>
                  <button type="submit" disabled={paymentLoading} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700">
                    {paymentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Cancel Purchase
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Purchase Modal */}
        {showDeleteModal && selectedPurchase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-red-600">Delete Purchase</h2>
                <button onClick={() => { setShowDeleteModal(false); setSelectedPurchase(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Warning: This action cannot be undone!</span>
                </div>
                <p className="dark:text-slate-300">Are you sure you want to delete purchase <strong className="dark:text-white">{selectedPurchase.purchaseNumber}</strong>? This will permanently remove the purchase from the system.</p>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowDeleteModal(false); setSelectedPurchase(null); }} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={deleteLoading}>Cancel</button>
                  <button onClick={handleDeletePurchase} disabled={deleteLoading} className="px-4 py-2 bg-red-700 text-white rounded-lg flex items-center gap-2 hover:bg-red-800">
                    {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Delete Purchase
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Purchase Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">Create Purchase</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="h-5 w-5 dark:text-slate-300" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Supplier *</label>
                    <input 
                      type="text" 
                      value={supplierSearch}
                      onChange={(e) => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      placeholder="Search by name, code, or TIN..."
                    />
                    {showSupplierDropdown && filteredSuppliers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredSuppliers.slice(0, 10).map(supplier => (
                          <button
                            key={supplier._id}
                            type="button"
                            onClick={() => selectSupplier(supplier)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 border-b dark:border-slate-700 last:border-b-0"
                          >
                            <div className="font-medium dark:text-white">{supplier.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {supplier.code}{supplier.taxId && ` | TIN: ${supplier.taxId}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Supplier Invoice #</label>
                    <input type="text" value={formSupplierInvoice} onChange={(e) => setFormSupplierInvoice(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" placeholder="Supplier's invoice number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Supplier TIN</label>
                    <input type="text" value={selectedSupplierData?.taxId || ''} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg bg-slate-50 dark:bg-slate-700/50" readOnly placeholder="Auto-filled" />
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
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Purchase Date</label>
                    <input type="date" value={formPurchaseDate} onChange={(e) => setFormPurchaseDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Expected Delivery</label>
                    <input type="date" value={formExpectedDate} onChange={(e) => setFormExpectedDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>

                <h3 className="font-semibold mb-3 dark:text-white">Items</h3>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="text-left p-2 text-xs font-semibold dark:text-slate-300">Product</th>
                        <th className="text-left p-2 text-xs font-semibold dark:text-slate-300">Item Code</th>
                        <th className="text-center p-2 text-xs font-semibold dark:text-slate-300 w-20">Qty</th>
                        <th className="text-right p-2 text-xs font-semibold dark:text-slate-300 w-24">Unit Cost</th>
                        <th className="text-right p-2 text-xs font-semibold dark:text-slate-300 w-20">Disc.</th>
                        <th className="text-center p-2 text-xs font-semibold dark:text-slate-300 w-20">Tax</th>
                        <th className="text-right p-2 text-xs font-semibold dark:text-slate-300 w-24">Total</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((item) => (
                        <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700">
                          <td className="p-2">
                            <select value={item.product} onChange={(e) => updateItem(item.id, 'product', e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required>
                              <option value="">Select product</option>
                              {products.map(p => (
                                <option key={p._id} value={p._id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input 
                              type="text" 
                              value={item.itemCode || ''} 
                              onChange={(e) => updateItem(item.id, 'itemCode', e.target.value)} 
                              className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" 
                              placeholder="Auto-filled"
                              readOnly
                            />
                          </td>
                          <td className="p-2">
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" required />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.01" min="0" value={item.unitCost} onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" required />
                          </td>
                          <td className="p-2">
                            <input type="number" step="0.01" min="0" value={item.discount} onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" />
                          </td>
                          <td className="p-2">
                            <select value={item.taxCode} onChange={(e) => updateItem(item.id, 'taxCode', e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm">
                              {TAX_CODES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
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
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" onClick={addItem} className="mb-6 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium">+ Add Item</button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold mb-3 dark:text-white">Tax Breakdown</h4>
                    <div className="space-y-2 text-sm dark:text-slate-300">
                      <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Total A-Ex (0%):</span><span>FRW {totals.totalAEx.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Total B (18%):</span><span>FRW {totals.totalB18.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Tax A:</span><span>FRW {totals.totalTaxA.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Tax B:</span><span>FRW {totals.totalTaxB.toFixed(2)}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 dark:text-white">Summary</h4>
                    <div className="space-y-2 text-sm dark:text-slate-300">
                      <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Subtotal:</span><span>FRW {totals.subtotal.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Discount:</span><span>-FRW {totals.totalDiscount.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Tax:</span><span>FRW {totals.totalTax.toFixed(2)}</span></div>
                      <div className="flex justify-between font-bold text-base border-t border-slate-200 dark:border-slate-700 pt-2 dark:text-white"><span>Total:</span><span>FRW {totals.grandTotal.toFixed(2)}</span></div>
                      <div className="flex justify-between font-bold text-lg text-emerald-600 dark:text-emerald-400"><span>Rounded:</span><span>FRW {totals.roundedAmount.toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" />
                </div>

                {/* Capital Balance Reminder for Create Purchase */}
                <div className={`rounded-lg p-3 ${capitalBalance.totalCapital > 0 ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' : 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800'}`}>
                  <div className="flex items-start gap-2">
                    {capitalBalance.totalCapital > 0 ? (
                      <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    )}
                    <div className="text-sm">
                      {capitalBalance.totalCapital > 0 ? (
                        <>
                          <p className="font-medium text-blue-800 dark:text-blue-300">Capital Available</p>
                          <p className="text-blue-600 dark:text-blue-400">
                            Owner's Capital: {formatCurrency(capitalBalance.ownerCapital)} | Share Capital: {formatCurrency(capitalBalance.shareCapital)}
                          </p>
                          <p className="text-blue-600 dark:text-blue-400">Total: {formatCurrency(capitalBalance.totalCapital)}</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-amber-800 dark:text-amber-300">⚠️ No Capital Recorded!</p>
                          <p className="text-amber-700 dark:text-amber-400">
                            Please record Owner&apos;s Capital or Share Capital first in <strong>Journal Entries &gt; Record Capital</strong> to enable purchases.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 hover:bg-emerald-700">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Purchase (Draft)
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
