import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { recurringApi, clientsApi, productsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Repeat, Plus, Search, Edit, Trash2, X, Loader2, Play, MoreHorizontal, Calendar, Clock } from 'lucide-react';

interface RecurringItem {
  product?: string;
  description: string;
  itemCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  taxCode: string;
  taxRate: number;
}

interface RecurringInvoice {
  _id: string;
  name: string;
  client: {
    _id: string;
    name: string;
  };
  items: RecurringItem[];
  schedule: {
    frequency: 'weekly' | 'monthly' | 'quarterly';
    interval: number;
    dayOfMonth?: number;
    dayOfWeek?: number;
  };
  startDate: string;
  endDate?: string;
  nextRunDate?: string;
  active: boolean;
  autoConfirm: boolean;
  createdBy: {
    _id: string;
    name: string;
  };
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF' }).format(value);
}

export default function RecurringInvoicesPage() {
  const { hasPermission } = useAuth();
  const [templates, setTemplates] = useState<RecurringInvoice[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringInvoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formFrequency, setFormFrequency] = useState<'weekly' | 'monthly' | 'quarterly'>('monthly');
  const [formInterval, setFormInterval] = useState(1);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDueDays, setFormDueDays] = useState<number>(0);
  const [formNotes, setFormNotes] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formAutoConfirm, setFormAutoConfirm] = useState(false);
  const [formItems, setFormItems] = useState<RecurringItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [previewDates, setPreviewDates] = useState<string[]>([]);

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState<RecurringItem>({
    description: '',
    itemCode: '',
    quantity: 1,
    unit: 'pcs',
    unitPrice: 0,
    discount: 0,
    taxCode: 'A',
    taxRate: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleClick = () => setShowActionsMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([recurringApi.getAll(), clientsApi.getAll({ limit: 100 })]);
      if (tRes.success) setTemplates((tRes as any).data || []);
      if (cRes.success) setClients((cRes as any).data || []);
      try {
        const pRes = await (await import('@/lib/api')).productsApi.getAll({ limit: 200 });
        if (pRes.success) setProducts((pRes as any).data || []);
      } catch (err) { /* ignore products load error */ }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  // compute preview run dates
  useEffect(() => {
    if (!formStartDate) { setPreviewDates([]); return; }
    const count = 3;
    const dates: string[] = [];
    let dt = new Date(formStartDate);
    for (let i=0;i<count;i++){
      dates.push(dt.toISOString());
      if (formFrequency === 'weekly') dt = new Date(dt.getTime() + 7 * 24 * 60 * 60 * 1000 * formInterval);
      else if (formFrequency === 'monthly') dt = new Date(dt.getFullYear(), dt.getMonth() + formInterval, dt.getDate());
      else if (formFrequency === 'quarterly') dt = new Date(dt.getFullYear(), dt.getMonth() + 3 * formInterval, dt.getDate());
    }
    setPreviewDates(dates);
  }, [formStartDate, formFrequency, formInterval]);

  const openModal = (template?: RecurringInvoice) => {
    if (template) {
      setEditingTemplate(template);
      setFormName(template.name);
      setFormClient(typeof template.client === 'object' ? template.client?._id || '' : template.client as string);
      setFormFrequency(template.schedule?.frequency || 'monthly');
      setFormInterval(template.schedule?.interval || 1);
      setFormStartDate(template.startDate ? template.startDate.split('T')[0] : '');
      setFormEndDate(template.endDate ? template.endDate.split('T')[0] : '');
      setFormDueDays((template as any).dueDays || 0);
      setFormNotes((template as any).notes || '');
      setFormActive(template.active);
      setFormAutoConfirm(template.autoConfirm);
      setFormItems(template.items || []);
    } else {
      setEditingTemplate(null);
      setFormName('');
      setFormClient('');
      setFormFrequency('monthly');
      setFormInterval(1);
      setFormStartDate(new Date().toISOString().split('T')[0]);
      setFormEndDate('');
      setFormDueDays(0);
      setFormNotes('');
      setFormActive(true);
      setFormAutoConfirm(false);
      setFormItems([]);
    }
    setShowModal(true);
  };

  const handleAddItem = () => {
    setFormItems([...formItems, { ...itemForm }]);
    setItemForm({
      description: '',
      itemCode: '',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      discount: 0,
      taxCode: 'A',
      taxRate: 0
    });
    setShowAddItem(false);
  };

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const templateData = {
      name: formName,
      client: formClient,
      schedule: {
        frequency: formFrequency,
        interval: formInterval
      },
      dueDays: formDueDays,
      notes: formNotes,
      startDate: formStartDate,
      endDate: formEndDate || undefined,
      active: formActive,
      autoConfirm: formAutoConfirm,
      items: formItems
    };

    try {
      if (editingTemplate) {
        await recurringApi.update(editingTemplate._id, templateData);
      } else {
        await recurringApi.create(templateData);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await recurringApi.delete(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerNow = async (id: string) => {
    try {
      await (recurringApi as any).triggerTemplate(id);
      alert('Invoice generated successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to generate invoice');
    }
  };

  const toggleActionsMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setShowActionsMenu(showActionsMenu === id ? null : id);
  };

  const filteredTemplates = templates.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Recurring Invoices</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Manage recurring invoice templates</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => recurringApi.trigger()}
              className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex-1 sm:flex-none text-sm bg-white dark:bg-slate-800"
            >
              <Play className="h-4 w-4" /> <span className="hidden sm:inline">Trigger Now</span>
            </button>
            <button 
              onClick={() => openModal()} 
              className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg flex-1 sm:flex-none text-sm"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Template</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 md:mb-6">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search templates..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" 
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">
            <Repeat className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p>No recurring invoice templates found</p>
            <button onClick={() => openModal()} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline">Create your first template</button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Name</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Client</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Frequency</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Items</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Next Run</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredTemplates.map((template) => (
                    <tr key={template._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4 text-sm font-medium text-slate-800 dark:text-white">{template.name}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{template.client?.name || '-'}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300 capitalize">
                        {template.schedule?.frequency}/{template.schedule?.interval}
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{template.items?.length || 0} items</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        {template.nextRunDate ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(template.nextRunDate)}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${template.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                          {template.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 text-center relative">
                        <button
                          onClick={(e) => toggleActionsMenu(e, template._id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        >
                          <MoreHorizontal className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                        </button>
                        
                        {showActionsMenu === template._id && (
                          <div className="absolute right-4 top-10 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg z-10 w-48 py-1">
                            <button 
                              onClick={() => handleTriggerNow(template._id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-slate-300"
                            >
                              <Play className="h-4 w-4" /> Generate Now
                            </button>
                            <button 
                              onClick={() => openModal(template)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 dark:text-slate-300"
                            >
                              <Edit className="h-4 w-4" /> Edit
                            </button>
                            <hr className="my-1 border-slate-200 dark:border-slate-700" />
                            <button 
                              onClick={() => handleDelete(template._id)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">
                  {editingTemplate ? 'Edit Template' : 'New Recurring Template'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <X className="h-5 w-5 dark:text-slate-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Template Name *</label>
                    <input 
                      type="text" 
                      value={formName} 
                      onChange={(e) => setFormName(e.target.value)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Client *</label>
                    <select 
                      value={formClient} 
                      onChange={(e) => setFormClient(e.target.value)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      required
                    >
                      <option value="">Select Client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Frequency</label>
                    <select 
                      value={formFrequency} 
                      onChange={(e) => setFormFrequency(e.target.value as any)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    >
                      {FREQUENCY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Interval ({formFrequency === 'weekly' ? 'week(s)' : formFrequency === 'monthly' ? 'month(s)' : 'quarter(s)'})</label>
                    <input 
                      type="number" 
                      min={1} 
                      value={formInterval} 
                      onChange={(e) => setFormInterval(parseInt(e.target.value) || 1)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Start Date</label>
                    <input 
                      type="date" 
                      value={formStartDate} 
                      onChange={(e) => setFormStartDate(e.target.value)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                    />
                  </div>
                </div>

                {/* Preview of next run dates */}
                {previewDates.length > 0 && (
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    <div className="mt-2 mb-1">Next invoices will be generated:</div>
                    <ul className="list-disc list-inside">
                      {previewDates.map((d, i) => <li key={i}>{formatDate(d)}</li>)}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">End Date (Optional)</label>
                    <input 
                      type="date" 
                      value={formEndDate} 
                      onChange={(e) => setFormEndDate(e.target.value)} 
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Due Days (payment deadline)</label>
                    <input
                      type="number"
                      min={0}
                      value={formDueDays}
                      onChange={(e) => setFormDueDays(parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium dark:text-slate-300">Invoice Items</label>
                    <button 
                      type="button"
                      onClick={() => setShowAddItem(true)}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      + Add Item
                    </button>
                  </div>
                  
                  {formItems.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center text-slate-500 dark:text-slate-400">
                      No items added yet
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="text-left p-2 text-xs font-medium text-slate-600 dark:text-slate-300">Description</th>
                            <th className="text-right p-2 text-xs font-medium text-slate-600 dark:text-slate-300">Qty</th>
                            <th className="text-right p-2 text-xs font-medium text-slate-600 dark:text-slate-300">Price</th>
                            <th className="text-right p-2 text-xs font-medium text-slate-600 dark:text-slate-300">Total</th>
                            <th className="p-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {formItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="p-2 text-sm text-slate-700 dark:text-slate-300">{item.description || item.itemCode}</td>
                              <td className="p-2 text-sm text-right text-slate-700 dark:text-slate-300">{item.quantity}</td>
                              <td className="p-2 text-sm text-right text-slate-700 dark:text-slate-300">{formatCurrency(item.unitPrice)}</td>
                              <td className="p-2 text-sm text-right text-slate-700 dark:text-slate-300 font-medium">
                                {formatCurrency(item.quantity * item.unitPrice * (1 - item.discount / 100))}
                              </td>
                              <td className="p-2 text-right">
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Add Item Form */}
                {showAddItem && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg space-y-3">
                    <h4 className="text-sm font-medium dark:text-slate-300">Add New Item</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <select
                          value={(itemForm as any).productId || ''}
                          onChange={(e) => {
                            const prod = products.find(p => p._id === e.target.value);
                            if (prod) {
                              setItemForm({
                                ...itemForm,
                                description: prod.name,
                                itemCode: prod.sku,
                                unit: prod.unit || 'pcs',
                                unitPrice: (prod as any).unitPrice || 0,
                                // attach product id for later
                                product: prod._id
                              });
                            } else {
                              setItemForm({...itemForm, description: '', itemCode: '', product: undefined});
                            }
                          }}
                          className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                        >
                          <option value="">Select Product</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Item Code"
                        value={itemForm.itemCode} 
                        onChange={(e) => setItemForm({...itemForm, itemCode: e.target.value})}
                        className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                      />
                      <input 
                        type="text" 
                        placeholder="Unit"
                        value={itemForm.unit} 
                        onChange={(e) => setItemForm({...itemForm, unit: e.target.value})}
                        className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                      />
                      <input 
                        type="number" 
                        placeholder="Quantity"
                        min={1}
                        value={itemForm.quantity} 
                        onChange={(e) => setItemForm({...itemForm, quantity: parseInt(e.target.value) || 1})}
                        className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                      />
                      <input 
                        type="number" 
                        placeholder="Unit Price"
                        min={0}
                        value={itemForm.unitPrice} 
                        onChange={(e) => setItemForm({...itemForm, unitPrice: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                      />
                      <input 
                        type="number" 
                        placeholder="Discount %"
                        min={0}
                        max={100}
                        value={itemForm.discount} 
                        onChange={(e) => setItemForm({...itemForm, discount: parseFloat(e.target.value) || 0})}
                        className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                      />
                      <select 
                        value={itemForm.taxCode} 
                        onChange={(e) => setItemForm({...itemForm, taxCode: e.target.value})}
                        className="w-full p-2 text-sm border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      >
                        <option value="A">Tax A</option>
                        <option value="B">Tax B</option>
                        <option value="None">No Tax</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button 
                        type="button" 
                        onClick={() => setShowAddItem(false)}
                        className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button 
                        type="button" 
                        onClick={handleAddItem}
                        className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes / Description */}
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Notes / Description (optional)</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg h-20 text-sm"
                    placeholder="Brief description of this template for identification"
                  />
                </div>

                {/* Active / Auto-confirm moved here for better visibility */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="formActive" 
                      checked={formActive} 
                      onChange={(e) => setFormActive(e.target.checked)} 
                      className="w-4 h-4 rounded border-slate-300" 
                    />
                    <label htmlFor="formActive" className="text-sm font-medium dark:text-slate-300">Active</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="formAutoConfirm" 
                      checked={formAutoConfirm} 
                      onChange={(e) => setFormAutoConfirm(e.target.checked)} 
                      className="w-4 h-4 rounded border-slate-300" 
                    />
                    <label htmlFor="formAutoConfirm" className="text-sm font-medium dark:text-slate-300">Auto-confirm invoices</label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowModal(false)} 
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    {submitting ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}
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
