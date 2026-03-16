import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { stockTransferApi, warehouseApi, productsApi } from '@/lib/api';
import { Plus, Search, X, Loader2, ArrowRight, Check, XCircle, Package } from 'lucide-react';

interface Transfer {
  _id: string;
  transferNumber: string;
  fromWarehouse: { _id: string; name: string; code: string };
  toWarehouse: { _id: string; name: string; code: string };
  items: Array<{
    product: { _id: string; name: string; sku: string };
    quantity: number;
  }>;
  status: 'draft' | 'pending' | 'in_transit' | 'completed' | 'cancelled';
  reason: string;
  notes?: string;
  transferDate: string;
  createdAt: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  currentStock: number;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formFromWarehouse, setFormFromWarehouse] = useState('');
  const [formToWarehouse, setFormToWarehouse] = useState('');
  const [formReason, setFormReason] = useState('rebalance');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<Array<{ product: string; quantity: number }>>([]);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when filter changes
  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [transfersRes, warehousesRes, productsRes] = await Promise.all([
        stockTransferApi.getAll({ status: filterStatus || undefined, limit: 100 }),
        warehouseApi.getAll({ limit: 100 }),
        productsApi.getAll({ limit: 100 })
      ]);
      
      console.log('Transfers response:', transfersRes);
      console.log('Warehouses response:', warehousesRes);
      
      if (transfersRes.success) {
        const data = (transfersRes as any).data;
        if (Array.isArray(data)) {
          setTransfers(data);
        } else if (data && Array.isArray(data.data)) {
          setTransfers(data.data);
        } else {
          setTransfers([]);
        }
      } else {
        setTransfers([]);
      }
      
      if (warehousesRes.success) {
        const wData = (warehousesRes as any).data;
        if (Array.isArray(wData)) {
          setWarehouses(wData);
        } else if (wData && Array.isArray(wData.data)) {
          setWarehouses(wData.data);
        } else {
          setWarehouses([]);
        }
      } else {
        setWarehouses([]);
      }
      
      if (productsRes.success) {
        const pData = (productsRes as any).data;
        if (Array.isArray(pData)) {
          setProducts(pData);
        } else if (pData && Array.isArray(pData.data)) {
          setProducts(pData.data);
        } else {
          setProducts([]);
        }
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setFormFromWarehouse('');
    setFormToWarehouse('');
    setFormReason('rebalance');
    setFormNotes('');
    setFormItems([{ product: '', quantity: 1 }]);
    setShowModal(true);
  };

  const addItem = () => {
    setFormItems([...formItems, { product: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validate warehouses are selected
      if (!formFromWarehouse || !formToWarehouse) {
        throw new Error('Please select both source and destination warehouses');
      }
      
      // Validate items
      const validItems = formItems.filter(i => i.product && i.quantity > 0);
      if (validItems.length === 0) {
        throw new Error('Please add at least one item to transfer');
      }

      const data = {
        fromWarehouse: formFromWarehouse,
        toWarehouse: formToWarehouse,
        reason: formReason,
        notes: formNotes,
        items: validItems
      };

      console.log('Creating transfer with data:', data);
      const res = await stockTransferApi.create(data);
      console.log('Transfer creation response:', res);
      
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to create transfer:', err);
      setError(err.message || 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await stockTransferApi.approve(id);
      fetchData();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await stockTransferApi.complete(id);
      fetchData();
    } catch (err) {
      console.error('Failed to complete:', err);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this transfer?')) return;
    try {
      await stockTransferApi.cancel(id, 'Cancelled by user');
      fetchData();
    } catch (err) {
      console.error('Failed to cancel:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'in_transit': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'completed': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col gap-3 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ArrowRight className="h-6 w-6" /> Stock Transfers
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Transfer stock between warehouses</p>
            </div>
            <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> New Transfer
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm min-w-[150px]">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="in_transit">In Transit</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : transfers.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">No transfers found</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Transfer #</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">From → To</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Items</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Date</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {transfers.map((transfer) => (
                    <tr key={transfer._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 text-sm dark:text-white font-medium">{transfer.transferNumber}</td>
                      <td className="p-4 text-sm dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>{transfer.fromWarehouse?.name || '-'}</span>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                          <span>{transfer.toWarehouse?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {transfer.items?.length || 0} items
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(transfer.status)}`}>
                          {getStatusLabel(transfer.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm dark:text-slate-300">
                        {transfer.transferDate ? new Date(transfer.transferDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {transfer.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(transfer._id)} className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded" title="Approve">
                                <Check className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleCancel(transfer._id)} className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Cancel">
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {transfer.status === 'in_transit' && (
                            <button onClick={() => handleComplete(transfer._id)} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                              Complete
                            </button>
                          )}
                        </div>
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
                <h2 className="text-lg font-semibold dark:text-white">New Stock Transfer</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <X className="h-5 w-5 dark:text-slate-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">From Warehouse *</label>
                    <select value={formFromWarehouse} onChange={(e) => setFormFromWarehouse(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                      <option value="">Select</option>
                      {warehouses.map(w => (
                        <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">To Warehouse *</label>
                    <select value={formToWarehouse} onChange={(e) => setFormToWarehouse(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                      <option value="">Select</option>
                      {warehouses.filter(w => w._id !== formFromWarehouse).map(w => (
                        <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Reason</label>
                  <select value={formReason} onChange={(e) => setFormReason(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                    <option value="rebalance">Rebalance</option>
                    <option value="sale">Sale</option>
                    <option value="return">Return</option>
                    <option value="repair">Repair</option>
                    <option value="consignment">Consignment</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium dark:text-slate-300">Items</label>
                    <button type="button" onClick={addItem} className="text-sm text-indigo-600 hover:text-indigo-700">+ Add Item</button>
                  </div>
                  {formItems.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <select value={item.product} onChange={(e) => updateItem(index, 'product', e.target.value)} className="flex-1 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required>
                        <option value="">Select product</option>
                        {products.map(p => (
                          <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} className="w-20 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required />
                      {formItems.length > 1 && (
                        <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500 hover:text-red-700">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
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
                    Create Transfer
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
