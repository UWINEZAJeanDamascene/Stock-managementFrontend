import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { stockApi, productsApi } from '@/lib/api';
import { Plus, Search, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StockMovement {
  _id: string;
  product: { _id: string; name: string; sku: string };
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousStock?: number;
  newStock?: number;
  reference?: string;
  referenceNumber?: string;
  notes?: string;
  movementDate?: string;
  date?: string;
  createdAt?: string;
  performedBy?: { name?: string };
  createdBy?: { name?: string };
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  currentStock: number;
  unit: string;
}

const ADJUSTMENT_REASONS = ['damage', 'loss', 'theft', 'expired', 'correction', 'transfer'] as const;
type AdjustmentReason = typeof ADJUSTMENT_REASONS[number];

export default function StockPage() {
  const { t } = useTranslation();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);

  // Form fields
  const [formProduct, setFormProduct] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnitCost, setFormUnitCost] = useState(0);
  const [formSupplier, setFormSupplier] = useState('');
  const [formBatchNumber, setFormBatchNumber] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Adjustment-specific fields
  const [formAdjustmentDirection, setFormAdjustmentDirection] = useState<'in' | 'out'>('out');
  const [formAdjustmentReason, setFormAdjustmentReason] = useState<AdjustmentReason>('correction');

  useEffect(() => {
    fetchData();
  }, [searchTerm, filterType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [movementsRes, productsRes] = await Promise.all([
        stockApi.getMovements({
          type: filterType as 'in' | 'out' | 'adjustment' | undefined,
          page: 1,
          limit: 50,
          search: searchTerm || undefined,
        }),
        productsApi.getAll({ page: 1, limit: 100 }),
      ]);

      if (movementsRes.success) {
        setMovements((movementsRes as { data: StockMovement[] }).data || []);
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

  const openModal = (type: 'in' | 'out' | 'adjustment') => {
    setModalType(type);
    setFormProduct('');
    setFormQuantity(1);
    setFormUnitCost(0);
    setFormSupplier('');
    setFormBatchNumber('');
    setFormReference('');
    setFormNotes('');
    setFormAdjustmentDirection('out');
    setFormAdjustmentReason('correction');
    setEditingMovement(null);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (movement: StockMovement) => {
    setEditingMovement(movement);
    setModalType(movement.type);
    setFormProduct(movement.product?._id || '');
    setFormQuantity(movement.quantity || 1);
    setFormUnitCost((movement as any).unitCost || 0);
    setFormSupplier((movement as any).supplier?._id || (movement as any).supplier || '');
    setFormBatchNumber((movement as any).batchNumber || '');
    setFormReference(movement.referenceNumber || movement.reference || '');
    setFormNotes(movement.notes || '');
    setFormAdjustmentDirection('out');
    setFormAdjustmentReason('correction');
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formQuantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingMovement) {
        await stockApi.updateMovement(editingMovement._id, {
          notes: formNotes,
          referenceNumber: formReference || undefined,
          batchNumber: formBatchNumber || undefined,
          unitCost: formUnitCost || undefined,
          movementDate: undefined,
        });
        setEditingMovement(null);
        setShowModal(false);
        fetchData();
        return;
      }

      if (modalType === 'in') {
        // Receive stock from supplier
        await stockApi.receiveStock({
          product: formProduct,
          quantity: formQuantity,
          unitCost: formUnitCost,
          supplier: formSupplier && formSupplier.trim() !== '' ? formSupplier : undefined,
          batchNumber: formBatchNumber || undefined,
          notes: formNotes,
        });
      } else if (modalType === 'out') {
        // Stock out — always type:'out', reason:'transfer'
        await stockApi.adjustStock({
          product: formProduct,
          quantity: formQuantity,
          type: 'out',
          reason: 'transfer',
          notes: formNotes,
        });
      } else {
        // Adjustment — user picks direction (in/out) and reason
        await stockApi.adjustStock({
          product: formProduct,
          quantity: formQuantity,
          type: formAdjustmentDirection,
          reason: formAdjustmentReason,
          notes: formNotes,
        });
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Failed to save:', err);
      const errorMessage =
        err?.response?.data?.message || err?.message || 'Failed to save';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'in': return t('stock.stockIn');
      case 'out': return t('stock.stockOut');
      case 'adjustment': return t('stock.adjustment');
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'in': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'out': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'adjustment': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col gap-3 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{t('stock.title')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{t('stock.subtitle')}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => openModal('in')} className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('stock.stockIn')}</span>
              </button>
              <button onClick={() => openModal('out')} className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('stock.stockOut')}</span>
              </button>
              <button onClick={() => openModal('adjustment')} className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('stock.adjustment')}</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('products.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm min-w-[120px]"
          >
            <option value="">{t('stock.allTypes')}</option>
            <option value="in">{t('stock.stockIn')}</option>
            <option value="out">{t('stock.stockOut')}</option>
            <option value="adjustment">{t('stock.adjustment')}</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" />
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">
            {t('stock.noMovements')}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.date')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.type')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('stock.product')}</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('stock.quantityCol')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('stock.referenceCol')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('stock.notesCol')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('stock.byCol')}</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {movements.map((movement) => (
                    <tr key={movement._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 text-sm dark:text-slate-300">
                        {(movement.movementDate || movement.date || movement.createdAt)
                          ? new Date(movement.movementDate || movement.date || movement.createdAt!).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(movement.type)}`}>
                          {getTypeLabel(movement.type)}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        <div className="font-medium dark:text-white">{movement.product?.name || '-'}</div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs">{movement.product?.sku || '-'}</div>
                      </td>
                      <td className="p-4 text-sm text-right font-medium">
                        {(() => {
                          const isDecrease =
                            movement.type === 'out' ||
                            (movement.type === 'adjustment' &&
                              movement.newStock !== undefined &&
                              movement.previousStock !== undefined &&
                              movement.newStock < movement.previousStock);
                          return (
                            <span className={isDecrease ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                              {isDecrease ? '-' : '+'}{movement.quantity}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-sm dark:text-slate-300">{movement.referenceNumber || movement.reference || '-'}</td>
                      <td className="p-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{movement.notes || '-'}</td>
                      <td className="p-4 text-sm dark:text-slate-300">{movement.performedBy?.name || movement.createdBy?.name || '-'}</td>
                      <td className="p-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(movement)}
                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                            title={t('common.edit')}
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(t('stock.deleteConfirm'))) return;
                              try {
                                setActionLoading(movement._id);
                                await stockApi.deleteMovement(movement._id);
                                fetchData();
                              } catch (err) {
                                console.error('Failed to delete movement:', err);
                                setError('Failed to delete movement');
                              } finally {
                                setActionLoading(null);
                              }
                            }}
                            className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title={t('common.delete')}
                            disabled={actionLoading === movement._id}
                          >
                            {actionLoading === movement._id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <span>{t('common.delete')}</span>}
                          </button>
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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">
                  {editingMovement ? t('common.edit') : getTypeLabel(modalType)}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <X className="h-5 w-5 dark:text-slate-300" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Product selector — hidden when editing (can't change product) */}
                {!editingMovement && (
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('stock.product')} *</label>
                    <select
                      value={formProduct}
                      onChange={(e) => setFormProduct(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      required
                    >
                      <option value="">{t('common.selectProduct')}</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.sku}) — Stock: {p.currentStock ?? 0} {p.unit}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Adjustment-specific: direction + reason */}
                {modalType === 'adjustment' && !editingMovement && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-slate-300">Direction *</label>
                      <select
                        value={formAdjustmentDirection}
                        onChange={(e) => setFormAdjustmentDirection(e.target.value as 'in' | 'out')}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                        required
                      >
                        <option value="out">Remove from stock (−)</option>
                        <option value="in">Add to stock (+)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-slate-300">Reason *</label>
                      <select
                        value={formAdjustmentReason}
                        onChange={(e) => setFormAdjustmentReason(e.target.value as AdjustmentReason)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                        required
                      >
                        <option value="correction">Correction</option>
                        <option value="damage">Damage</option>
                        <option value="loss">Loss</option>
                        <option value="theft">Theft</option>
                        <option value="expired">Expired</option>
                        <option value="transfer">Transfer</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('stock.quantityCol')} *</label>
                    <input
                      type="number"
                      min="1"
                      value={formQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setFormQuantity(isNaN(val) ? 0 : val);
                      }}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      required
                    />
                  </div>
                  {modalType === 'in' && (
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('stock.unitCost')}</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formUnitCost}
                        onChange={(e) => setFormUnitCost(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {modalType === 'in' && !editingMovement && (
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('stock.batchNumber')}</label>
                    <input
                      type="text"
                      value={formBatchNumber}
                      onChange={(e) => setFormBatchNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('stock.referenceCol')}</label>
                  <input
                    type="text"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    placeholder={t('stock.referencePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('stock.notesCol')}</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    placeholder={t('stock.notesPlaceholder')}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    disabled={submitting}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('common.submit')}
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