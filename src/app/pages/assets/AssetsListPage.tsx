import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { fixedAssetsApi, assetCategoriesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Types
interface FixedAsset {
  _id: string;
  reference: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationMethod: 'straight-line' | 'declining-balance';
  decliningRate?: number;
  accumulatedDepreciation: number;
  netBookValue: number;
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
      'active': { variant: 'default', label: t('assets.statusActive') },
      'fully-depreciated': { variant: 'secondary', label: t('assets.statusFullyDepreciated') },
      'disposed': { variant: 'destructive', label: t('assets.statusDisposed') },
      'maintenance': { variant: 'outline', label: t('assets.statusUnderMaintenance') },
    };
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  // Calculate stats
  const totalValue = assets.reduce((sum, asset) => sum + (asset.purchaseCost || 0), 0);
  const totalDepreciation = assets.reduce((sum, asset) => sum + (asset.accumulatedDepreciation || 0), 0);
  const totalNetBookValue = assets.reduce((sum, asset) => sum + (asset.netBookValue || 0), 0);

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('assets.title')}</h1>
            <p className="text-muted-foreground">{t('assets.subtitle')}</p>
          </div>
          <Button onClick={() => navigate('/assets/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('assets.addAsset')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('assets.totalAssets')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('assets.totalValue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('assets.totalDepreciation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalDepreciation)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('assets.netBookValue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalNetBookValue)}</div>
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
              className="max-w-sm"
            />
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4 mr-2" />
              {t('common.search')}
            </Button>
          </form>
          
          <div className="flex gap-2">
            <select
              className="border rounded-md px-3 py-2"
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
              className="border rounded-md px-3 py-2"
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
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Package className="h-12 w-12 mb-4" />
                <p>{t('assets.noAssets')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('assets.reference')}</TableHead>
                    <TableHead>{t('assets.name')}</TableHead>
                    <TableHead>{t('assets.category')}</TableHead>
                    <TableHead>{t('assets.purchaseDate')}</TableHead>
                    <TableHead className="text-right">{t('assets.cost')}</TableHead>
                    <TableHead className="text-right">{t('assets.accumulatedDepreciation')}</TableHead>
                    <TableHead className="text-right">{t('assets.netBookValue')}</TableHead>
                    <TableHead>{t('assets.status')}</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset._id}>
                      <TableCell className="font-medium">{asset.reference || '-'}</TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.categoryName || '-'}</TableCell>
                      <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(asset.purchaseCost || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(asset.accumulatedDepreciation || 0)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(asset.netBookValue || 0)}</TableCell>
                      <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/assets/${asset._id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('common.view')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/assets/${asset._id}/edit`)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t('common.edit')}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(asset._id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('common.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
