import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { deliveryNotesApi, quotationsApi, clientsApi, productsApi } from '@/lib/api';
import { Truck, Plus, Search, Eye, FileDown, Loader2, Clock, CheckCircle, X, FileText, Check, Trash2, Send, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  _id: string;
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  averageCost?: number;
  sellingPrice?: number;
}

interface DeliveryNoteItem {
  _id: string;
  product: { _id: string; name: string; sku: string };
  productName: string;
  itemCode: string;
  unit: string;
  orderedQty: number;
  deliveredQty: number;
  pendingQty: number;
  notes?: string;
}

interface DeliveryNote {
  _id: string;
  deliveryNumber: string;
  client: { _id: string; name: string; taxId?: string };
  quotation?: { _id: string; quotationNumber: string };
  invoice?: { _id: string; invoiceNumber: string };
  deliveryDate: string;
  expectedDate?: string;
  deliveredBy?: string;
  vehicle?: string;
  deliveryAddress?: string;
  items: DeliveryNoteItem[];
  status: 'draft' | 'dispatched' | 'delivered' | 'partial' | 'failed' | 'cancelled';
  receivedBy?: string;
  receivedDate?: string;
  clientSignature?: string;
  clientStamp?: boolean;
  notes?: string;
  stockDeducted: boolean;
  createdAt: string;
  createdBy: { _id: string; name: string };
  confirmedBy?: { _id: string; name: string };
  confirmedDate?: string;
}

interface Quotation {
  _id: string;
  quotationNumber: string;
  client: { _id: string; name: string };
  status: string;
  items: Array<{
    product: { _id: string; name: string; sku: string };
    quantity: number;
    unit: string;
  }>;
}

interface Client {
  _id: string;
  name: string;
  code?: string;
  taxId?: string;
  contact?: { address?: string };
}

interface FormItem {
  id: string;
  product: string;
  productName: string;
  itemCode: string;
  unit: string;
  orderedQty: number;
  deliveredQty: number;
  pendingQty: number;
  notes: string;
}

