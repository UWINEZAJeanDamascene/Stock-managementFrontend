import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { serialNumberApi, warehouseApi, productsApi, suppliersApi, inventoryBatchApi } from '@/lib/api';
import { Plus, Search, X, Loader2, Hash, Check, AlertTriangle } from 'lucide-react';

interface SerialNumber {
  _id: string;
  serialNumber: string;
  product: { _id: string; name: string; sku: string };
  warehouse?: { _id: string; name: string; code: string };
  status: 'available' | 'sold' | 'in_use' | 'returned' | 'damaged' | 'under_warranty' | 'retired';
  batch?: { _id: string; batchNumber?: string } | string;
  supplier?: { _id: string; name?: string } | string;
  receivedDate?: string; // when this unit was received
  purchaseDate?: string;
  purchasePrice?: number;
  soldDate?: string; // when it was sold
  saleDate?: string;
  salePrice?: number;
  soldTo?: { _id?: string; name?: string } | string; // client who received this exact unit
  client?: { _id: string; name: string };
  invoiceNumber?: string | null;
  invoiceId?: string | null;
  warrantyExpiry?: string; // alternative name
  warrantyEndDate?: string;
  isWarrantyActive?: boolean;
}

export default function SerialNumbersPage() {
  const [serialNumbers, setSerialNumbers] = useState<SerialNumber[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formProduct, setFormProduct] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('');
  const [formSerialNumbers, setFormSerialNumbers] = useState('');
  const [formPurchaseDate, setFormPurchaseDate] = useState('');
  const [formPurchasePrice, setFormPurchasePrice] = useState(0);
  const [formNotes, setFormNotes] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formReceivedDate, setFormReceivedDate] = useState('');
  const [formSoldDate, setFormSoldDate] = useState('');
  const [formSoldTo, setFormSoldTo] = useState('');
  const [formInvoiceNumber, setFormInvoiceNumber] = useState('');
  const [formWarrantyExpiry, setFormWarrantyExpiry] = useState('');

  // Autofill related fields when product changes
  useEffect(() => {
    let mounted = true;
    const fillFromProduct = async () => {
      if (!formProduct) {
        setFormBatch('');
        setFormSupplier('');
        setFormReceivedDate('');
        setFormPurchaseDate('');
        setFormPurchasePrice(0);
        setFormWarrantyExpiry('');
        return;
      }

      const p: any = products.find(pp => pp._id === formProduct);
      if (!p) return;

      // Fill purchase price from product averageCost
      if (mounted) setFormPurchasePrice(Number(p.averageCost || 0));

      // Fill dates: prefer lastSupplyDate if available
      const supplyDate = p.lastSupplyDate || p.lastSaleDate || null;
      if (mounted) {
        setFormPurchaseDate(supplyDate ? new Date(supplyDate).toISOString().slice(0,10) : '');
        setFormReceivedDate(supplyDate ? new Date(supplyDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10));
      }

      // Fill warranty from product if available
      if (mounted) setFormWarrantyExpiry(p.warrantyExpiry || p.warrantyEndDate || '');

      // Resolve supplier
      const sup = p.supplier;
      if (!sup) {
        if (mounted) setFormSupplier('');
      } else if (typeof sup === 'object') {
        if (mounted) setFormSupplier(sup.name || sup.companyName || sup._id || '');
      } else {
        // sup is id
        try {
          const res = await suppliersApi.getById(sup);
          if (mounted && res.success) {
            const data: any = (res as any).data;
            setFormSupplier(data?.name || data?.companyName || sup);
          } else if (mounted) {
            setFormSupplier(sup);
          }
        } catch (err) {
          if (mounted) setFormSupplier(sup);
        }
      }

      // Try to fetch latest batch for this product and prefill batch number
      try {
        const batchesRes = await inventoryBatchApi.getByProduct(formProduct, { limit: 1 });
        if (mounted && batchesRes.success) {
          const bData: any = (batchesRes as any).data;
          // API may return array or object with data
          const list = Array.isArray(bData) ? bData : Array.isArray(bData?.data) ? bData.data : [];
          if (list && list.length > 0) {
            const latest = list[0];
            if (mounted) setFormBatch(latest.batchNumber || latest.batch || '');
            if (mounted && latest.unitCost != null) setFormPurchasePrice(Number(latest.unitCost));
            if (mounted && latest.receivedDate) setFormReceivedDate(new Date(latest.receivedDate).toISOString().slice(0,10));
          }
        }
      } catch (err) {
        // ignore
      }
    };
    fillFromProduct();
    return () => { mounted = false; };
  }, [formProduct, products]);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when filters change
  useEffect(() => {
    fetchData();
  }, [searchTerm, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [serialsRes, warehousesRes, productsRes] = await Promise.all([
        serialNumberApi.getAll({ 
          search: searchTerm || undefined,
          status: filterStatus || undefined,
          limit: 100
        }),
        warehouseApi.getAll({ limit: 100 }),
        productsApi.getAll({ limit: 100 })
      ]);
      
      console.log('Serials response:', serialsRes);
      console.log('Products response:', productsRes);
      
      // Handle serial numbers
      if (serialsRes.success) {
        const sData = (serialsRes as any).data;
        if (Array.isArray(sData)) {
          setSerialNumbers(sData);
        } else if (sData && Array.isArray(sData.data)) {
          setSerialNumbers(sData.data);
        } else {
          setSerialNumbers([]);
        }
      }
      
      // Handle warehouses
      if (warehousesRes.success) {
        const wData = (warehousesRes as any).data;
        if (Array.isArray(wData)) {
          setWarehouses(wData);
        } else if (wData && Array.isArray(wData.data)) {
          setWarehouses(wData.data);
        } else {
          setWarehouses([]);
        }
      }
      
      // Handle products - show all products, not just serial-tracked ones
      if (productsRes.success) {
        const pData = (productsRes as any).data;
        if (Array.isArray(pData)) {
          setProducts(pData);
        } else if (pData && Array.isArray(pData.data)) {
          setProducts(pData.data);
        } else {
          setProducts([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    // Preselect first product that tracks serial numbers to avoid empty selection
    const firstTrackable = products.find((p: any) => p.trackSerialNumbers);
    setFormProduct(firstTrackable ? firstTrackable._id : '');
    setFormWarehouse('');
    setFormSerialNumbers('');
    setFormPurchaseDate('');
    setFormPurchasePrice(0);
    setFormNotes('');
    setFormBatch('');
    setFormSupplier('');
    setFormReceivedDate('');
    setFormSoldDate('');
    setFormSoldTo('');
    setFormInvoiceNumber('');
    setFormWarrantyExpiry('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const serialArray = formSerialNumbers.split('\n').map(s => s.trim()).filter(s => s);
      
      // Client-side validation: ensure a product is selected and it tracks serial numbers
      const selectedProduct = products.find(p => p._id === formProduct);
      if (!selectedProduct) {
        setError('Please select a product');
        setSubmitting(false);
        return;
      }
      if (!selectedProduct.trackSerialNumbers) {
        setError('Selected product is not configured to track serial numbers');
        setSubmitting(false);
        return;
      }

      const data = {
        product: formProduct,
        warehouse: formWarehouse || undefined,
        serialNumbers: serialArray,
        batch: formBatch || undefined,
        supplier: formSupplier || undefined,
        receivedDate: formReceivedDate || formPurchaseDate || undefined,
        purchaseDate: formPurchaseDate || undefined,
        purchasePrice: formPurchasePrice || undefined,
        soldDate: formSoldDate || undefined,
        soldTo: formSoldTo || undefined,
        invoiceNumber: formInvoiceNumber || undefined,
        warrantyExpiry: formWarrantyExpiry || undefined,
        notes: formNotes || undefined
      };

      await serialNumberApi.create(data);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to create serial numbers:', err);
      const msg = err?.message || (err?.data && err.data.message) || 'Failed to create serial numbers';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'sold': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'in_use': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'returned': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'damaged': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'under_warranty': return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400';
      case 'retired': return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const findProduct = (prodField: any) => {
    if (!prodField) return { name: '-', sku: '-' };
    if (typeof prodField === 'string') {
      const p = products.find(p => p._id === prodField);
      return p ? { name: p.name, sku: p.sku } : { name: '-', sku: '-' };
    }
    return { name: prodField.name || '-', sku: prodField.sku || '-' };
  };

  // Products that have serial tracking enabled
  const trackableProducts = products.filter((p: any) => p.trackSerialNumbers);

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col gap-3 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Hash className="h-6 w-6" /> Serial Numbers
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Track individual items by serial number</p>
            </div>
            <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Add Serial Numbers
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm min-w-[150px]">
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="in_use">In Use</option>
            <option value="returned">Returned</option>
            <option value="damaged">Damaged</option>
            <option value="under_warranty">Under Warranty</option>
            <option value="retired">Retired</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : serialNumbers.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">No serial numbers found</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Serial Number</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Product</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Batch</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Supplier</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Warehouse</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Received</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Sold</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Sold To</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Invoice</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Warranty</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Sale Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {serialNumbers.map((serial) => (
                    <tr key={serial._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 text-sm font-medium dark:text-white">{serial.serialNumber}</td>
                      <td className="p-4 text-sm">
                        {(() => { const p = findProduct(serial.product); return (<><div className="dark:text-white">{p.name}</div><div className="text-slate-500 dark:text-slate-400 text-xs">{p.sku}</div></>); })()}
                      </td>
                      <td className="p-4 text-sm dark:text-slate-300">{(serial.batch && typeof serial.batch === 'object') ? (serial.batch.batchNumber || '-') : (typeof serial.batch === 'string' ? serial.batch : (serial as any).batchNumber || '-')}</td>
                      <td className="p-4 text-sm dark:text-slate-300">{(serial.supplier && typeof serial.supplier === 'object') ? (serial.supplier.name || '-') : (typeof serial.supplier === 'string' ? serial.supplier : (serial as any).supplierName || '-')}</td>
                      <td className="p-4 text-sm dark:text-slate-300">{serial.warehouse?.name || '-'}</td>
                      <td className="p-4 text-sm dark:text-slate-300">{(serial.receivedDate||serial.purchaseDate) ? new Date((serial.receivedDate||serial.purchaseDate) as string).toLocaleDateString() : '-'}</td>
                      <td className="p-4 text-sm dark:text-slate-300">{(serial.soldDate||serial.saleDate) ? new Date((serial.soldDate||serial.saleDate) as string).toLocaleDateString() : '-'}</td>
                      <td className="p-4 text-sm dark:text-slate-300">{(serial.soldTo && typeof serial.soldTo === 'object') ? (serial.soldTo.name || '-') : (serial.client?.name || (typeof serial.soldTo === 'string' ? serial.soldTo : '-'))}</td>
                      <td className="p-4 text-sm dark:text-slate-300">{serial.invoiceNumber || serial.invoiceId || (serial as any).saleInvoiceNumber || '-'}</td>
                      <td className="p-4 text-sm">{(serial.warrantyEndDate||serial.warrantyExpiry) ? (<div className="flex items-center gap-1">{serial.isWarrantyActive ? <Check className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}<span className={serial.isWarrantyActive ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{new Date((serial.warrantyEndDate||serial.warrantyExpiry) as string).toLocaleDateString()}</span></div>) : <span className="text-slate-500 dark:text-slate-400">-</span>}</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(serial.status)}`}>{getStatusLabel(serial.status)}</span></td>
                      <td className="p-4 text-sm text-right dark:text-slate-300">{serial.salePrice ? `$${serial.salePrice.toFixed(2)}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">Add Serial Numbers</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <X className="h-5 w-5 dark:text-slate-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Product *</label>
                  {trackableProducts.length === 0 ? (
                    <div className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-yellow-50 dark:bg-yellow-900/20 text-sm text-yellow-700 dark:text-yellow-300">
                      No products are configured to track serial numbers. Enable <strong>Track Serial Numbers</strong> on a product in the Products page before adding serials.
                    </div>
                  ) : (
                    <select value={formProduct} onChange={(e) => setFormProduct(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                      <option value="">Select product</option>
                      {trackableProducts.map((p: any) => (
                        <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Warehouse</label>
                  <select value={formWarehouse} onChange={(e) => setFormWarehouse(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                    <option value="">Default Warehouse</option>
                    {warehouses.map(w => (
                      <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Serial Numbers *</label>
                  <textarea
                    value={formSerialNumbers}
                    onChange={(e) => setFormSerialNumbers(e.target.value)}
                    rows={5}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm font-mono"
                    placeholder="Enter one serial number per line&#10;SN001&#10;SN002&#10;SN003"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter each serial number on a new line</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Purchase Date</label>
                    <input
                      type="date"
                      value={formPurchaseDate}
                      onChange={(e) => setFormPurchaseDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Purchase Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPurchasePrice}
                      onChange={(e) => setFormPurchasePrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Batch</label>
                    <input type="text" value={formBatch} onChange={(e) => setFormBatch(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Supplier</label>
                    <input type="text" value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Received Date</label>
                    <input type="date" value={formReceivedDate} onChange={(e) => setFormReceivedDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Sold Date</label>
                    <input type="date" value={formSoldDate} onChange={(e) => setFormSoldDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Sold To (Client)</label>
                    <input type="text" value={formSoldTo} onChange={(e) => setFormSoldTo(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Invoice Number</label>
                    <input type="text" value={formInvoiceNumber} onChange={(e) => setFormInvoiceNumber(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Warranty Expiry</label>
                    <input type="date" value={formWarrantyExpiry} onChange={(e) => setFormWarrantyExpiry(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting || trackableProducts.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-60" >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Add Serial Numbers
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
