import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { creditNotesApi, invoicesApi } from '@/lib/api';
import { FileText, Plus, Search, X, Loader2, RefreshCcw, CheckCircle, DollarSign, ArrowLeftRight } from 'lucide-react';

interface CreditNote {
  _id: string;
  creditNoteNumber: string;
  invoice: {
    _id: string;
    invoiceNumber: string;
  };

  client: {
    _id: string;
    name: string;
  };
  items: Array<{
    product?: string;
    itemCode?: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxAmount: number;
    totalWithTax: number;
  }>;
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  status: 'draft' | 'approved' | 'refunded' | 'partially_refunded' | 'cancelled';
  amountRefunded: number;
  stockReversed: boolean;
  createdAt: string;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number, currency: string = 'RWF'): string {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: currency }).format(value);
}

export default function CreditNotesPage() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<{ invoice: string; items: any[]; reason?: string; notes?: string }>({ invoice: '', items: [], reason: 'returned', notes: '' });
  const [invoiceDetails, setInvoiceDetails] = useState<any | null>(null);
  const [itemsState, setItemsState] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nRes, iRes] = await Promise.all([creditNotesApi.getAll(), invoicesApi.getAll({ limit: 100 })]);
      if (nRes.success) setNotes((nRes as any).data || []);
      if (iRes.success) setInvoices((iRes as any).data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleInvoiceSelect = async (invoiceId: string) => {
    setForm({ ...form, invoice: invoiceId });
    setInvoiceDetails(null);
    setItemsState([]);
    if (!invoiceId) return;
    try {
      const res = await invoicesApi.getById(invoiceId);
      if (res && (res as any).success) {
        const inv = (res as any).data;
        setInvoiceDetails(inv);
        const mapped = (inv.items || []).map((it: any) => ({
          product: it.product,
          itemCode: it.itemCode,
          description: it.description,
          unitPrice: it.unitPrice,
          maxQty: it.quantity,
          qty: 0,
          checked: false,
          taxRate: it.taxRate || 0,
          taxAmount: it.taxAmount || 0,
          subtotal: it.subtotal || 0,
          totalWithTax: it.totalWithTax || 0
        }));
        setItemsState(mapped);
      }
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate at least one item selected
    const selected = itemsState.filter(it => it.checked && it.qty > 0);
    if (selected.length === 0) {
      alert('Please select at least one item to credit');
      return;
    }

    const payloadItems = selected.map(it => ({
      product: it.product,
      itemCode: it.itemCode,
      description: it.description,
      quantity: it.qty,
      unitPrice: it.unitPrice,
      taxRate: it.taxRate || 0,
      discount: 0
    }));

    const payload: any = {
      invoice: form.invoice,
      reason: form.reason,
      notes: form.notes,
      items: payloadItems
    };

    setSubmitting(true);
    try {
      await creditNotesApi.create(payload);
      setShowForm(false);
      setForm({ invoice: '', items: [], reason: 'returned', notes: '' });
      setItemsState([]);
      setInvoiceDetails(null);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (id: string) => {
    console.log('approve clicked for', id);
    if (!confirm('Approve this credit note? This will adjust the client balance.')) return;
    try {
      const res = await creditNotesApi.approve(id, { reverseStock: true });
      console.log('approve response', res);
      if ((res as any)?.success) {
        fetchData();
        alert('Credit note approved');
      } else {
        console.error('Approve failed', res);
        alert('Approve failed: ' + ((res as any)?.message || 'Unknown error'));
      }
    } catch (err: any) { console.error('Approve error', err); alert('Approve error: ' + (err?.message || err)); }
  };

  const handleRefund = async (id: string) => {
    const amountStr = prompt('Refund amount');
    const amount = Number(amountStr);
    if (!amount || amount <= 0) return;
    const method = prompt('Payment method (cash, card, bank_transfer, cheque, mobile_money)', 'bank_transfer');
    if (!method) return;
    try {
      await creditNotesApi.refund(id, { amount, paymentMethod: method });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'refunded':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'partially_refunded':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    }
  };

  const filteredNotes = notes.filter(n => 
    n.creditNoteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.invoice?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Credit Notes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Manage returns and refunds</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowForm(true)} 
              className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg flex-1 sm:flex-none text-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Credit Note</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 md:mb-6">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search credit notes..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">
            <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p>No credit notes found</p>
            <button onClick={() => setShowForm(true)} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline">Create your first credit note</button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Number</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Invoice</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Client</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Amount</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Refunded</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Stock</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Date</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredNotes.map((note) => (
                    <tr key={note._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 text-sm font-medium text-slate-800 dark:text-white">{note.creditNoteNumber}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{note.invoice?.invoiceNumber || '-'}</td>
                      <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{note.client?.name || '-'}</td>
                      <td className="p-4 text-sm text-right font-medium text-slate-800 dark:text-white">
                        {formatCurrency(note.grandTotal)}
                      </td>
                      <td className="p-4 text-sm text-right text-slate-600 dark:text-slate-300">
                        {note.amountRefunded > 0 ? formatCurrency(note.amountRefunded) : '-'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>
                          {note.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {note.stockReversed ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatDate(note.createdAt)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {note.status === 'draft' && (
                            <button 
                              onClick={() => handleApprove(note._id)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-green-600 dark:text-green-400"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          {(note.status === 'approved' || note.status === 'partially_refunded') && note.amountRefunded < note.grandTotal && (
                            <button 
                              onClick={() => handleRefund(note._id)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-blue-600 dark:text-blue-400"
                              title="Refund"
                            >
                              <DollarSign className="h-4 w-4" />
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

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">New Credit Note</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <X className="h-5 w-5 dark:text-slate-300" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Invoice *</label>
                  <select 
                    value={form.invoice} 
                    onChange={e => handleInvoiceSelect(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    required
                  >
                    <option value="">Select Invoice</option>
                    {invoices.map((inv: any) => (
                      <option key={inv._id} value={inv._id}>
                        {inv.invoiceNumber} - {inv.client?.name || 'Unknown Client'} ({formatCurrency(inv.grandTotal || 0)})
                      </option>
                    ))}
                  </select>
                  {invoiceDetails && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Client: {invoiceDetails.client?.name || '-'} — Invoice Total: {formatCurrency(invoiceDetails.grandTotal || 0)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Reason *</label>
                  <select
                    value={form.reason}
                    onChange={e => setForm({...form, reason: e.target.value})}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    required
                  >
                    <option value="returned">Goods Returned</option>
                    <option value="damaged">Damaged</option>
                    <option value="overcharge">Overcharge</option>
                    <option value="discount">Discount</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Items to Credit</label>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                          <th className="p-2 text-left">&nbsp;</th>
                          <th className="p-2 text-left">Product</th>
                          <th className="p-2 text-right">Max Qty</th>
                          <th className="p-2 text-right">Credit Qty</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsState.length === 0 ? (
                          <tr><td colSpan={5} className="p-4 text-slate-500">Select an invoice to load items</td></tr>
                        ) : (
                          itemsState.map((it, idx) => {
                            const unitTotalWithTax = (it.totalWithTax && it.maxQty) ? (it.totalWithTax / it.maxQty) : (it.unitPrice || 0);
                            const amount = it.checked && it.qty > 0 ? unitTotalWithTax * it.qty : null;
                            return (
                              <tr key={idx} className="border-t border-slate-100 dark:border-slate-700">
                                <td className="p-2">
                                  <input type="checkbox" checked={!!it.checked} onChange={(e) => {
                                    const next = [...itemsState];
                                    next[idx] = { ...next[idx], checked: e.target.checked, qty: e.target.checked ? next[idx].maxQty : 0 };
                                    setItemsState(next);
                                  }} />
                                </td>
                                <td className="p-2">{it.description || it.itemCode || '—'}</td>
                                <td className="p-2 text-right">{it.maxQty ?? '-'}</td>
                                <td className="p-2 text-right">
                                  <input
                                    type="number"
                                    min={0}
                                    max={it.maxQty || 0}
                                    value={it.qty ?? ''}
                                    disabled={!it.checked}
                                    onChange={(e) => {
                                      const val = Number(e.target.value || 0);
                                      const next = [...itemsState];
                                      next[idx] = { ...next[idx], qty: Math.max(0, Math.min(isNaN(val) ? 0 : val, next[idx].maxQty || 0)) };
                                      setItemsState(next);
                                    }}
                                    className="w-20 p-1 text-right border rounded text-sm dark:bg-slate-700 dark:border-slate-600"
                                  />
                                </td>
                                <td className="p-2 text-right">{amount == null ? '-' : formatCurrency(amount)}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes (optional)</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg h-20 text-sm"
                    placeholder="Client returned damaged units from delivery..."
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div />
                  <div className="text-right">
                    {/* Totals */}
                    {(() => {
                      const totals = itemsState.reduce((acc, it) => {
                        if (it.checked && it.qty > 0) {
                          const unitSubtotal = (it.unitPrice || 0);
                          const subtotal = unitSubtotal * it.qty;
                          const taxRate = (it.taxRate || 0) / 100;
                          const tax = subtotal * taxRate;
                          acc.subtotal += subtotal;
                          acc.tax += tax;
                          acc.grand += subtotal + tax;
                        }
                        return acc;
                      }, { subtotal: 0, tax: 0, grand: 0 });

                      return (
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-sm">
                          <div className="flex justify-between"><div className="text-slate-600">Subtotal</div><div className="font-medium">{formatCurrency(totals.subtotal)}</div></div>
                          <div className="flex justify-between"><div className="text-slate-600">Tax</div><div className="font-medium">{formatCurrency(totals.tax)}</div></div>
                          <div className="flex justify-between pt-1 text-lg"><div className="font-semibold">Total Credit</div><div className="font-semibold">{formatCurrency(totals.grand)}</div></div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)} 
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create'}
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
