import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Warehouse as WarehouseIcon,
  Loader2,
  AlertCircle,
  MapPin,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Layout } from '@/app/layout/Layout';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { toast } from 'sonner';
import { warehousesApi } from '@/lib/api';

// Type definitions
interface Warehouse {
  _id: string;
  code: string;
  name: string;
  description?: string;
  location?: {
    address?: string;
    city?: string;
    country?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
  };
  inventoryAccount?: string;
  isActive: boolean;
  isDefault: boolean;
  totalProducts?: number;
  totalQuantity?: number;
  totalValue?: number;
}

interface WarehouseFormData {
  name: string;
  code: string;
  description: string;
  address: string;
  city: string;
  country: string;
  contactPerson: string;
  phone: string;
  email: string;
  inventoryAccount: string;
  isDefault: boolean;
  isActive: boolean;
}

const initialFormData: WarehouseFormData = {
  name: '',
  code: '',
  description: '',
  address: '',
  city: '',
  country: '',
  contactPerson: '',
  phone: '',
  email: '',
  inventoryAccount: '',
  isDefault: false,
  isActive: true,
};

export default function WarehousesPage() {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<WarehouseFormData>(initialFormData);

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await warehousesApi.getAll({
        search: searchTerm,
        isActive: filterActive,
        page: 1,
        limit: 100,
      });
      
      if (response.success && response.data) {
        // Handle both array and paginated response
        const data = Array.isArray(response.data) ? response.data : (response.data as any).data;
        setWarehouses(data || []);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterActive, t]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleOpenDialog = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name || '',
        code: warehouse.code || '',
        description: warehouse.description || '',
        address: warehouse.location?.address || '',
        city: warehouse.location?.city || '',
        country: warehouse.location?.country || '',
        contactPerson: warehouse.location?.contactPerson || '',
        phone: warehouse.location?.phone || '',
        email: warehouse.location?.email || '',
        inventoryAccount: warehouse.inventoryAccount || '',
        isDefault: warehouse.isDefault || false,
        isActive: warehouse.isActive !== false,
      });
    } else {
      setEditingWarehouse(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(t('pages.warehouses.warehouseName') + ' is required');
      return;
    }

    try {
      setSaving(true);
      
      const warehouseData = {
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        location: {
          address: formData.address || undefined,
          city: formData.city || undefined,
          country: formData.country || undefined,
          contactPerson: formData.contactPerson || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
        },
        inventoryAccount: formData.inventoryAccount || undefined,
        isDefault: formData.isDefault,
        isActive: formData.isActive,
      };

      let response;
      if (editingWarehouse) {
        response = await warehousesApi.update(editingWarehouse._id, warehouseData);
        if (response.success) {
          toast.success(t('pages.warehouses.warehouseUpdated') || 'Warehouse updated successfully');
        }
      } else {
        response = await warehousesApi.create(warehouseData);
        if (response.success) {
          toast.success(t('pages.warehouses.warehouseCreated') || 'Warehouse created successfully');
        }
      }

      if (response.success) {
        setDialogOpen(false);
        fetchWarehouses();
      }
    } catch (error) {
      console.error('Error saving warehouse:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (warehouse: Warehouse) => {
    setDeletingWarehouse(warehouse);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingWarehouse) return;

    try {
      setDeleting(true);
      setDeleteError(null);
      
      const response = await warehousesApi.delete(deletingWarehouse._id);
      
      if (response.success) {
        toast.success(t('pages.warehouses.warehouseDeleted') || 'Warehouse deleted successfully');
        setDeleteDialogOpen(false);
        fetchWarehouses();
      } else {
        setDeleteError(response.message || t('common.error'));
      }
    } catch (error: any) {
      console.error('Error deleting warehouse:', error);
      // Handle WAREHOUSE_HAS_STOCK error
      if (error?.code === 'WAREHOUSE_HAS_STOCK' || error?.response?.data?.code === 'WAREHOUSE_HAS_STOCK') {
        setDeleteError(t('pages.warehouses.cannotDeleteWithStock') || 'Cannot delete warehouse with stock on hand');
      } else {
        setDeleteError(t('common.error'));
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeactivate = async (warehouse: Warehouse) => {
    try {
      const response = await warehousesApi.update(warehouse._id, { isActive: false });
      
      if (response.success) {
        toast.success(t('pages.warehouses.warehouseDeactivated') || 'Warehouse deactivated successfully');
        fetchWarehouses();
      } else if ((response as any).code === 'WAREHOUSE_HAS_STOCK') {
        toast.error(t('pages.warehouses.cannotDeactivateWithStock') || 'Cannot deactivate warehouse while it holds stock');
      } else {
        toast.error(response.message || t('common.error'));
      }
    } catch (error: any) {
      console.error('Error deactivating warehouse:', error);
      if (error?.code === 'WAREHOUSE_HAS_STOCK' || error?.response?.data?.code === 'WAREHOUSE_HAS_STOCK') {
        toast.error(t('pages.warehouses.cannotDeactivateWithStock') || 'Cannot deactivate warehouse while it holds stock');
      } else {
        toast.error(t('common.error'));
      }
    }
  };

  const getAddress = (warehouse: Warehouse): string => {
    if (!warehouse.location) return '-';
    const parts = [
      warehouse.location.address,
      warehouse.location.city,
      warehouse.location.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('pages.warehouses.title')}</h1>
            <p className="text-muted-foreground">{t('pages.warehouses.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder={t('pages.warehouses.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
            />
            <select
              value={filterActive === undefined ? '' : filterActive.toString()}
              onChange={(e) => setFilterActive(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-3 py-2 border rounded-md bg-background dark:bg-slate-800 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">{t('common.all')}</option>
              <option value="true">{t('common.active')}</option>
              <option value="false">{t('common.inactive')}</option>
            </select>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('pages.warehouses.addWarehouse')}
            </Button>
          </div>
        </div>

        {/* Warehouse List */}
        <Card className="dark:bg-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : warehouses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <WarehouseIcon className="h-12 w-12 mb-4 opacity-50 text-slate-500 dark:text-slate-400" />
                <p className="text-slate-500 dark:text-slate-400">{t('pages.warehouses.noWarehouses')}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('pages.warehouses.addWarehouse')}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.code')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.name')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.address')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.inventoryAccount')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.default')}</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white">{t('pages.warehouses.status')}</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {warehouses.map((warehouse) => (
                      <tr key={warehouse._id} className="hover:bg-muted/50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm font-mono text-slate-900 dark:text-white">{warehouse.code}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{warehouse.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {getAddress(warehouse)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                          {warehouse.inventoryAccount || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {warehouse.isDefault ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              {t('pages.warehouses.default')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {warehouse.isActive ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              {t('common.active')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <XCircle className="h-4 w-4" />
                              {t('common.inactive')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(warehouse)}
                              title={t('common.edit')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {warehouse.isActive && warehouse.isDefault !== true && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeactivate(warehouse)}
                                title={t('common.deactivate')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {warehouse.isDefault !== true && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(warehouse)}
                                title={t('common.delete')}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {editingWarehouse
                  ? t('pages.warehouses.editWarehouse')
                  : t('pages.warehouses.addWarehouse')}
              </DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-300">
                {editingWarehouse
                  ? t('pages.warehouses.editWarehouseDesc')
                  : t('pages.warehouses.addWarehouseDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-900 dark:text-white">{t('pages.warehouses.warehouseName')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t('pages.warehouses.warehouseNamePlaceholder')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>

              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-900 dark:text-white">{t('pages.warehouses.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('pages.warehouses.descriptionPlaceholder')}
                  rows={2}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-900 dark:text-white">{t('pages.warehouses.address')}</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder={t('pages.warehouses.addressPlaceholder')}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-slate-900 dark:text-white">{t('pages.warehouses.city')}</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder={t('pages.warehouses.cityPlaceholder')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-slate-900 dark:text-white">{t('pages.warehouses.country')}</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder={t('pages.warehouses.countryPlaceholder')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson" className="text-slate-900 dark:text-white">{t('pages.warehouses.contactPerson')}</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder={t('pages.warehouses.contactPersonPlaceholder')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-900 dark:text-white">{t('pages.warehouses.phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder={t('pages.warehouses.phonePlaceholder')}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-900 dark:text-white">{t('pages.warehouses.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t('pages.warehouses.emailPlaceholder')}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inventoryAccount" className="text-slate-900 dark:text-white">{t('pages.warehouses.inventoryAccount')}</Label>
                <Input
                  id="inventoryAccount"
                  value={formData.inventoryAccount}
                  onChange={(e) => setFormData(prev => ({ ...prev, inventoryAccount: e.target.value }))}
                  placeholder={t('pages.warehouses.inventoryAccountPlaceholder')}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-slate-600"
                  />
                  <span className="text-sm text-slate-900 dark:text-white">{t('pages.warehouses.setAsDefault')}</span>
                </label>
                {editingWarehouse && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-slate-600"
                    />
                    <span className="text-sm text-slate-900 dark:text-white">{t('common.active')}</span>
                  </label>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingWarehouse ? t('common.save') : t('common.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-slate-900 dark:text-white">{t('pages.warehouses.deleteWarehouse')}</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-300">
                {deleteError ? (
                  <div className="flex items-center gap-2 text-destructive mt-2">
                    <AlertCircle className="h-4 w-4" />
                    {deleteError}
                  </div>
                ) : (
                  <>
                    {t('pages.warehouses.deleteConfirmMessage') || `Are you sure you want to delete "${deletingWarehouse?.name}"?`}
                    {t('pages.warehouses.deleteWarning') || ' This action cannot be undone.'}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete}
                disabled={deleting || !!deleteError}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}