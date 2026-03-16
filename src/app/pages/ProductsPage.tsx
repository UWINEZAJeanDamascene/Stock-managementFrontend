import { useEffect, useState, useRef } from 'react';
import { Layout } from '../layout/Layout';
import { productsApi, categoriesApi, suppliersApi, reportsApi } from '@/lib/api';
import { Package, Plus, Search, X, Loader2, FileDown, MoreHorizontal, Eye, Edit, Trash2, History, QrCode, Barcode, Printer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import BarcodeDisplay from '../components/BarcodeDisplay';

interface Product {
  _id: string;
  name: string;
  sku: string;
  description?: string;
  category: { _id: string; name: string } | string;
  supplier?: { _id: string; name: string; code: string } | string;
  unit: string;
  currentStock: number;
  lowStockThreshold: number;
  averageCost: number;
  sellingPrice?: number;
  isArchived: boolean;
  isLowStock: boolean;
  updatedAt?: string;
  lastSupplyDate?: string;
  lastSaleDate?: string;
  barcode?: string;
  barcodeType?: string;
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

interface StockMovement {
  _id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  movementDate: string;
}

const UNIT_OPTIONS = ['kg', 'g', 'pcs', 'box', 'm', 'm²', 'm³', 'l', 'ml', 'ton', 'bag', 'roll', 'sheet', 'set'];

function formatNumber(value: number | undefined | null, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0'.padStart(decimals, '.0');
  }
  if (!isFinite(value)) {
    return '0'.padStart(decimals, '.0');
  }
  return value.toFixed(decimals);
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCategoryName(category: Product['category']): string {
  if (!category) return '-';
  if (typeof category === 'string') return '-';
  if (category.name) return category.name;
  return '-';
}

function getSupplierName(supplier: Product['supplier']): string {
  if (!supplier) return '-';
  if (typeof supplier === 'string') return '-';
  if (supplier.name) return supplier.name;
  return '-';
}

function getStatusBadge(product: Product, t: (key: string) => string): { label: string; className: string } {
  if (product.isArchived) {
    return { label: t('common.archived'), className: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' };
  }
  if (product.currentStock === 0) {
    return { label: t('common.outOfStock'), className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
  }
  if (product.currentStock <= (product.lowStockThreshold || 10)) {
    return { label: t('common.lowStock'), className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' };
  }
  return { label: t('common.inStock'), className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
}

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formCurrentStock, setFormCurrentStock] = useState(0);
  const [formLowStockThreshold, setFormLowStockThreshold] = useState(10);
  const [formAverageCost, setFormAverageCost] = useState(0);
  const [formSellingPrice, setFormSellingPrice] = useState(0);
  const [formTrackSerialNumbers, setFormTrackSerialNumbers] = useState(false);
  const [formBarcode, setFormBarcode] = useState('');
  const [formBarcodeType, setFormBarcodeType] = useState('CODE128');
  const [formTaxCode, setFormTaxCode] = useState('A');
  const [formTaxRate, setFormTaxRate] = useState(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openMenuId && !(event.target as Element)?.closest('.actions-menu')) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  useEffect(() => {
    fetchData();
  }, [searchTerm, filterCategory, filterStatus, currentPage]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build filters - only include non-empty values
      const params: Record<string, string> = {
        page: currentPage.toString(), 
        limit: '20'
      };
      
      if (searchTerm.trim()) {
        params.search = searchTerm;
      }
      
      if (filterCategory.trim()) {
        params.category = filterCategory;
      }
      
      if (filterStatus.trim()) {
        params.status = filterStatus;
      }
      
      const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
        productsApi.getAll(params),
        categoriesApi.getAll(),
        suppliersApi.getAll({ limit: 100 })
      ]);
      
      if (productsRes.success) {
        const data = productsRes as { data: Product[]; pagination?: { total: number; pages: number; page: number } };
        setProducts(data.data || []);
        if (data.pagination) {
          setTotalPages(data.pagination.pages || 1);
          setTotalProducts(data.pagination.total || 0);
        }
      }
      if (categoriesRes.success) {
        setCategories(categoriesRes.data as Category[]);
      }
      if (suppliersRes.success) {
        setSuppliers(suppliersRes.data as Supplier[]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (product?: Product) => {
    setOpenMenuId(null);
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormSku(product.sku);
      setFormDescription(product.description || '');
      const catId = typeof product.category === 'object' ? product.category?._id : product.category;
      setFormCategory(catId || '');
      const supId = typeof product.supplier === 'object' ? product.supplier?._id : product.supplier;
      setFormSupplier(supId || '');
      setFormUnit(product.unit || 'pcs');
      setFormCurrentStock(Number(product.currentStock) || 0);
      setFormLowStockThreshold(Number(product.lowStockThreshold) || 10);
      setFormAverageCost(Number(product.averageCost) || 0);
      // @ts-ignore - product may not have this property typed
      setFormSellingPrice(Number((product as any).sellingPrice) || 0);
      // trackSerialNumbers may not be present on older product objects
      // default to false when missing
      // @ts-ignore - product may not have this property typed
      setFormTrackSerialNumbers(Boolean((product as any).trackSerialNumbers));
      setFormBarcode(product.barcode || '');
      setFormBarcodeType(product.barcodeType || 'CODE128');
      // tax fields - may be missing on older products
      // @ts-ignore
      setFormTaxCode((product as any).taxCode || 'A');
      // @ts-ignore
      setFormTaxRate(Number((product as any).taxRate) || 0);
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormSku('');
      setFormDescription('');
      setFormCategory('');
      setFormSupplier('');
      setFormUnit('pcs');
      setFormCurrentStock(0);
      setFormLowStockThreshold(10);
      setFormAverageCost(0);
      setFormSellingPrice(0);
      setFormTrackSerialNumbers(false);
      setFormBarcode('');
      setFormBarcodeType('CODE128');
      setFormTaxCode('A');
      setFormTaxRate(0);
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setOpenMenuId(null);
    if (!confirm(t('common.areYouSure'))) return;
    try {
      await productsApi.delete(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Failed to delete');
    }
  };

  const handleViewHistory = async (productId: string) => {
    setOpenMenuId(null);
    try {
      const historyRes = await productsApi.getLifecycle(productId);
      if (historyRes.success) {
        const data = historyRes as { data: { product: Product; timeline: unknown[] } };
        setSelectedProduct(data.data.product);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleViewProduct = (product: Product) => {
    setOpenMenuId(null);
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const productData = {
      name: formName,
      sku: formSku,
      description: formDescription,
      category: formCategory,
      supplier: formSupplier || undefined,
      unit: formUnit,
      currentStock: formCurrentStock,
      lowStockThreshold: formLowStockThreshold,
      averageCost: formAverageCost,
      sellingPrice: formSellingPrice,
      trackSerialNumbers: formTrackSerialNumbers,
      barcode: formBarcode || undefined,
      barcodeType: formBarcodeType || 'CODE128',
      // Include tax defaults
      taxCode: formTaxCode,
      taxRate: formTaxRate,
    };

    try {
      if (editingProduct) {
        await productsApi.update(editingProduct._id, productData);
      } else {
        await productsApi.create(productData);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const blob = type === 'excel' 
        ? await reportsApi.exportExcel('products')
        : await reportsApi.exportPDF('products');
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export:', err);
      setError('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  // Get the most recent stock movement date for a product
  const getLastMovementDate = (product: Product): string => {
    const lastSupply = product.lastSupplyDate ? new Date(product.lastSupplyDate) : null;
    const lastSale = product.lastSaleDate ? new Date(product.lastSaleDate) : null;
    const lastUpdated = product.updatedAt ? new Date(product.updatedAt) : null;
    
    const dates = [lastSupply, lastSale, lastUpdated].filter(Boolean) as Date[];
    if (dates.length === 0) return '-';
    
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    return formatDate(latest.toISOString());
  };

const canEditProducts = hasPermission('products:create') || hasPermission('products:update') || hasPermission('products:delete');

  return (
    <Layout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{t('products.title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{t('products.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button 
                disabled={exporting}
                className="flex items-center gap-2 px-3 md:px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 text-sm bg-white dark:bg-slate-800"
              >
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{exporting ? t('common.exporting') : t('common.export')}</span>
                <span className="sm:hidden">{exporting ? '...' : t('common.export')}</span>
              </button>
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button 
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm dark:text-slate-300"
                >
                  {t('common.exportToExcel')}
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm dark:text-slate-300"
                >
                  {t('common.exportToPDF')}
                </button>
              </div>
            </div>
            {hasPermission('products:create') && (
              <button onClick={() => openModal()} className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('products.addProduct')}</span>
              </button>
            )}
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">{error}</div>}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="relative flex-1 min-w-[150px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('products.searchPlaceholder')} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm" 
            />
          </div>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm min-w-[120px]"
          >
            <option value="">{t('products.allCategories')}</option>
            {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
          </select>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm min-w-[120px]"
          >
            <option value="">{t('products.allStatus')}</option>
            <option value="in_stock">{t('common.inStock')}</option>
            <option value="low_stock">{t('common.lowStock')}</option>
            <option value="out_of_stock">{t('common.outOfStock')}</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">{t('products.noProducts')}</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('products.sku')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.name')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('products.category')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('suppliers.title')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('products.unit')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('products.tax')}</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('products.stockLevel')}</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('products.minStock')}</th>
                    <th className="text-left p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('products.lastUpdated')}</th>
                    <th className="text-center p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.status')}</th>
                    <th className="text-right p-4 text-sm font-medium text-slate-600 dark:text-slate-300">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {products.map((product) => {
                    const status = getStatusBadge(product, t);
                    return (
                      <tr key={product._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{product.sku || '-'}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                          <button 
                            onClick={() => handleViewProduct(product)}
                            className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          >
                            {product.name || '-'}
                          </button>
                        </td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{getCategoryName(product.category)}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{getSupplierName(product.supplier)}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{product.unit || '-'}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                          {/* @ts-ignore - tax fields may be missing on older products */}
                          {`${(product as any).taxCode || 'A'} • ${(product as any).taxRate != null ? (product as any).taxRate : 0}%`}
                        </td>
                        <td className="p-4 text-right text-slate-600 dark:text-slate-300">{formatNumber(product.currentStock, 0)}</td>
                        <td className="p-4 text-right text-slate-600 dark:text-slate-300">{formatNumber(product.lowStockThreshold, 0)}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{getLastMovementDate(product)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="relative inline-block actions-menu">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === product._id ? null : product._id);
                              }}
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                            {openMenuId === product._id && (
                              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg z-10 py-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewProduct(product);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm dark:text-slate-300 flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" /> {t('common.viewDetails')}
                                </button>
                                {hasPermission('products:update') && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openModal(product);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm dark:text-slate-300 flex items-center gap-2"
                                  >
                                    <Edit className="h-4 w-4" /> {t('common.edit')}
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewHistory(product._id);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm dark:text-slate-300 flex items-center gap-2"
                                >
                                  <History className="h-4 w-4" /> {t('common.viewHistory')}
                                </button>
                                {hasPermission('products:delete') && (
                                  <>
                                    <hr className="my-1 border-slate-200 dark:border-slate-700" />
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(product._id);
                                      }}
                                      className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
                                    >
                                      <Trash2 className="h-4 w-4" /> {t('common.delete')}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add/Edit Product Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold dark:text-white">{editingProduct ? t('products.editProduct') : t('products.addProduct')}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="h-5 w-5 dark:text-slate-300" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.name')} *</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.sku')} *</label>
                    <input type="text" value={formSku} onChange={(e) => setFormSku(e.target.value.toUpperCase())} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg uppercase" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.description')}</label>
                  <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.category')} *</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                      <option value="">{t('common.selectCategory')}</option>
                      {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('common.selectSupplier')}</label>
                    <select value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                      <option value="">{t('common.selectSupplier')}</option>
                      {suppliers.map(sup => <option key={sup._id} value={sup._id}>{sup.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.unit')} *</label>
                    <select value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" required>
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.averageCost')}</label>
                    <input type="number" step="0.01" min="0" value={formAverageCost} onChange={(e) => setFormAverageCost(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.sellingPrice')}</label>
                    <input type="number" step="0.01" min="0" value={formSellingPrice} onChange={(e) => setFormSellingPrice(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.taxCode')}</label>
                    <select value={formTaxCode} onChange={(e) => setFormTaxCode(e.target.value)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg">
                      <option value="A">A (Exempt / 0%)</option>
                      <option value="B">B (Standard VAT)</option>
                      <option value="None">{t('common.none')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.taxRate')}</label>
                    <input type="number" step="0.01" min="0" max="100" value={formTaxRate} onChange={(e) => setFormTaxRate(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                {/* Barcode Section */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                  <h3 className="text-sm font-medium mb-3 dark:text-slate-300 flex items-center gap-2">
                    <Barcode className="h-4 w-4" /> {t('products.barcodeSettings')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.barcodeValue')}</label>
                      <input 
                        type="text" 
                        value={formBarcode} 
                        onChange={(e) => setFormBarcode(e.target.value)} 
                        placeholder={t('products.barcodeAutoGenerated')}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.barcodeType')}</label>
                      <select 
                        value={formBarcodeType} 
                        onChange={(e) => setFormBarcodeType(e.target.value)} 
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                      >
                        <option value="CODE128">CODE128 (Default)</option>
                        <option value="EAN13">EAN-13</option>
                        <option value="EAN8">EAN-8</option>
                        <option value="UPC">UPC</option>
                        <option value="CODE39">CODE39</option>
                        <option value="ITF14">ITF-14</option>
                        <option value="QR">QR Code</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={formTrackSerialNumbers} onChange={(e) => setFormTrackSerialNumbers(e.target.checked)} className="form-checkbox h-4 w-4" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{t('products.trackSerialNumbers')}</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.currentStock')}</label>
                    <input type="number" min="0" value={formCurrentStock} onChange={(e) => setFormCurrentStock(parseInt(e.target.value) || 0)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">{t('products.lowStockThreshold')}</label>
                    <input type="number" min="0" value={formLowStockThreshold} onChange={(e) => setFormLowStockThreshold(parseInt(e.target.value) || 10)} className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg" disabled={submitting}>{t('common.cancel')}</button>
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingProduct ? t('common.update') : t('common.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Product Detail Modal */}
        {showDetailModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 md:p-6 border-b">
                <h2 className="text-lg font-semibold">{t('products.productDetails')}</h2>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-4 md:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('common.name')}</label>
                    <p className="text-lg font-medium dark:text-white">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('products.sku')}</label>
                    <p className="text-lg dark:text-white">{selectedProduct.sku}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('products.category')}</label>
                    <p className="dark:text-slate-300">{getCategoryName(selectedProduct.category)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('suppliers.title')}</label>
                    <p className="dark:text-slate-300">{getSupplierName(selectedProduct.supplier)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('products.taxCode')}</label>
                    <p className="dark:text-slate-300">{/* @ts-ignore */}{(selectedProduct as any).taxCode || 'A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('products.tax')}</label>
                    <p className="dark:text-slate-300">{/* @ts-ignore */}{((selectedProduct as any).taxRate != null ? (selectedProduct as any).taxRate : 0) + '%'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('products.currentStock')}</label>
                    <p className="text-lg md:text-xl font-bold dark:text-white truncate">{formatNumber(selectedProduct.currentStock, 0)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('products.lowStockThreshold')}</label>
                    <p className="text-lg md:text-xl font-bold dark:text-white truncate">{formatNumber(selectedProduct.lowStockThreshold, 0)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('products.averageCost')}</label>
                    <p className="text-lg md:text-xl font-bold dark:text-white truncate">FRW {formatNumber(selectedProduct.averageCost)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('products.sellingPrice')}</label>
                    <p className="text-lg md:text-xl font-bold dark:text-white truncate">FRW {formatNumber((selectedProduct as any).sellingPrice || 0)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('common.status')}</label>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${getStatusBadge(selectedProduct, t).className}`}>
                      {getStatusBadge(selectedProduct, t).label}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('products.lastUpdated')}</label>
                    <p className="dark:text-slate-300">{getLastMovementDate(selectedProduct)}</p>
                  </div>
                </div>
                {selectedProduct.description && (
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{t('common.description')}</label>
                    <p className="dark:text-slate-300">{selectedProduct.description}</p>
                  </div>
                )}
                {/* Barcode / QR Code Display */}
                {(selectedProduct.barcode || selectedProduct.sku) && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">{t('products.barcodeSettings')}</label>
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="bg-white p-2 rounded-lg border">
                        <BarcodeDisplay 
                          productId={selectedProduct._id} 
                          type="barcode" 
                          barcodeParams={{ type: selectedProduct.barcodeType || 'CODE128', scale: 2, height: 50 }}
                          className="h-16"
                        />
                      </div>
                      <div className="bg-white p-2 rounded-lg border">
                        <BarcodeDisplay 
                          productId={selectedProduct._id} 
                          type="qrcode" 
                          qrParams={{ width: 100 }}
                          className="w-20 h-20"
                        />
                      </div>
                      <button 
                        onClick={async () => {
                          try {
                            const blob = await productsApi.getBarcodeImage(selectedProduct._id, { 
                              type: selectedProduct.barcodeType || 'CODE128',
                              scale: 3,
                              height: 15
                            });
                            const url = window.URL.createObjectURL(blob);
                            const printWindow = window.open(url, '_blank');
                            if (printWindow) {
                              printWindow.onload = () => {
                                printWindow.print();
                              };
                            }
                          } catch (err) {
                            console.error('Failed to print label:', err);
                          }
                        }}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg flex items-center gap-2 text-sm dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Printer className="h-4 w-4" /> {t('common.printLabel')}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  {hasPermission('products:update') && (
                    <button 
                      onClick={() => { setShowDetailModal(false); openModal(selectedProduct); }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" /> {t('products.editProduct')}
                    </button>
                  )}
                  <button 
                    onClick={() => handleViewHistory(selectedProduct._id)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg flex items-center gap-2 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <History className="h-4 w-4" /> {t('products.viewFullHistory')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {t('products.showing', { from: ((currentPage - 1) * 20) + 1, to: Math.min(currentPage * 20, totalProducts), total: totalProducts })}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300"
              >
                {t('common.previous')}
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 border rounded-lg text-sm ${
                      currentPage === pageNum ? 'bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
