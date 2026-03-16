import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { warehouseApi } from '@/lib/api';
import { Plus, Search, X, Loader2, MapPin, Edit2, Trash2, Package } from 'lucide-react';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
  description?: string;
  location?: {
    address?: string;
    city?: string;
    country?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
  };
  isActive: boolean;
  isDefault: boolean;
  totalProducts?: number;
  totalQuantity?: number;
  totalValue?: number;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCountry, setFormCountry] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when searchTerm changes
  useEffect(() => {
    fetchWarehouses();
  }, [searchTerm]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await warehouseApi.getAll({ search: searchTerm || undefined, limit: 100 });
      console.log('Warehouses response:', res);
      if (res.success) {
        // Handle both direct array and wrapped response formats
        const data = (res as any).data;
        if (Array.isArray(data)) {
          setWarehouses(data);
        } else if (data && Array.isArray(data.data)) {
          setWarehouses(data.data);
        } else {
          console.warn('Unexpected warehouses data format:', data);
          setWarehouses([]);
        }
      } else {
        setWarehouses([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch warehouses:', err);
      setError(err.message || 'Failed to load warehouses');
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormName(warehouse.name);
      setFormCode(warehouse.code || '');
      setFormDescription(warehouse.description || '');
      setFormAddress(warehouse.location?.address || '');
      setFormCity(warehouse.location?.city || '');
      setFormCountry(warehouse.location?.country || '');
      setFormContactPerson(warehouse.location?.contactPerson || '');
      setFormPhone(warehouse.location?.phone || '');
      setFormEmail(warehouse.location?.email || '');
      setFormIsDefault(warehouse.isDefault);
    } else {
      setEditingWarehouse(null);
      setFormName('');
      setFormCode('');
      setFormDescription('');
      setFormAddress('');
      setFormCity('');
      setFormCountry('');
      setFormContactPerson('');
      setFormPhone('');
      setFormEmail('');
      setFormIsDefault(false);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        name: formName,
        code: formCode || undefined,
        description: formDescription || undefined,
        location: {
          address: formAddress || undefined,
          city: formCity || undefined,
          country: formCountry || undefined,
          contactPerson: formContactPerson || undefined,
          phone: formPhone || undefined,
          email: formEmail || undefined
        },
        isDefault: formIsDefault
      };

      if (editingWarehouse) {
        await warehouseApi.update(editingWarehouse._id, data);
      } else {
        await warehouseApi.create(data);
      }
      setShowModal(false);
      fetchWarehouses();
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      await warehouseApi.delete(id);
      fetchWarehouses();
    } catch (err: any) {
      alert(err.message || 'Failed to delete warehouse');
    }
  };

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col gap-3 mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <MapPin className="h-6 w-6" /> Warehouses
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Manage multiple warehouse locations</p>
            </div>
            <button onClick={() => openModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Add Warehouse
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search warehouses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8 md:py-12"><Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin" /></div>
        ) : warehouses.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-slate-500 dark:text-slate-400">No warehouses found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((warehouse) => (
              <div key={warehouse._id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold dark:text-white flex items-center gap-2">
                      {warehouse.name}
                      {warehouse.isDefault && <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">Default</span>}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{warehouse.code}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openModal(warehouse)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(warehouse._id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {warehouse.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{warehouse.description}</p>
                )}
                
                {warehouse.location?.city && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    {warehouse.location.city}{warehouse.location.country && `, ${warehouse.location.country}`}
                  </p>
                )}

                <div className="flex items-center gap-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Package className="h-4 w-4" />
                    {warehouse.totalProducts || 0} products
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {warehouse.totalQuantity || 0} units
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">{editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                  <X className="h-5 w-5 dark:text-slate-300" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Code</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Address</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">City</label>
                    <input
                      type="text"
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Country</label>
                    <input
                      type="text"
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Contact Person</label>
                    <input
                      type="text"
                      value={formContactPerson}
                      onChange={(e) => setFormContactPerson(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Phone</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isDefault" className="text-sm dark:text-slate-300">Set as default warehouse</label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingWarehouse ? 'Update' : 'Create'}
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