export default function DeliveryNotesPage() {
  const { hasPermission } = useAuth();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<DeliveryNote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formQuotation, setFormQuotation] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formDeliveryAddress, setFormDeliveryAddress] = useState('');
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [formNotes, setFormNotes] = useState('');

  // Dispatch form
  const [dispatchDeliveredBy, setDispatchDeliveredBy] = useState('');
  const [dispatchVehicle, setDispatchVehicle] = useState('');
  const [dispatchDeliveryDate, setDispatchDeliveryDate] = useState('');

  // Confirm form
  const [confirmReceivedBy, setConfirmReceivedBy] = useState('');
  const [confirmReceivedDate, setConfirmReceivedDate] = useState('');
  const [confirmClientStamp, setConfirmClientStamp] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [notesRes, quotationsRes, clientsRes, productsRes] = await Promise.all([
        deliveryNotesApi.getAll(),
        quotationsApi.getAll({ status: 'approved' }),
        clientsApi.getAll(),
        productsApi.getAll({ limit: 500 })
      ]);
      
      console.log('=== Delivery Notes Page Debug ===');
      console.log('productsRes:', productsRes);
      console.log('productsRes.success:', productsRes.success);
      console.log('productsRes.data:', productsRes.data);
      
      if (notesRes.success) {
        const data = notesRes as { data: DeliveryNote[] };
        setDeliveryNotes(data.data || []);
      }
      if (quotationsRes.success) {
        const data = quotationsRes as { data: Quotation[] };
        setQuotations(data.data || []);
      }
      if (clientsRes.success) {
        const data = clientsRes as { data: Client[] };
        setClients(data.data || []);
      }
      if (productsRes.success) {
        const data = productsRes as { data: Product[] };
        const productsList = data.data || [];
        console.log('Setting products:', productsList.length);
        setProducts(productsList);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = deliveryNotes.filter(n => 
    n.deliveryNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.quotation?.quotationNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'partial': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'dispatched': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'draft': return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
      case 'cancelled': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'failed': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default: return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  const viewNote = (note: DeliveryNote) => {
    setSelectedNote(note);
    setShowViewModal(true);
  };

  const openCreateModal = () => {
    setFormQuotation('');
    setFormClient('');
    setFormDeliveryAddress('');
    setFormItems([]);
    setFormNotes('');
    setShowModal(true);
  };

  const onQuotationChange = async (quotationId: string) => {
    setFormQuotation(quotationId);
    
    if (quotationId) {
      const quotation = quotations.find(q => q._id === quotationId);
      if (quotation) {
        setFormClient(quotation.client._id);
        
        // Get client details
        const client = clients.find(c => c._id === quotation.client._id);
        if (client) {
          setFormDeliveryAddress(client.contact?.address || '');
        }

        // Map quotation items to delivery note items
        setFormItems(quotation.items.map((item, idx) => ({
          id: `item-${idx}`,
          product: item.product._id,
          productName: item.product.name,
          itemCode: item.product.sku,
          unit: item.unit || '',
          orderedQty: item.quantity,
          deliveredQty: 0,
          pendingQty: item.quantity,
          notes: ''
        })));
      }
    } else {
      setFormClient('');
      setFormDeliveryAddress('');
      setFormItems([]);
    }
  };

  const updateFormItem = (id: string, field: keyof FormItem, value: string | number) => {
    setFormItems(formItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'deliveredQty') {
          updated.pendingQty = updated.orderedQty - (value as number);
        }
        return updated;
      }
      return item;
    }));
  };

  const addItem = () => {
    setFormItems([...formItems, { 
      id: `item-${Date.now()}`, 
      product: '', 
      productName: '', 
      itemCode: '', 
      unit: '', 
      orderedQty: 0, 
      deliveredQty: 0, 
      pendingQty: 0, 
      notes: '' 
    }]);
  };

  const removeItem = (id: string) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter(item => item.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formClient) {
      setError('Please select a client');
      return;
    }

    if (formItems.length === 0) {
      setError('Please add at least one item');
      return;
    }

    // Validate items have required fields
    const invalidItems = formItems.filter(item => !item.productName || item.orderedQty <= 0);
    if (invalidItems.length > 0) {
      setError('Please fill in all item details (product name and quantity are required)');
      return;
    }

    setSubmitting(true);
    
    const noteData = {
      quotation: formQuotation || undefined,
      client: formClient,
      deliveryAddress: formDeliveryAddress,
      items: formItems.map(item => ({
        product: item.product,
        productName: item.productName,
        itemCode: item.itemCode,
        unit: item.unit,
        orderedQty: item.orderedQty,
        deliveredQty: item.deliveredQty,
        pendingQty: item.pendingQty,
        notes: item.notes
      })),
      notes: formNotes
    };

    try {
      await deliveryNotesApi.create(noteData);
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err instanceof Error ? err.message : 'Failed to save delivery note');
    } finally {
      setSubmitting(false);
    }
  };

  const openDispatchModal = (note: DeliveryNote) => {
    setSelectedNote(note);
    setDispatchDeliveredBy(note.deliveredBy || '');
    setDispatchVehicle(note.vehicle || '');
    setDispatchDeliveryDate(note.deliveryDate ? new Date(note.deliveryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setShowDispatchModal(true);
  };

  const handleDispatch = async () => {
    if (!selectedNote) return;
    
    setSubmitting(true);
    try {
      await deliveryNotesApi.dispatch(selectedNote._id, {
        deliveredBy: dispatchDeliveredBy,
        vehicle: dispatchVehicle,
        deliveryDate: dispatchDeliveryDate
      });
      setShowDispatchModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to dispatch:', err);
      setError('Failed to dispatch delivery note');
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirmModal = (note: DeliveryNote) => {
    setSelectedNote(note);
    setConfirmReceivedBy(note.receivedBy || '');
    setConfirmReceivedDate(note.receivedDate ? new Date(note.receivedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setConfirmClientStamp(note.clientStamp || false);
    setConfirmNotes(note.notes || '');
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedNote) return;
    
    setSubmitting(true);
    try {
      await deliveryNotesApi.confirm(selectedNote._id, {
        receivedBy: confirmReceivedBy,
        receivedDate: confirmReceivedDate,
        clientStamp: confirmClientStamp,
        notes: confirmNotes
      });
      setShowConfirmModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to confirm:', err);
      setError('Failed to confirm delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async (id: string) => {
    if (!confirm('Create invoice from this delivery note? Invoice will be based on delivered quantities.')) return;
    
    try {
      setActionLoading(id);
      await deliveryNotesApi.createInvoice(id, {
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentTerms: 'credit_30'
      });
      alert('Invoice created successfully!');
      fetchData();
    } catch (err) {
      console.error('Failed to create invoice:', err);
      setError('Failed to create invoice. Only confirmed delivery notes can be converted.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this delivery note? This action cannot be undone.')) return;
    try {
      setActionLoading(id);
      await deliveryNotesApi.delete(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Failed to delete delivery note');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = async (id: string, filename?: string) => {
    try {
      setActionLoading(id);
      const blob = await deliveryNotesApi.getPDF(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `delivery-note-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      setError('Failed to download PDF');
    } finally {
      setActionLoading(null);
    }
  };

  const getActionButtons = (note: DeliveryNote) => {
    const buttons = [];
    const isLoading = actionLoading === note._id;
    
    if (note.status === 'draft') {
      buttons.push(
        <button key="dispatch" onClick={() => openDispatchModal(note)} disabled={isLoading} className="p-2 text-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Dispatch (Goods leave warehouse)">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      );
    }
    
    if (note.status === 'dispatched') {
      buttons.push(
        <button key="confirm" onClick={() => openConfirmModal(note)} disabled={isLoading} className="p-2 text-green-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Confirm Delivery">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
        </button>
      );
    }
    
    if (['delivered', 'partial'].includes(note.status) && !note.invoice) {
      buttons.push(
        <button key="invoice" onClick={() => handleCreateInvoice(note._id)} disabled={isLoading} className="p-2 text-purple-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg" title="Create Invoice">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        </button>
      );
    }
    
    return buttons;
  };

  // Stats
  const draftCount = deliveryNotes.filter(n => n.status === 'draft').length;
  const dispatchedCount = deliveryNotes.filter(n => n.status === 'dispatched').length;
  const deliveredCount = deliveryNotes.filter(n => ['delivered', 'partial'].includes(n.status)).length;
  const totalDelivered = deliveryNotes.reduce((sum, n) => {
    if (['delivered', 'partial'].includes(n.status)) {
      return sum + n.items.reduce((s, i) => s + i.deliveredQty, 0);
    }
    return sum;
  }, 0);

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Notes de Livraison</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Manage delivery notes (NDL)</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Create Delivery Note
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Truck className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Total NDL</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{deliveryNotes.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30"><Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 dark:text-yellow-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Pending</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{draftCount + dispatchedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Delivered</p>
                <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400 truncate">{deliveredCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-lg bg-slate-100 dark:bg-slate-700"><Package className="h-4 w-4 md:h-5 md:w-5 text-slate-600 dark:text-slate-400" /></div>
              <div>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">Items Delivered</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{totalDelivered}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mb-4 md:mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search delivery notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/30 outline-none text-sm" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 md:h-64">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-8 md:p-12 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
            <Truck className="h-8 w-8 md:h-12 md:w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No delivery notes found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">NDL #</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Client</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Ref (QUO)</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Date</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Items</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredNotes.map((note) => (
                    <tr key={note._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{note.deliveryNumber}</td>
                      <td className="px-6 py-4 text-sm text-slate-800 dark:text-white">{note.client?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{note.quotation?.quotationNumber || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{note.deliveryDate ? new Date(note.deliveryDate).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 text-center">
                        {note.items?.filter(i => i.deliveredQty > 0).length}/{note.items?.length || 0}
                      </td>
                      <td className="px-6 py-4 text-center"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(note.status)}`}>{note.status}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => viewNote(note)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg" title="View"><Eye className="h-4 w-4" /></button>
                          {getActionButtons(note)}
                          <button onClick={() => handleDownload(note._id, `delivery-note-${note.deliveryNumber || note._id}.pdf`)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" title="Download PDF">
                            {actionLoading === note._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                          </button>
                          {note.status === 'draft' && (
                            <button onClick={() => handleDelete(note._id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                              <Trash2 className="h-4 w-4" />
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

        {/* View Modal */}
        {showViewModal && selectedNote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold dark:text-white">Delivery Note Details</h2>
                <button onClick={() => { setShowViewModal(false); setSelectedNote(null); }} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Delivery Note Number</p>
                    <p className="font-semibold dark:text-white">{selectedNote.deliveryNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedNote.status)}`}>{selectedNote.status}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Client</p>
                    <p className="font-semibold dark:text-white">{selectedNote.client?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Client TIN</p>
                    <p className="font-semibold dark:text-white">{selectedNote.client?.taxId || 'N/A'}</p>
                  </div>
                  {selectedNote.quotation && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Quotation Reference</p>
                      <p className="font-semibold dark:text-white">{selectedNote.quotation.quotationNumber}</p>
                    </div>
                  )}
                  {selectedNote.invoice && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Invoice</p>
                      <p className="font-semibold dark:text-white text-indigo-600">{selectedNote.invoice.invoiceNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Delivery Date</p>
                    <p className="font-semibold dark:text-white">{selectedNote.deliveryDate ? new Date(selectedNote.deliveryDate).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Stock Deducted</p>
                    <p className="font-semibold dark:text-white">{selectedNote.stockDeducted ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                
                <h3 className="font-semibold mb-3 dark:text-white">Items Delivered</h3>
                <table className="w-full mb-6">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="text-left p-2 text-xs font-semibold dark:text-slate-300">No.</th>
                      <th className="text-left p-2 text-xs font-semibold dark:text-slate-300">Product</th>
                      <th className="text-center p-2 text-xs font-semibold dark:text-slate-300">Unit</th>
                      <th className="text-right p-2 text-xs font-semibold dark:text-slate-300">Ordered</th>
                      <th className="text-right p-2 text-xs font-semibold dark:text-slate-300">Delivered</th>
                      <th className="text-right p-2 text-xs font-semibold dark:text-slate-300">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNote.items?.map((item, index) => (
                      <tr key={index} className="border-b border-slate-200 dark:border-slate-700">
                        <td className="p-2 text-sm dark:text-slate-300">{index + 1}</td>
                        <td className="p-2 text-sm dark:text-slate-300">{item.productName}</td>
                        <td className="p-2 text-sm dark:text-slate-300 text-center">{item.unit}</td>
                        <td className="p-2 text-sm dark:text-slate-300 text-right">{item.orderedQty}</td>
                        <td className="p-2 text-sm dark:text-white text-right font-medium">{item.deliveredQty}</td>
                        <td className="p-2 text-sm dark:text-slate-300 text-right">{item.pendingQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {selectedNote.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Notes</p>
                    <p className="text-sm dark:text-slate-300">{selectedNote.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">Create Delivery Note</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="h-5 w-5 dark:text-slate-300" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">From Quotation (Optional)</label>
                    <select value={formQuotation} onChange={(e) => onQuotationChange(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                      <option value="">Select quotation (optional)</option>
                      {quotations.map(q => <option key={q._id} value={q._id}>{q.quotationNumber} - {q.client.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Client *</label>
                    <select value={formClient} onChange={(e) => setFormClient(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                      <option value="">Select client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Delivery Address</label>
                    <input type="text" value={formDeliveryAddress} onChange={(e) => setFormDeliveryAddress(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>

                <h3 className="font-semibold mb-3 dark:text-white flex items-center justify-between">
                  <span>Items</span>
                  <button type="button" onClick={addItem} className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50">
                    <Plus className="h-4 w-4" /> Add Item
                  </button>
                </h3>
                <div className="space-y-3 mb-6">
                  {formItems.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <Package className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-slate-500 dark:text-slate-400 mb-3">No items added yet</p>
                      <button type="button" onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 mx-auto">
                        <Plus className="h-4 w-4" /> Add First Item
                      </button>
                    </div>
                  ) : (
                    <>
                      {formItems.map((item) => (
                        <div key={item.id} className="flex gap-2 items-end bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                          <div className="flex-1">
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Product *</label>
                            {formQuotation ? (
                              <div className="p-2 bg-white dark:bg-slate-800 rounded text-sm dark:text-white">{item.productName}</div>
                            ) : (
                              <select
                                value={item.product}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const selectedProduct = products.find(p => p._id === val);
                                  if (selectedProduct) {
                                    setFormItems(prev => prev.map(it => it.id === item.id ? ({
                                      ...it,
                                      product: selectedProduct._id,
                                      productName: selectedProduct.name,
                                      itemCode: selectedProduct.sku,
                                      unit: selectedProduct.unit || '',
                                      orderedQty: 1,
                                      deliveredQty: 1,
                                      pendingQty: 0
                                    }) : it));
                                  }
                                }}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm"
                                required
                              >
                                <option value="">Select product</option>
                                {products.length === 0 ? (
                                  <option disabled>No products available - check console</option>
                                ) : (
                                  products.map(p => (
                                    <option key={p._id} value={p._id}>
                                      {p.name} ({p.sku}) - Stock: {p.currentStock || 0}
                                    </option>
                                  ))
                                )}
                              </select>
                            )}
                          </div>
                          <div className="w-20">
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Unit</label>
                            {formQuotation ? (
                              <div className="p-2 bg-white dark:bg-slate-800 rounded text-sm dark:text-white">{item.unit}</div>
                            ) : (
                              <div className="p-2 bg-white dark:bg-slate-800 rounded text-sm dark:text-white">{item.unit || '-'}</div>
                            )}
                          </div>
                          <div className="w-20">
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Ordered</label>
                            {formQuotation ? (
                              <div className="p-2 bg-white dark:bg-slate-800 rounded text-sm dark:text-white text-right">{item.orderedQty}</div>
                            ) : (
                              <input type="number" min="1" value={item.orderedQty} onChange={(e) => updateFormItem(item.id, 'orderedQty', parseInt(e.target.value) || 0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm text-right" required />
                            )}
                          </div>
                          <div className="w-24">
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Delivered *</label>
                            <input type="number" min="0" max={item.orderedQty} value={item.deliveredQty} onChange={(e) => updateFormItem(item.id, 'deliveredQty', parseInt(e.target.value) || 0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" required />
                          </div>
                          <div className="w-20">
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Pending</label>
                            <div className="p-2 bg-white dark:bg-slate-800 rounded text-sm dark:text-white text-right">{item.pendingQty}</div>
                          </div>
                          <button type="button" onClick={() => removeItem(item.id)} disabled={formItems.length === 1 && !formQuotation} className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {!formQuotation && (
                        <button type="button" onClick={addItem} className="flex items-center gap-1 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg">
                          <Plus className="h-4 w-4" /> Add Another Item
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes</label>
                  <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" />
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Delivery Note
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Dispatch Modal */}
        {showDispatchModal && selectedNote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold dark:text-white">Dispatch Delivery Note</h2>
                <button onClick={() => setShowDispatchModal(false)} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Goods are about to leave your warehouse. This will reserve stock.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Driver Name</label>
                    <input type="text" value={dispatchDeliveredBy} onChange={(e) => setDispatchDeliveredBy(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Vehicle</label>
                    <input type="text" value={dispatchVehicle} onChange={(e) => setDispatchVehicle(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Delivery Date</label>
                    <input type="date" value={dispatchDeliveryDate} onChange={(e) => setDispatchDeliveryDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowDispatchModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                  <button onClick={handleDispatch} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Dispatch
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Modal */}
        {showConfirmModal && selectedNote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold dark:text-white">Confirm Delivery</h2>
                <button onClick={() => setShowConfirmModal(false)} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Confirm that goods have been received by the client. Stock will be permanently deducted.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Received By (Client Name)</label>
                    <input type="text" value={confirmReceivedBy} onChange={(e) => setConfirmReceivedBy(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Received Date</label>
                    <input type="date" value={confirmReceivedDate} onChange={(e) => setConfirmReceivedDate(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="clientStamp" checked={confirmClientStamp} onChange={(e) => setConfirmClientStamp(e.target.checked)} className="rounded" />
                    <label htmlFor="clientStamp" className="text-sm dark:text-slate-300">Client has stamped the delivery note</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes</label>
                    <textarea value={confirmNotes} onChange={(e) => setConfirmNotes(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
                  <button onClick={handleConfirm} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm Delivery
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
