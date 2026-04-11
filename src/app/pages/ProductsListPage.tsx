import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { productsApi, categoriesApi, suppliersApi } from '@/lib/api';
import { Layout } from '../layout/Layout';
import { 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  ToggleLeft,
  ToggleRight,
  Download,
  Upload,
  Loader2,
  Package,
  AlertTriangle,
  X,
  Trash2,
  Bell
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/app/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  barcodeType?: string;
  description?: string;
  category?: {
    _id: string;
    name: string;
  };
  unit: string;
  supplier?: {
    _id: string;
    name: string;
  };
  preferredSupplier?: {
    _id: string;
    name: string;
  };
  currentStock: number | string;
  isActive: boolean;
  isArchived: boolean;
  isStockable: boolean;
  lowStockThreshold?: number;
  averageCost: number | string;
  sellingPrice: number | string;
  costPrice?: number | string;
  costingMethod: string;
  inventoryAccount?: string;
  cogsAccount?: string;
  revenueAccount?: string;
  taxCode?: string;
  taxRate?: number;
  brand?: string;
  location?: string;
  trackingType?: string;
  reorderPoint?: number;
  reorderQuantity?: number;
  defaultWarehouse?: {
    _id: string;
    name: string;
  };
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface Category {
  _id: string;
  name: string;
}

interface Supplier {
  _id: string;
  name: string;
  code: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}

export default function ProductsListPage() {
  console.log('[ProductsListPage] Component mounted - Starting render');
  console.log('[ProductsListPage] Current state - rendering at:', new Date().toISOString());
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10
  });
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Load categories and suppliers on mount
  useEffect(() => {
    loadCategories();
    loadSuppliers();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      if (response.success && response.data) {
        setCategories(response.data as Category[]);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        setSuppliers(response.data as Supplier[]);
      }
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const loadProducts = useCallback(async () => {
    console.log('[ProductsListPage] loadProducts called');
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: pagination.currentPage,
        limit: pagination.limit,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      if (supplierFilter) params.supplier = supplierFilter;
      // Status filter: 'active', 'archived', or stock status 'in_stock', 'low_stock', 'out_of_stock'
      if (statusFilter === 'archived') {
        params.isArchived = true;
        params.include_inactive = 'true'; // Include archived products
      } else if (statusFilter) {
        // Map frontend status to backend stock status
        params.status = statusFilter;
      }
      
      const response = await productsApi.getAll(params);
      
      if (response.success) {
        setProducts(response.data as Product[]);
        if (response.pagination && typeof response.pagination === 'object') {
          const pg = response.pagination as Record<string, any>;
          setPagination(prev => ({
            ...prev,
            currentPage: pg.currentPage || prev.currentPage,
            totalPages: pg.totalPages || prev.totalPages,
            total: pg.total || prev.total,
            limit: pg.limit || prev.limit
          }));
        }
      }
    } catch (error) {
      console.error('[ProductsListPage] Failed to load products:', error);
      setError(error instanceof Error ? error.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, supplierFilter, statusFilter]);

  // Load products on mount and when page/limit/filters change
  useEffect(() => {
    loadProducts();
  }, [pagination.currentPage, pagination.limit, searchTerm, categoryFilter, supplierFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    loadProducts();
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleEdit = (product: Product) => {
    navigate(`/products/${product._id}/edit`);
  };

  const handleViewStock = (product: Product) => {
    navigate(`/products/${product._id}?tab=stock`);
  };

  const handleToggleActive = async (product: Product) => {
    setActionLoading(true);
    try {
      if (product.isArchived) {
        await productsApi.restore(product._id);
        toast.success(t('products.restored') || 'Product restored successfully');
      } else if (product.isActive) {
        await productsApi.archive(product._id);
        toast.success(t('products.archived') || 'Product archived successfully');
      } else {
        await productsApi.restore(product._id);
        toast.success(t('products.activated') || 'Product activated successfully');
      }
      await loadProducts();
    } catch (error) {
      console.error('Failed to toggle product status:', error);
      toast.error(t('products.toggleStatusFailed') || 'Failed to update product status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stock-tenancy-system.onrender.com/api';
      const blob = await fetch(`${API_BASE_URL}/bulk/export/products`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(res => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;
    setActionLoading(true);
    try {
      await productsApi.delete(selectedProduct._id);
      toast.success(t('products.deleted') || 'Product deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      await loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error(t('products.deleteFailed') || 'Failed to delete product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckLowStock = async () => {
    setActionLoading(true);
    try {
      const response = await productsApi.checkLowStockAndNotify();
      if (response.success) {
        toast.success(response.message || 'Low stock notifications sent');
      }
    } catch (error) {
      console.error('Failed to check low stock:', error);
      toast.error(t('products.lowStockCheckFailed') || 'Failed to check low stock');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (value: number | string | undefined) => {
    if (!value) return '0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toFixed(2);
  };

  const getStockStatus = (product: Product) => {
    const stock = typeof product.currentStock === 'string' 
      ? parseFloat(product.currentStock) 
      : product.currentStock;
    const threshold = product.lowStockThreshold || 10;
    
    if (stock === 0) return { label: t('products.outOfStock'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (stock <= threshold) return { label: t('products.lowStock'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    return { label: t('products.inStock'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  };

  // Loading state
  if (loading) {
    console.log('[ProductsListPage] Rendering: loading state');
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-slate-500 dark:text-slate-400">Loading products...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    console.log('[ProductsListPage] Rendering: error state:', error);
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <p className="text-lg font-medium text-red-600 dark:text-red-400">Failed to load products</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <Button onClick={() => loadProducts()} variant="outline" className="mt-2">
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  console.log('[ProductsListPage] Rendering: main content, products count:', products.length);
  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4 max-w-7xl">
        {/* Page Header - Responsive */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Title Row */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {t('products.title') || 'Products'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {t('products.subtitle') || 'Manage your product inventory'}
              </p>
            </div>
            {/* Action Buttons - Icon only on mobile, text on sm+ */}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleCheckLowStock} variant="outline" size="sm" disabled={actionLoading}>
                <Bell className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">{t('products.checkLowStock') || 'Check Low Stock'}</span>
              </Button>
              <Button onClick={handleExport} variant="outline" size="sm">
                <Download className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">{t('common.export') || 'Export'}</span>
              </Button>
              <Button onClick={() => navigate('/products/new')} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">{t('products.addProduct') || 'New Product'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t('products.searchPlaceholder') || 'Search by name or SKU...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={categoryFilter || 'all'} onValueChange={(value) => { setCategoryFilter(value === 'all' ? '' : value); setPagination(prev => ({ ...prev, currentPage: 1 })); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('products.allCategories') || 'All Categories'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('products.allCategories') || 'All Categories'}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={supplierFilter || 'all'} onValueChange={(value) => { setSupplierFilter(value === 'all' ? '' : value); setPagination(prev => ({ ...prev, currentPage: 1 })); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('products.allSuppliers') || 'All Suppliers'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('products.allSuppliers') || 'All Suppliers'}</SelectItem>
                  {suppliers.map((sup) => (
                    <SelectItem key={sup._id} value={sup._id}>{sup.name} ({sup.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter || 'all'} onValueChange={(value) => { setStatusFilter(value === 'all' ? '' : value); setPagination(prev => ({ ...prev, currentPage: 1 })); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('products.allStatus') || 'Status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('products.allStatus') || 'All'}</SelectItem>
                  <SelectItem value="in_stock">{t('products.inStock') || 'In Stock'}</SelectItem>
                  <SelectItem value="low_stock">{t('products.lowStock') || 'Low Stock'}</SelectItem>
                  <SelectItem value="out_of_stock">{t('products.outOfStock') || 'Out of Stock'}</SelectItem>
                  <SelectItem value="archived">{t('products.archived') || 'Archived'}</SelectItem>
                </SelectContent>
              </Select>
              
              <Button type="submit" variant="secondary">
                <Search className="h-4 w-4 mr-2" />
                {t('common.search') || 'Search'}
              </Button>
            </div>
          </form>
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">{t('products.noProducts') || 'No products found'}</p>
              <Button onClick={() => navigate('/products/new')} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {t('products.addFirstProduct') || 'Add your first product'}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                    <TableHead className="font-semibold">{t('products.code') || 'Code'}</TableHead>
                    <TableHead className="font-semibold">{t('products.name') || 'Name'}</TableHead>
                    <TableHead className="font-semibold">{t('products.category') || 'Category'}</TableHead>
                    <TableHead className="font-semibold">{t('products.unit') || 'Unit'}</TableHead>
                    <TableHead className="font-semibold text-right">{t('products.averageCost') || 'Avg Cost'}</TableHead>
                    <TableHead className="font-semibold text-right">{t('products.costPrice') || 'Cost Price'}</TableHead>
                    <TableHead className="font-semibold text-right">{t('products.sellingPrice') || 'Selling Price'}</TableHead>
                    <TableHead className="font-semibold text-center">{t('products.stock') || 'Stock'}</TableHead>
                    <TableHead className="font-semibold text-right">{t('products.stockValue') || 'Stock Value'}</TableHead>
                    <TableHead className="font-semibold">{t('products.costingMethod') || 'Costing'}</TableHead>
                    <TableHead className="font-semibold text-center">{t('products.status') || 'Status'}</TableHead>
                    <TableHead className="font-semibold text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const stock = typeof product.currentStock === 'string' 
                      ? parseFloat(product.currentStock) 
                      : product.currentStock;
                    const avgCost = typeof product.averageCost === 'string' ? parseFloat(product.averageCost) : product.averageCost || 0;
                    const costP = typeof product.costPrice === 'string' ? parseFloat(product.costPrice) : product.costPrice || 0;
                    const effectiveCost = avgCost > 0 ? avgCost : costP;
                    
                    return (
                      <TableRow key={product._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <TableCell className="font-medium">
                          <span className="text-slate-900 dark:text-white">{product.sku}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">{product.name}</div>
                            {product.barcode && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">{product.barcode}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="outline" className="bg-slate-100 dark:bg-slate-700">
                              {product.category.name}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">{product.unit}</TableCell>
                        <TableCell className="text-right">{formatCurrency(effectiveCost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.costPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.sellingPrice)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {stock === 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            <span className={`font-medium ${stock === 0 ? 'text-red-600' : stock <= (product.lowStockThreshold || 10) ? 'text-yellow-600' : 'text-green-600'}`}>
                              {stock.toFixed(0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(stock * effectiveCost)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs uppercase">
                            {product.costingMethod || 'fifo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={stockStatus.color}>
                            {stockStatus.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(product)}
                              title={t('common.edit') || 'Edit'}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewStock(product)}
                              title={t('products.viewStock') || 'View Stock'}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(product)}
                              disabled={actionLoading}
                              title={product.isArchived ? t('products.restore') : product.isActive ? t('products.deactivate') : t('products.activate')}
                            >
                              {product.isArchived || !product.isActive ? (
                                <ToggleRight className="h-4 w-4 text-green-500" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-red-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(product)}
                              disabled={actionLoading}
                              title={t('common.delete') || 'Delete'}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {!loading && products.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t('common.showing') || 'Showing'} {((pagination.currentPage - 1) * pagination.limit) + 1} {t('common.to') || 'to'} {Math.min(pagination.currentPage * pagination.limit, pagination.total)} {t('common.of') || 'of'} {pagination.total} {t('common.results') || 'results'}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink 
                          onClick={() => handlePageChange(page)}
                          isActive={pagination.currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      className={pagination.currentPage >= pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('products.confirmDelete') || 'Delete Product'}</DialogTitle>
              <DialogDescription>
                {t('products.deleteConfirmMessage') || 'Are you sure you want to delete this product? This action cannot be undone.'}
                {selectedProduct && (
                  <span className="block mt-2 font-medium text-slate-900 dark:text-white">
                    {selectedProduct.name} ({selectedProduct.sku})
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setDeleteDialogOpen(false); setSelectedProduct(null); }}
                disabled={actionLoading}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('common.deleting') || 'Deleting...'}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete') || 'Delete'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}