import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Chip,
  TablePagination,
  InputAdornment,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { productsApi } from '@/lib/api';
import { Layout } from '../layout/Layout';

interface ProductStock {
  _id: string;
  sku: string;
  name: string;
  category?: {
    _id: string;
    name: string;
  };
  unit: string;
  currentStock: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  totalValue: number;
  lowStockThreshold: number;
  defaultWarehouse?: {
    _id: string;
    name: string;
  };
  isActive: boolean;
}

interface Warehouse {
  _id: string;
  name: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function StockLevelsPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isDark = () => document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(isDark());
  
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch stock data from products API (aggregated stock levels)
  const fetchStockLevels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
        isArchived: false,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      if (stockStatusFilter) {
        params.status = stockStatusFilter;
      }

      console.log('[StockLevels] Fetching products with params:', params);
      
      const response = await productsApi.getAll(params);
      
      console.log('[StockLevels] API Response:', response);
      
      if (response && response.success) {
        const productData = (response.data as any[]) || [];
        
        // Transform product data to stock format
        const stockData: ProductStock[] = productData.map((product: any) => {
          const currentStock = typeof product.currentStock === 'string' 
            ? parseFloat(product.currentStock) 
            : (product.currentStock || 0);
          
          const avgCost = typeof product.averageCost === 'string' 
            ? parseFloat(product.averageCost) 
            : (product.averageCost || 0);

          const costPrice = typeof product.costPrice === 'string'
            ? parseFloat(product.costPrice)
            : (product.costPrice || 0);

          const effectiveCost = avgCost > 0 ? avgCost : costPrice;
          
          return {
            _id: product._id,
            sku: product.sku,
            name: product.name,
            category: product.category,
            unit: product.unit || 'pcs',
            currentStock: currentStock,
            reservedQuantity: product.reservedQuantity || 0,
            availableQuantity: currentStock - (product.reservedQuantity || 0),
            averageCost: effectiveCost,
            totalValue: currentStock * effectiveCost,
            lowStockThreshold: product.lowStockThreshold || 10,
            defaultWarehouse: product.defaultWarehouse,
            isActive: product.isActive !== false,
          };
        });

        setProducts(stockData);
        
        if (response.pagination && typeof response.pagination === 'object') {
          const pg = response.pagination as Record<string, any>;
          setTotal(pg.total || productData.length);
        } else {
          setTotal(productData.length);
        }
      } else {
        setError('Failed to fetch stock levels');
      }
    } catch (err) {
      console.error('[StockLevels] Error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockLevels();
  }, [page, rowsPerPage, debouncedSearch, stockStatusFilter]);

  const handlePageChange = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    fetchStockLevels();
  };

  const handleExport = () => {
    const headers = [
      'Product Code',
      'Product Name',
      'Category',
      'Unit',
      'Qty On Hand',
      'Qty Reserved',
      'Qty Available',
      'Avg Cost',
      'Total Value',
      'Status'
    ];
    
    const rows = products.map(item => [
      item.sku,
      item.name,
      item.category?.name || '-',
      item.unit,
      item.currentStock,
      item.reservedQuantity,
      item.availableQuantity,
      item.averageCost.toFixed(2),
      item.totalValue.toFixed(2),
      getStockStatus(item).label
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-levels-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStockStatus = (product: ProductStock) => {
    if (product.currentStock === 0) return { label: 'Out of Stock', color: 'error' as const };
    if (product.currentStock <= product.lowStockThreshold) return { label: 'Low Stock', color: 'warning' as const };
    return { label: 'In Stock', color: 'success' as const };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Calculate totals
  const totalValue = products.reduce((sum, item) => sum + item.totalValue, 0);
  const totalQuantity = products.reduce((sum, item) => sum + item.currentStock, 0);
  const lowStockCount = products.filter(item => 
    item.currentStock > 0 && item.currentStock <= item.lowStockThreshold
  ).length;
  const outOfStockCount = products.filter(item => item.currentStock === 0).length;

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, sm: 3 } }} className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <InventoryIcon className="text-primary flex-shrink-0" style={{ fontSize: 28 }} />
          <Typography variant="h5" component="h1" className="text-slate-900 dark:text-white text-xl sm:text-2xl">
            {t('stockLevels.title', 'Stock Levels')}
          </Typography>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{
              borderColor: dark ? '#475569' : '#cbd5e1',
              color: dark ? '#e2e8f0' : '#475569',
            }}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{
              borderColor: dark ? '#475569' : '#cbd5e1',
              color: dark ? '#e2e8f0' : '#475569',
            }}
          >
            {t('common.export', 'Export')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
          <InventoryIcon color="primary" />
          <div>
            <Typography variant="body2" className="text-slate-500 dark:text-slate-400">
              {t('stockLevels.totalProducts', 'Total Products')}
            </Typography>
            <Typography variant="h6" className="text-slate-900 dark:text-white">{total}</Typography>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
          <TrendingUpIcon color="success" />
          <div>
            <Typography variant="body2" className="text-slate-500 dark:text-slate-400">
              {t('stockLevels.totalQuantity', 'Total Quantity')}
            </Typography>
            <Typography variant="h6" className="text-slate-900 dark:text-white">{totalQuantity.toLocaleString()}</Typography>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
          <WarningIcon color="warning" />
          <div>
            <Typography variant="body2" className="text-slate-500 dark:text-slate-400">
              {t('stockLevels.lowStock', 'Low Stock')}
            </Typography>
            <Typography variant="h6" className="text-slate-900 dark:text-white">{lowStockCount}</Typography>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700">
          <TrendingUpIcon color="success" />
          <div>
            <Typography variant="body2" className="text-slate-500 dark:text-slate-400">
              {t('stockLevels.totalValue', 'Total Value')}
            </Typography>
            <Typography variant="h6" className="text-slate-900 dark:text-white">{formatCurrency(totalValue)}</Typography>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-4 border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <TextField
            fullWidth
            size="small"
            placeholder={t('stockLevels.searchPlaceholder', 'Search product or SKU...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                backgroundColor: dark ? '#1e293b' : 'white',
                color: dark ? '#e2e8f0' : '#1e293b',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: dark ? '#334155' : '#cbd5e1',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: dark ? '#475569' : '#94a3b8',
              },
              '& input::placeholder': {
                color: dark ? '#94a3b8' : '#64748b',
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className="text-slate-400" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl fullWidth size="small" sx={{
            '& .MuiInputBase-root': {
              backgroundColor: dark ? '#1e293b' : 'white',
              color: dark ? '#e2e8f0' : '#1e293b',
            },
            '& .MuiInputLabel-root': {
              color: dark ? '#cbd5e1' : '#475569',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: dark ? '#334155' : '#cbd5e1',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: dark ? '#475569' : '#94a3b8',
            },
          }}>
            <InputLabel>{t('stockLevels.stockStatus', 'Stock Status')}</InputLabel>
            <Select
              value={stockStatusFilter}
              label={t('stockLevels.stockStatus', 'Stock Status')}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              sx={{
                color: dark ? '#e2e8f0' : '#1e293b',
              }}
            >
              <MenuItem value="">{t('common.all', 'All')}</MenuItem>
              <MenuItem value="in_stock">{t('stockLevels.inStock', 'In Stock')}</MenuItem>
              <MenuItem value="low_stock">{t('stockLevels.lowStock', 'Low Stock')}</MenuItem>
              <MenuItem value="out_of_stock">{t('stockLevels.outOfStock', 'Out of Stock')}</MenuItem>
            </Select>
          </FormControl>
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={() => {
              setSearch('');
              setStockStatusFilter('');
              setPage(0);
            }}
            sx={{
              borderColor: dark ? '#475569' : '#cbd5e1',
              color: dark ? '#e2e8f0' : '#475569',
            }}
          >
            {t('common.clear', 'Clear')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: dark ? '#1e293b' : '#f1f5f9' }}>
                <TableCell sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.productCode', 'Product Code')}</TableCell>
                <TableCell sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.productName', 'Product Name')}</TableCell>
                <TableCell sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.category', 'Category')}</TableCell>
                <TableCell align="right" sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.qtyOnHand', 'Qty On Hand')}</TableCell>
                <TableCell align="right" sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.qtyReserved', 'Qty Reserved')}</TableCell>
                <TableCell align="right" sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.qtyAvailable', 'Qty Available')}</TableCell>
                <TableCell align="right" sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.avgCost', 'Avg Cost')}</TableCell>
                <TableCell align="right" sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.totalValue', 'Total Value')}</TableCell>
                <TableCell sx={{ color: dark ? '#f1f5f9' : '#1e293b', fontWeight: 600 }}>{t('stockLevels.status', 'Status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }} className="text-slate-500 dark:text-slate-400">
                    {t('stockLevels.noData', 'No stock levels found')}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <TableRow 
                      key={item._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <TableCell sx={{ color: 'inherit' }}>{item.sku}</TableCell>
                      <TableCell sx={{ color: 'inherit' }}>
                        <div className="font-medium">{item.name}</div>
                        {item.category && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{item.category.name}</div>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: 'inherit' }}>{item.category?.name || '-'}</TableCell>
                      <TableCell align="right" sx={{ color: 'inherit' }}>{item.currentStock.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: 'inherit' }}>{item.reservedQuantity.toLocaleString()}</TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          color: item.availableQuantity <= item.lowStockThreshold && item.availableQuantity > 0 ? '#ed6c02' : 
                                 item.availableQuantity === 0 ? '#d32f2f' : 'inherit',
                          fontWeight: item.availableQuantity <= item.lowStockThreshold ? 'bold' : 'normal'
                        }}
                      >
                        {item.availableQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'inherit' }}>{formatCurrency(item.averageCost)}</TableCell>
                      <TableCell align="right" sx={{ color: 'inherit' }}>{formatCurrency(item.totalValue)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={status.label} 
                          color={status.color} 
                          size="small" 
                          variant={item.currentStock === 0 ? 'filled' : 'outlined'}
                          className="dark:border-slate-500"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{
            borderTop: `1px solid ${dark ? '#334155' : '#cbd5e1'}`,
            backgroundColor: dark ? '#1e293b' : 'white',
            color: dark ? '#e2e8f0' : '#1e293b',
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              color: 'inherit',
            },
            '& .MuiSelect-select, & .MuiInputBase-input': {
              color: 'inherit',
            },
          }}
        />
      </div>
    </Box>
    </Layout>
  );
}
