import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { inventoryBatchApi, warehouseApi, productsApi, suppliersApi } from '@/lib/api';
import { Plus, Search, X, Loader2, Package, AlertTriangle, Calendar } from 'lucide-react';

interface Batch {
  _id: string;
  product: { _id: string; name: string; sku: string; unit: string };
  warehouse: { _id: string; name: string; code: string };
  batchNumber?: string;
  lotNumber?: string;
  expiryDate?: string;
  supplier?: any;
  quantity: number;
  availableQuantity: number;
  unitCost: number;
  totalCost: number;
  status: 'active' | 'partially_used' | 'exhausted' | 'expired' | 'quarantined';
  receivedDate: string;
  isExpired?: boolean;
  isNearingExpiry?: boolean;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formProduct, setFormProduct] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formQuantityRemaining, setFormQuantityRemaining] = useState(1);
  const [formBatchNumber, setFormBatchNumber] = useState('');
  const [formLotNumber, setFormLotNumber] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formUnitCost, setFormUnitCost] = useState(0);
  const [formSupplier, setFormSupplier] = useState('');
  const [formReceivedDate, setFormReceivedDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, [searchTerm, filterWarehouse, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, warehousesRes, productsRes] = await Promise.all([
        inventoryBatchApi.getAll({ 
          search: searchTerm || undefined,
          warehouseId: filterWarehouse || undefined,
          status: filterStatus || undefined
        }),
        warehouseApi.getAll({ limit: 100 }),
        productsApi.getAll({ limit: 100 })
      ]);
      
      if (batchesRes.success) {
        setBatches((batchesRes as any).data || []);
      }
      if (warehousesRes.success) {
        setWarehouses((warehousesRes as any).data || []);
      }
      if (productsRes.success) {
        setProducts((productsRes as any).data || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setFormProduct('');
    setFormWarehouse('');
    setFormQuantity(1);
    setFormQuantityRemaining(1);
    setFormBatchNumber('');
    setFormLotNumber('');
    setFormExpiryDate('');
    setFormUnitCost(0);
    setFormSupplier('');
    setFormReceivedDate('');
    setFormNotes('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        product: formProduct,
        warehouse: formWarehouse || undefined,
        quantity: formQuantity,
        availableQuantity: formQuantityRemaining || formQuantity,
        batchNumber: formBatchNumber || undefined,
        lotNumber: formLotNumber || undefined,
        expiryDate: formExpiryDate || undefined,
        receivedDate: formReceivedDate || undefined,
        unitCost: formUnitCost,
        supplier: formSupplier || undefined,
        notes: formNotes || undefined
      };

      await inventoryBatchApi.create(data);
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create batch:', err);
      setError('Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'partially_used': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'exhausted': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'expired': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'quarantined': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const findProduct = (prodField: any) => {
    if (!prodField) return { name: '-', sku: '-', unit: '' };
    if (typeof prodField === 'string') {
      const p = products.find(p => p._id === prodField);
      return p ? { name: p.name, sku: p.sku, unit: p.unit || '' } : { name: '-', sku: '-', unit: '' };
    }
    return { name: prodField.name || '-', sku: prodField.sku || '-', unit: prodField.unit || '' };
  };

  const renderSupplier = (supplierField: any) => {
    if (!supplierField) return '-';
    if (typeof supplierField === 'string') return supplierField || '-';
    return supplierField.name || supplierField.companyName || '-';
  };

  const selectedProduct = products.find(p => p._id === formProduct);

  // Autofill supplier when a product is selected.
  useEffect(() => {
    let mounted = true;
    const fillSupplier = async () => {
      if (!formProduct) {
        setFormSupplier('');
        return;
      }
      const p = products.find(pr => pr._id === formProduct) as any;
      if (!p) {
        setFormSupplier('');
        return;
      }
      const sup = p.supplier;
      if (!sup) {
        setFormSupplier('');
        // also autofill other fields from product when no supplier
        if (mounted) {
          setFormUnitCost(Number((p.averageCost || 0)));
          setFormQuantity(1);
          setFormQuantityRemaining(1);
          setFormReceivedDate(new Date().toISOString().slice(0, 10));
        }
        return;
      }
      if (typeof sup === 'object') {
        const name = sup.name || sup.companyName || sup._id || '';
        if (mounted) setFormSupplier(name);
        return;
      }
      // sup is likely an id (string) - attempt to fetch supplier name
      try {
        const res = await suppliersApi.getById(sup);
        if (res.success && mounted) {
          const data: any = (res as any).data;
          setFormSupplier(data?.name || data?.companyName || sup);
        } else if (mounted) {
          setFormSupplier(sup);
        }
      } catch (err) {
        if (mounted) setFormSupplier(sup);
      }
      // autofill other product-related fields
      if (mounted) {
        setFormUnitCost(Number((p.averageCost || 0)));
        setFormQuantity(1);
        setFormQuantityRemaining(1);
        setFormReceivedDate(new Date().toISOString().slice(0, 10));
      }
    };
    fillSupplier();
    return () => { mounted = false; };
  }, [formProduct, products]);

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col gap-3 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Package className="h-6 w-6" /> Batch Inventory
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Track batch/lot numbers with expiration dates</p>
            </div>
            <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> New Batch
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by batch, lot number or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            />
          </div>
          <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm min-w-[150px]">
            <option value="">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w._id} value={w._id}>{w.name}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm min-w-[150px]">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="partially_used">Partially Used</option>
            <option value="exhausted">Exhausted</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">No batches found</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Product</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Supplier</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Warehouse</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Batch/Lot #</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Qty Received</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Qty Remaining</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Cost Price</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Expiry</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Received</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Notes</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {batches.map((batch) => (
                    <tr key={batch._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 text-sm">
                        {(() => {
                          const p = findProduct(batch.product);
                          return (
                            <>
                              <div className="font-medium dark:text-white">{p.name}</div>
                              <div className="text-slate-500 dark:text-slate-400 text-xs">{p.sku}</div>
                            </>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-sm dark:text-slate-300">
                        {renderSupplier(batch.supplier)}
                      </td>
                      <td className="p-4 text-sm dark:text-slate-300">
                        {batch.warehouse?.name || '-'}
                      </td>
                      <td className="p-4 text-sm dark:text-slate-300">
                        <div>{batch.batchNumber || '-'}</div>
                        <div className="text-xs text-slate-500">Lot: {batch.lotNumber || '-'}</div>
                      </td>
                      <td className="p-4 text-sm text-right dark:text-slate-300">
                        {batch.quantity} {findProduct(batch.product).unit}
                      </td>
                      <td className="p-4 text-sm text-right font-medium dark:text-white">
                        {batch.availableQuantity}
                      </td>
                      <td className="p-4 text-sm text-right dark:text-slate-300">
                        ${batch.unitCost?.toFixed(2) || '0.00'}
                      </td>
                      <td className="p-4 text-sm">
                        {batch.expiryDate ? (
                          <div className="flex items-center gap-1">
                            {batch.isNearingExpiry && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                            {batch.isExpired && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            <span className={batch.isExpired ? 'text-red-500' : batch.isNearingExpiry ? 'text-yellow-500' : 'dark:text-slate-300'}>
                              {new Date(batch.expiryDate).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-4 text-sm dark:text-slate-300">
                        {batch.receivedDate ? new Date(batch.receivedDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4 text-sm text-slate-700 dark:text-slate-300" title={batch.notes || ''}>
                        {batch.notes ? (batch.notes.length > 60 ? batch.notes.slice(0, 57) + '...' : batch.notes) : '-'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(batch.status)}`}>
                          {getStatusLabel(batch.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-right dark:text-slate-300">
                        ${batch.totalCost?.toFixed(2) || '0.00'}
                      </td>
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
                <h2 className="text-lg font-semibold dark:text-white">New Inventory Batch</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <X className="h-5 w-5 dark:text-slate-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Product *</label>
                  <select value={formProduct} onChange={(e) => setFormProduct(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                    <option value="">Select product</option>
                    {products.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(parseInt(e.target.value) || 1)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Unit Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formUnitCost}
                      onChange={(e) => setFormUnitCost(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Quantity Remaining</label>
                    <input
                      type="number"
                      min="0"
                      value={formQuantityRemaining}
                      onChange={(e) => setFormQuantityRemaining(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Received Date</label>
                    <input
                      type="date"
                      value={formReceivedDate}
                      onChange={(e) => setFormReceivedDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Batch Number</label>
                    <input
                      type="text"
                      value={formBatchNumber}
                      onChange={(e) => setFormBatchNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Lot Number</label>
                    <input
                      type="text"
                      value={formLotNumber}
                      onChange={(e) => setFormLotNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Expiry Date</label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Supplier</label>
                  <input type="text" value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Batch
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
