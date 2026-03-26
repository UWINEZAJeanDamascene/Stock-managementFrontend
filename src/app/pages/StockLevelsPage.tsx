import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper,
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
  Search as SearchIcon,
  Download as DownloadIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { stockApi } from '@/lib/api';
import { Layout } from '../layout/Layout';

interface StockLevel {
  _id: string;
  product: string;
  productId: string;
  productName: string;
  productSku: string;
  warehouse: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  unitCost: number;
  totalCost: number;
  batchNumber?: string;
  expiryDate?: string;
  status: string;
  lastMovement?: string;
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
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0
  });
  
  // Filters
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch stock levels
  const fetchStockLevels = async () => {
    setLoading(true);
    setError(null);
    console.log('[StockLevels] Fetching with params:', {
      warehouse: warehouseFilter || undefined,
      lowStock: lowStockFilter || undefined,
      search: debouncedSearch || undefined,
      page: pagination.page,
      limit: pagination.limit
    });
    try {
      const response = await stockApi.getLevels({
        warehouse: warehouseFilter || undefined,
        lowStock: lowStockFilter || undefined,
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit
      });
      
      console.log('[StockLevels] API Response:', response);
      
      if (response && response.success) {
        setStockLevels(response.data as StockLevel[]);
        if (response.warehouses) {
          setWarehouses(response.warehouses as Warehouse[]);
        }
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            ...response.pagination as PaginationInfo
          }));
        }
      } else if (response) {
        console.error('[StockLevels] API error response:', response);
        // Use type assertion since response structure may vary
        const errMsg = (response as { message?: string }).message;
        setError(errMsg || 'Failed to fetch stock levels');
      } else {
        console.error('[StockLevels] No response from API');
        setError('No response from server');
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
  }, [pagination.page, warehouseFilter, lowStockFilter, debouncedSearch]);

  const handlePageChange = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage + 1 }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPagination(prev => ({ 
      ...prev, 
      limit: parseInt(event.target.value, 10),
      page: 1 
    }));
  };

  const handleExport = () => {
    // Export to CSV
    const headers = [
      'Product Code',
      'Product Name',
      'Warehouse',
      'Qty On Hand',
      'Qty Reserved',
      'Qty Available',
      'Avg Cost',
      'Total Value',
      'Status'
    ];
    
    const rows = stockLevels.map(item => [
      item.productSku,
      item.productName,
      item.warehouseName,
      item.quantity,
      item.reservedQuantity,
      item.availableQuantity,
      item.unitCost,
      item.totalCost,
      item.status
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

  const getStatusChip = (status: string) => {
    const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      partially_used: 'warning',
      exhausted: 'error',
      expired: 'error',
      quarantined: 'default'
    };
    return <Chip label={status} color={statusColors[status] || 'default'} size="small" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const totalValue = stockLevels.reduce((sum, item) => sum + item.totalCost, 0);
  const lowStockCount = stockLevels.filter(item => item.availableQuantity < item.quantity * 0.2).length;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <InventoryIcon className="text-primary" style={{ fontSize: 32 }} />
          <Typography variant="h5" component="h1">
            {t('stockLevels.title', 'Stock Levels')}
          </Typography>
        </div>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          {t('common.export', 'Export')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Paper className="p-4 flex items-center gap-4">
          <InventoryIcon color="primary" />
          <div>
            <Typography variant="body2" color="text.secondary">
              {t('stockLevels.totalBatches', 'Total Batches')}
            </Typography>
            <Typography variant="h6">{pagination.total}</Typography>
          </div>
        </Paper>
        <Paper className="p-4 flex items-center gap-4">
          <WarningIcon color="warning" />
          <div>
            <Typography variant="body2" color="text.secondary">
              {t('stockLevels.lowStock', 'Low Stock Items')}
            </Typography>
            <Typography variant="h6">{lowStockCount}</Typography>
          </div>
        </Paper>
        <Paper className="p-4 flex items-center gap-4">
          <TrendingUpIcon color="success" />
          <div>
            <Typography variant="body2" color="text.secondary">
              {t('stockLevels.totalValue', 'Total Value')}
            </Typography>
            <Typography variant="h6">{formatCurrency(totalValue)}</Typography>
          </div>
        </Paper>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <TextField
            fullWidth
            size="small"
            placeholder={t('stockLevels.searchPlaceholder', 'Search product, SKU, or warehouse...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>{t('stockLevels.warehouse', 'Warehouse')}</InputLabel>
            <Select
              value={warehouseFilter}
              label={t('stockLevels.warehouse', 'Warehouse')}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <MenuItem value="">{t('common.all', 'All')}</MenuItem>
              {warehouses.map(wh => (
                <MenuItem key={wh._id} value={wh._id}>{wh.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>{t('stockLevels.status', 'Status')}</InputLabel>
            <Select
              value={lowStockFilter ? 'low' : 'all'}
              label={t('stockLevels.status', 'Status')}
              onChange={(e) => setLowStockFilter(e.target.value === 'low')}
            >
              <MenuItem value="all">{t('common.all', 'All')}</MenuItem>
              <MenuItem value="low">{t('stockLevels.lowStock', 'Low Stock')}</MenuItem>
            </Select>
          </FormControl>
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={() => {
              setSearch('');
              setWarehouseFilter('');
              setLowStockFilter(false);
            }}
          >
            {t('common.clear', 'Clear')}
          </Button>
        </div>
      </Paper>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('stockLevels.productCode', 'Product Code')}</TableCell>
                <TableCell>{t('stockLevels.productName', 'Product Name')}</TableCell>
                <TableCell>{t('stockLevels.warehouse', 'Warehouse')}</TableCell>
                <TableCell align="right">{t('stockLevels.qtyOnHand', 'Qty On Hand')}</TableCell>
                <TableCell align="right">{t('stockLevels.qtyReserved', 'Qty Reserved')}</TableCell>
                <TableCell align="right">{t('stockLevels.qtyAvailable', 'Qty Available')}</TableCell>
                <TableCell align="right">{t('stockLevels.avgCost', 'Avg Cost')}</TableCell>
                <TableCell align="right">{t('stockLevels.totalValue', 'Total Value')}</TableCell>
                <TableCell>{t('stockLevels.status', 'Status')}</TableCell>
                <TableCell>{t('stockLevels.lastMovement', 'Last Movement')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : stockLevels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    {t('stockLevels.noData', 'No stock levels found')}
                  </TableCell>
                </TableRow>
              ) : (
                stockLevels.map((item) => (
                  <TableRow 
                    key={item._id}
                    hover
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{item.productSku}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>{item.warehouseName}</TableCell>
                    <TableCell align="right">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell align="right">{item.reservedQuantity.toLocaleString()}</TableCell>
                    <TableCell 
                      align="right"
                      style={{ 
                        color: item.availableQuantity < item.quantity * 0.2 ? '#d32f2f' : 'inherit',
                        fontWeight: item.availableQuantity < item.quantity * 0.2 ? 'bold' : 'normal'
                      }}
                    >
                      {item.availableQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(item.unitCost)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.totalCost)}</TableCell>
                    <TableCell>{getStatusChip(item.status)}</TableCell>
                    <TableCell>
                      {item.lastMovement 
                        ? new Date(item.lastMovement).toLocaleDateString() 
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
    </Layout>
  );
}
