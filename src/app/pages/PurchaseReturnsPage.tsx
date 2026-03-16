import { useState, useEffect, useCallback } from 'react';
import { purchaseReturnsApi } from '../../lib/api';
import request from '../../lib/api';
import { Layout } from '../layout/Layout';
import { Dialog, DialogContent } from '@/app/components/ui/dialog';

interface PurchaseReturnItem {
  product: { _id: string; name: string; sku?: string };
  quantity: number;
  unitPrice: number;
  total: number;
  reason?: string;
}

interface PurchaseReturn {
  _id: string;
  purchaseReturnNumber: string;
  company: string;
  supplier: { _id: string; name: string; email?: string; phone?: string };
  purchase?: { _id: string; purchaseNumber: string };
  items: PurchaseReturnItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'refunded' | 'partially_refunded' | 'cancelled';
  notes?: string;
  refundAmount?: number;
  refundMethod?: string;
  refundDate?: string;
  reduceAccountsPayable?: boolean;
  accountsPayableReduction?: number;
  createdBy: { _id: string; name: string; email: string };
  approvedBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Purchase {
  _id: string;
  purchaseNumber: string;
  supplier: { _id: string; name: string };
  status: string;
  grandTotal: number;
  paidAmount: number;
}

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState('');
  const [formItems, setFormItems] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [reduceAP, setReduceAP] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      const response = await purchaseReturnsApi.getAll(params);
      if (response.success) {
        setReturns(response.data as PurchaseReturn[]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch purchase returns');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const fetchSuppliers = async () => {
    try {
      const data = await request<{ success: boolean; data: Supplier[] }>('/suppliers');
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  };

  const fetchPurchases = async (supplierId: string) => {
    try {
      const data = await request<{ success: boolean; data: Purchase[] }>(`/purchases?supplierId=${supplierId}`);
      if (data.success) {
        setPurchases(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
    }
  };

  const fetchPurchaseItems = async (purchaseId: string) => {
    try {
      const data = await request<{ success: boolean; data: { items: any[] } }>(`/purchases/${purchaseId}`);
      if (data.success && data.data.items) {
        setFormItems(data.data.items.map((item: any) => ({
          ...item,
          unitPrice: item.unitPrice ?? item.unitCost,
          returnQuantity: 0,
          returnReason: ''
        })));
      }
    } catch (err) {
      console.error('Failed to fetch purchase items:', err);
    }
  };

  const handleOpenModal = async () => {
    setShowModal(true);
    await fetchSuppliers();
  };

  const handleSupplierChange = async (supplierId: string) => {
    setSelectedSupplier(supplierId);
    setSelectedPurchase('');
    setFormItems([]);
    if (supplierId) {
      await fetchPurchases(supplierId);
    }
  };

  const handlePurchaseChange = async (purchaseId: string) => {
    setSelectedPurchase(purchaseId);
    if (purchaseId) {
      await fetchPurchaseItems(purchaseId);
    }
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    const newItems = [...formItems];
    newItems[index].returnQuantity = Math.min(quantity, newItems[index].quantity);
    setFormItems(newItems);
  };

  const handleItemReasonChange = (index: number, itemReason: string) => {
    const newItems = [...formItems];
    newItems[index].returnReason = itemReason;
    setFormItems(newItems);
  };

  const calculateTotal = () => {
    return formItems.reduce((sum, item) => {
      return sum + (item.returnQuantity || 0) * item.unitPrice;
    }, 0);
  };

  const calculateVAT = () => {
    return formItems.reduce((sum, item) => {
      const returnQty = item.returnQuantity || 0;
      if (returnQty === 0 || !item.quantity) return sum;
      // Proportional VAT: vatPerUnit = original taxAmount / original quantity
      const vatPerUnit = (item.taxAmount || 0) / item.quantity;
      return sum + returnQty * vatPerUnit;
    }, 0);
  };

  const handleSubmit = async () => {
    try {
      const validItems = formItems.filter(item => item.returnQuantity > 0);
      if (validItems.length === 0) {
        alert('Please select at least one item to return');
        return;
      }
      if (!selectedSupplier || !selectedPurchase) {
        alert('Please select supplier and purchase order');
        return;
      }

      const subtotal = calculateTotal();
      const totalTax = calculateVAT();
      const grandTotal = subtotal + totalTax;

      const payload = {
        supplier: selectedSupplier,
        purchase: selectedPurchase,
        reduceAccountsPayable: reduceAP,
        items: validItems.map(item => ({
          product: item.product?._id || item.product,
          quantity: item.returnQuantity,
          unitPrice: item.unitPrice,
          total: item.returnQuantity * item.unitPrice,
          reason: item.returnReason || reason || 'other'
        })),
        notes,
        subtotal,
        totalTax,
        grandTotal
      };

      await purchaseReturnsApi.create(payload);
      setShowModal(false);
      resetForm();
      fetchReturns();
    } catch (err: any) {
      alert(err.message || 'Failed to create purchase return');
    }
  };

  const resetForm = () => {
    setSelectedSupplier('');
    setSelectedPurchase('');
    setFormItems([]);
    setReason('');
    setNotes('');
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this return? This will adjust stock and accounts payable.')) return;
    try {
      await purchaseReturnsApi.approve(id);
      fetchReturns();
    } catch (err: any) {
      alert(err.message || 'Failed to approve return');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this return?')) return;
    try {
      await purchaseReturnsApi.delete(id);
      fetchReturns();
    } catch (err: any) {
      alert(err.message || 'Failed to delete return');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      refunded: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      partially_refunded: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const filteredReturns = returns.filter(ret => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        ret.purchaseReturnNumber?.toLowerCase().includes(search) ||
        ret.supplier?.name?.toLowerCase().includes(search) ||
        ret.purchase?.purchaseNumber?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const modal = showModal ? (
    <Dialog open={showModal} onOpenChange={(open) => { if (!open) { setShowModal(false); resetForm(); }}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">New Purchase Return</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Supplier *</label>
                <select
                  value={selectedSupplier}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Purchase Order *</label>
                <select
                  value={selectedPurchase}
                  onChange={(e) => handlePurchaseChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={!selectedSupplier}
                >
                  <option value="">Select Purchase Order</option>
                  {purchases.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.purchaseNumber} - {p.supplier?.name} ({p.grandTotal?.toLocaleString()} LBP)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formItems.length > 0 && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Return Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Main Reason</option>
                    <option value="wrong_goods">Wrong Goods</option>
                    <option value="damaged">Damaged</option>
                    <option value="overdelivery">Overdelivery</option>
                    <option value="wrong_specifications">Wrong Specifications</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Items to Return</label>
                  {/* Desktop table view */}
                  <div className="hidden md:block border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Product</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Ordered</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Unit Price</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Return Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Reason</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {formItems.map((item, index) => (
                          <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                              {item.product?.name || item.product}
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-gray-900 dark:text-white">{item.quantity}</td>
                            <td className="px-3 py-2 text-sm text-right text-gray-900 dark:text-white">{item.unitPrice?.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={item.returnQuantity || ''}
                                onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={item.returnReason || ''}
                                onChange={(e) => handleItemReasonChange(index, e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                <option value="">Select</option>
                                <option value="wrong_goods">Wrong Goods</option>
                                <option value="damaged">Damaged</option>
                                <option value="overdelivery">Overdelivery</option>
                                <option value="wrong_specifications">Wrong Specs</option>
                                <option value="other">Other</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-gray-900 dark:text-white">
                              {((item.returnQuantity || 0) * item.unitPrice).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile card view */}
                  <div className="md:hidden space-y-3">
                    {formItems.map((item, index) => (
                      <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">{item.product?.name || item.product}</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {((item.returnQuantity || 0) * item.unitPrice).toLocaleString()} LBP
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <div>Ordered: {item.quantity}</div>
                          <div>Unit: {item.unitPrice?.toLocaleString()} LBP</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Return Qty</label>
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={item.returnQuantity || ''}
                              onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Reason</label>
                            <select
                              value={item.returnReason || ''}
                              onChange={(e) => handleItemReasonChange(index, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="">Select</option>
                              <option value="wrong_goods">Wrong Goods</option>
                              <option value="damaged">Damaged</option>
                              <option value="overdelivery">Overdelivery</option>
                              <option value="wrong_specifications">Wrong Specs</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reduceAP}
                      onChange={(e) => setReduceAP(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Reduce Accounts Payable
                    </span>
                  </label>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1 ml-6">
                    If the original purchase is unpaid, reducing AP will decrease the amount owed to the supplier.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Subtotal (ex. VAT):</span>
                    <span>{calculateTotal().toLocaleString()} LBP</span>
                  </div>
                  {calculateVAT() > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>VAT Return:</span>
                      <span>{calculateVAT().toLocaleString()} LBP</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                    <span>Grand Total:</span>
                    <span>{(calculateTotal() + calculateVAT()).toLocaleString()} LBP</span>
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
              >
                Create Return
              </button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null;

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Returns</h1>
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full sm:w-auto"
          >
            + New Purchase Return
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search returns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="refunded">Refunded</option>
            <option value="partially_refunded">Partially Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Return #</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Supplier</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Ref PO</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">Items</th>
                  <th className="px-2 md:px-4 py-3 text-right text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Total</th>
                  <th className="px-2 md:px-4 py-3 text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-2 md:px-4 py-3 text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No purchase returns found
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret) => (
                    <tr key={ret._id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-2 md:px-4 py-3 text-sm text-gray-900 dark:text-white">{ret.purchaseReturnNumber}</td>
                      <td className="px-2 md:px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-2 md:px-4 py-3 text-sm text-gray-900 dark:text-white">{ret.supplier?.name}</td>
                      <td className="px-2 md:px-4 py-3 text-sm text-gray-900 dark:text-white hidden lg:table-cell">{ret.purchase?.purchaseNumber || '-'}</td>
                      <td className="px-2 md:px-4 py-3 text-sm text-gray-900 dark:text-white hidden md:table-cell">{ret.items?.length || 0}</td>
                      <td className="px-2 md:px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                        {ret.grandTotal?.toLocaleString()} LBP
                      </td>
                      <td className="px-2 md:px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(ret.status)}`}>
                          {ret.status}
                        </span>
                      </td>
                      <td className="px-2 md:px-4 py-3 text-center">
                        <div className="flex justify-center gap-1 md:gap-2">
                          {ret.status === 'draft' && (
                            <button
                              onClick={() => handleApprove(ret._id)}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Approve
                            </button>
                          )}
                          {(ret.status === 'draft' || ret.status === 'pending') && (
                            <button
                              onClick={() => handleDelete(ret._id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal}
    </Layout>
  );
}
