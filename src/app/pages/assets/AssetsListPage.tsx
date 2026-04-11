import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { fixedAssetsApi, assetCategoriesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  Package,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Types
interface FixedAsset {
  _id: string;
  referenceNo?: string;
  reference?: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  purchaseDate: string;
  purchaseCost: any; // Allow any type to handle MongoDB Decimal
  salvageValue: any; // Allow any type to handle MongoDB Decimal
  usefulLifeMonths: number;
  depreciationMethod: 'straight-line' | 'declining-balance';
  decliningRate?: number;
  accumulatedDepreciation: any; // Allow any type to handle MongoDB Decimal
  netBookValue: any; // Allow any type to handle MongoDB Decimal
  status: 'active' | 'fully-depreciated' | 'disposed' | 'maintenance';
  location?: string;
  serialNumber?: string;
  supplierId?: string;
  supplierName?: string;
  assetAccountCode?: string;
  accumDepreciationAccountCode?: string;
  depreciationExpenseAccountCode?: string;
  createdAt: string;
  updatedAt?: string;
}

interface AssetCategory {
  _id: string;
  name: string;
  description?: string;
}

export default function AssetsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCategories();
    fetchAssets();
  }, [page, statusFilter, categoryFilter]);

  const fetchCategories = async () => {
    try {
      const response: any = await assetCategoriesApi.getAll();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('[AssetsListPage] Failed to fetch categories:', error);
    }
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.categoryId = categoryFilter;

      const response: any = await fixedAssetsApi.getAll(params);
      if (response.success) {
        setAssets(response.data || []);
        if (response.pagination) {
          setTotalPages(response.pagination.pages || 1);
        }
      }
    } catch (error) {
      console.error('[AssetsListPage] Failed to fetch assets:', error);
      toast.error(t('assets.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirmDelete'))) return;
    
    try {
      const response: any = await fixedAssetsApi.delete(id);
      if (response.success) {
        toast.success(t('assets.assetDeleted'));
        fetchAssets();
      } else {
        toast.error(response.message || t('common.deleteFailed'));
      }
    } catch (error) {
      console.error('[AssetsListPage] Delete failed:', error);
      toast.error(t('common.deleteFailed'));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      'active': { variant: 'default', label: t('assets.status.active') },
      'fully-depreciated': { variant: 'secondary', label: t('assets.status.fullyDepreciated') },
      'fully_depreciated': { variant: 'secondary', label: t('assets.status.fullyDepreciated') },
      'disposed': { variant: 'destructive', label: t('assets.status.disposed') },
      'maintenance': { variant: 'outline', label: t('assets.statusUnderMaintenance') },
    };
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant} className="dark:bg-slate-700 dark:text-slate-200">{config.label}</Badge>;
  };

  const formatCurrency = (amount: any) => {
    const num = getNumericValue(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  // Helper to safely get numeric values (handles MongoDB Decimal)
  const getNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'object') {
      // Handle MongoDB Decimal128 objects with $numberDecimal
      if (value.$numberDecimal !== undefined) {
        const num = parseFloat(value.$numberDecimal);
        return isNaN(num) ? 0 : num;
      }
      // Handle objects with toString method
      if (value.toString && typeof value.toString === 'function') {
        const str = value.toString();
        if (str === '[object Object]') return 0;
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      }
    }
    return 0;
  };

  // Helper to get category name by ID
  const getCategoryName = (categoryId: string): string => {
    if (!categoryId) return '-';
    const category = categories.find((c) => c._id === categoryId);
    return category ? category.name : '-';
  };

  // Calculate stats
  const totalValue = assets.reduce((sum, asset) => sum + getNumericValue(asset.purchaseCost), 0);
  const totalDepreciation = assets.reduce((sum, asset) => sum + getNumericValue(asset.accumulatedDepreciation), 0);
  const totalNetBookValue = assets.reduce((sum, asset) => sum + getNumericValue(asset.netBookValue), 0);

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold dark:text-white">{t('assets.title')}</h1>
            <p className="text-muted-foreground dark:text-slate-400">{t('assets.subtitle')}</p>
          </div>
          <Button onClick={() => navigate('/assets/new')} className="dark:bg-primary dark:text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            {t('assets.addAsset')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('assets.totalAssets')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{assets.length}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('assets.totalValue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('assets.totalDepreciation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{formatCurrency(totalDepreciation)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('assets.netBookValue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{formatCurrency(totalNetBookValue)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm dark:bg-slate-700 dark:text-white dark:border-slate-600"
            />
            <Button type="submit" variant="secondary" className="dark:bg-slate-700 dark:text-slate-200">
              <Search className="h-4 w-4 mr-2" />
              {t('common.search')}
            </Button>
          </form>
          
          <div className="flex gap-2">
            <select
              className="border rounded-md px-3 py-2 dark:bg-slate-700 dark:text-white dark:border-slate-600"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="all">{t('assets.allStatuses')}</option>
              <option value="active">{t('assets.statusActive')}</option>
              <option value="fully-depreciated">{t('assets.statusFullyDepreciated')}</option>
              <option value="disposed">{t('assets.statusDisposed')}</option>
              <option value="maintenance">{t('assets.statusUnderMaintenance')}</option>
            </select>

            <select
              className="border rounded-md px-3 py-2 dark:bg-slate-700 dark:text-white dark:border-slate-600"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            >
              <option value="all">{t('assets.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <Card className="dark:bg-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground dark:text-slate-400">
                <Package className="h-12 w-12 mb-4 dark:text-slate-500" />
                <p>{t('assets.noAssets')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                    <TableHead className="dark:text-slate-200">{t('assets.reference')}</TableHead>
                    <TableHead className="dark:text-slate-200">{t('assets.name')}</TableHead>
                    <TableHead className="dark:text-slate-200">{t('assets.category')}</TableHead>
                    <TableHead className="dark:text-slate-200">{t('assets.purchaseDate')}</TableHead>
                    <TableHead className="text-right dark:text-slate-200">{t('assets.cost')}</TableHead>
                    <TableHead className="text-right dark:text-slate-200">{t('assets.accumulatedDepreciation')}</TableHead>
                    <TableHead className="text-right dark:text-slate-200">{t('assets.netBookValue')}</TableHead>
                    <TableHead className="dark:text-slate-200">{t('assets.fields.status')}</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset._id} className="dark:border-slate-600">
                      <TableCell className="font-medium dark:text-white">{asset.referenceNo || asset.reference || '-'}</TableCell>
                      <TableCell className="dark:text-slate-300">{asset.name}</TableCell>
                      <TableCell className="dark:text-slate-300">{getCategoryName(asset.categoryId)}</TableCell>
                      <TableCell className="dark:text-slate-300">{formatDate(asset.purchaseDate)}</TableCell>
                      <TableCell className="text-right dark:text-slate-300">{formatCurrency(asset.purchaseCost)}</TableCell>
                      <TableCell className="text-right dark:text-slate-300">{formatCurrency(asset.accumulatedDepreciation)}</TableCell>
                      <TableCell className="text-right font-medium dark:text-white">{formatCurrency(asset.netBookValue)}</TableCell>
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/assets/${asset._id}`)}
                            title={t('common.view')}
                            className="dark:text-slate-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/assets/${asset._id}/edit`)}
                            title={t('common.edit')}
                            className="dark:text-slate-300"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(asset._id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Previous
            </Button>
            <span className="flex items-center px-4 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
