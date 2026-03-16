import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { reorderPointApi, productsApi, suppliersApi } from '@/lib/api';
import { Plus, Search, X, Loader2, RefreshCw, AlertTriangle, Check } from 'lucide-react';

interface ReorderPoint {
  _id: string;
  product: { _id: string; name: string; sku: string; currentStock: number };
  supplier: { _id: string; name: string; code: string };
  reorderPoint: number;
  reorderQuantity: number;
  safetyStock: number;
  leadTimeDays: number;
  estimatedUnitCost: number;
  autoReorder: boolean;
  isActive: boolean;
  currentStock?: number;
  needsReorder?: boolean;
  belowSafetyStock?: boolean;
}

export default function ReorderPointsPage() {
  const [reorderPoints, setReorderPoints] = useState<ReorderPoint[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formProduct, setFormProduct] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formReorderPoint, setFormReorderPoint] = useState(10);
  const [formReorderQuantity, setFormReorderQuantity] = useState(20);
  const [formSafetyStock, setFormSafetyStock] = useState(0);
  const [formLeadTimeDays, setFormLeadTimeDays] = useState(7);
  const [formEstimatedUnitCost, setFormEstimatedUnitCost] = useState(0);
  const [formAutoReorder, setFormAutoReorder] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reorderRes, productsRes, suppliersRes] = await Promise.all([
        reorderPointApi.getAll({ limit: 100 }),
        productsApi.getAll({ limit: 100 }),
        suppliersApi.getAll({ limit: 100 })
      ]);
      
      if (reorderRes.success) {
        setReorderPoints((reorderRes as any).data || []);
      }
      if (productsRes.success) {
        setProducts((productsRes as any).data || []);
      }
      if (suppliersRes.success) {
        setSuppliers((suppliersRes as any).data || []);
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
    setFormSupplier('');
    setFormReorderPoint(10);
    setFormReorderQuantity(20);
    setFormSafetyStock(0);
    setFormLeadTimeDays(7);
    setFormEstimatedUnitCost(0);
    setFormAutoReorder(false);
    setFormNotes('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        product: formProduct,
        supplier: formSupplier,
        reorderPoint: formReorderPoint,
        reorderQuantity: formReorderQuantity,
        safetyStock: formSafetyStock,
        leadTimeDays: formLeadTimeDays,
        estimatedUnitCost: formEstimatedUnitCost,
        autoReorder: formAutoReorder,
        notes: formNotes || undefined
      };

      await reorderPointApi.create(data);
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create:', err);
      setError('Failed to create reorder point');
    } finally {
      setSubmitting(false);
    }
  };

  // Apply reorder settings and optionally create PO immediately
  const handleApplyAndCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        productId: formProduct,
        supplierId: formSupplier,
        reorderPoint: formReorderPoint,
        reorderQuantity: formReorderQuantity,
        safetyStock: formSafetyStock,
        estimatedUnitCost: formEstimatedUnitCost,
        autoReorder: true
      };

      const result = await reorderPointApi.applyToProduct(data) as any;
      
      if (result.success) {
        if (result.autoPOCreated) {
          alert('Reorder point applied and Purchase Order created successfully!');
        } else {
          alert('Reorder point applied successfully!');
        }
        setShowModal(false);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to apply:', err);
      setError('Failed to apply reorder point');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reorder point?')) return;
    try {
      await reorderPointApi.delete(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const selectedProduct = products.find(p => p._id === formProduct);

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col gap-3 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <RefreshCw className="h-6 w-6" /> Reorder Points
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Manage automatic reorder settings</p>
            </div>
            <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Add Reorder Point
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : reorderPoints.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">No reorder points configured</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Product</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Supplier</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Current Stock</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Reorder Point</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Safety Stock</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Reorder Qty</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Lead Time</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {reorderPoints.map((rp) => (
                    <tr key={rp._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 text-sm">
                        <div className="font-medium dark:text-white">{rp.product?.name || '-'}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs">{rp.product?.sku || '-'}</div>
                      </td>
                      <td className="p-4 text-sm dark:text-slate-300">
                        {rp.supplier?.name || '-'}
                      </td>
                      <td className="p-4 text-sm text-right font-medium dark:text-white">
                        {rp.currentStock ?? rp.product?.currentStock ?? 0}
                      </td>
                      <td className="p-4 text-sm text-right dark:text-slate-300">
                        {rp.reorderPoint}
                      </td>
                      <td className="p-4 text-sm text-right dark:text-slate-300">
                        {rp.safetyStock}
                      </td>
                      <td className="p-4 text-sm text-right dark:text-slate-300">
                        {rp.reorderQuantity}
                      </td>
                      <td className="p-4 text-sm text-right dark:text-slate-300">
                        {rp.leadTimeDays} days
                      </td>
                      <td className="p-4">
                        {rp.needsReorder || (rp.currentStock ?? rp.product?.currentStock ?? 0) <= rp.reorderPoint ? (
                          <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                            <AlertTriangle className="h-4 w-4" /> Reorder
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Check className="h-4 w-4" /> OK
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDelete(rp._id)} className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Delete">
                          <Loader2 className="h-4 w-4" />
                        </button>
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
                <h2 className="text-lg font-semibold dark:text-white">Add Reorder Point</h2>
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
                      <option key={p._id} value={p._id}>{p.name} ({p.sku}) - Stock: {p.currentStock || 0}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Supplier *</label>
                  <select value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                    <option value="">Select supplier</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Reorder Point *</label>
                    <input
                      type="number"
                      min="0"
                      value={formReorderPoint}
                      onChange={(e) => setFormReorderPoint(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Reorder Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={formReorderQuantity}
                      onChange={(e) => setFormReorderQuantity(parseInt(e.target.value) || 1)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Safety Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={formSafetyStock}
                      onChange={(e) => setFormSafetyStock(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Lead Time (days)</label>
                    <input
                      type="number"
                      min="0"
                      value={formLeadTimeDays}
                      onChange={(e) => setFormLeadTimeDays(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Estimated Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formEstimatedUnitCost}
                    onChange={(e) => setFormEstimatedUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoReorder"
                    checked={formAutoReorder}
                    onChange={(e) => setFormAutoReorder(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="autoReorder" className="text-sm dark:text-slate-300">Enable automatic reorder</label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={submitting}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-slate-600 text-white rounded-lg flex items-center gap-2 hover:bg-slate-700">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Only
                  </button>
                  <button type="button" onClick={handleApplyAndCreatePO} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Apply & Create PO
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
