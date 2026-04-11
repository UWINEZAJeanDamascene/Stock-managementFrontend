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
  Alert,
  CircularProgress,
  FormControlLabel,
  Radio,
  RadioGroup
} from '@mui/material';
import { 
  Search as SearchIcon,
  Download as DownloadIcon,
  SwapVert as SwapVertIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Balance as BalanceIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { stockApi, warehousesApi } from '@/lib/api';
import { Layout } from '../layout/Layout';
import { StockAdjustmentDialog } from '@/app/components/StockAdjustmentDialog';

interface StockMovement {
  _id: string;
  date?: string;
  movementDate?: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  warehouse?: {
    _id: string;
    name: string;
  } | string | null;
  type: 'in' | 'out' | 'adjustment';
  quantity: number | string;
  unitCost: number | string;
  totalCost: number | string;
  sourceType?: string;
  referenceType?: string;
  reference?: string;
  referenceNumber?: string;
  notes?: string;
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

export default function StockMovementsPage() {
  const { t } = useTranslation();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isDark = () => document.documentElement.classList.contains('dark');
  const [dark, setDark] = useState(isDark());
  
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0
  });
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch warehouses for name lookup
  const fetchWarehouses = async () => {
    try {
      const response = await warehousesApi.getAll();
      if (response && response.success) {
        const warehouseMap: Record<string, string> = {};
        (response.data as Warehouse[]).forEach((w: Warehouse) => {
          warehouseMap[w._id] = w.name;
        });
        setWarehouses(warehouseMap);
      }
    } catch (err) {
      console.error('[StockMovements] Error fetching warehouses:', err);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  // Fetch stock movements
  const fetchMovements = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await stockApi.getMovements({
        type: typeFilter as 'in' | 'out' | 'adjustment' | undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit
      });
      
      if (response && response.success) {
        setMovements(response.data as StockMovement[]);
        // Extract pagination info if available
        const paginationData = (response as { pagination?: PaginationInfo }).pagination;
        if (paginationData) {
          setPagination(prev => ({
            ...prev,
            ...paginationData
          }));
        }
      } else if (response) {
        console.error('[StockMovements] API error response:', response);
        const errMsg = (response as { message?: string }).message;
        setError(errMsg || 'Failed to fetch stock movements');
      }
    } catch (err) {
      console.error('[StockMovements] Error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [pagination.page, typeFilter, startDate, endDate, debouncedSearch]);

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
    const headers = [
      'Date',
      'Product Code',
      'Product Name',
      'Warehouse',
      'Movement Type',
      'Quantity',
      'Unit Cost',
      'Total Cost',
      'Source Type',
      'Reference'
    ];
    
    const rows = movements.map(item => [
      new Date(item.movementDate || item.date || '').toLocaleDateString(),
      item.product?.sku || '',
      item.product?.name || '',
      typeof item.warehouse === 'object' && item.warehouse?.name ? item.warehouse.name : typeof item.warehouse === 'string' ? item.warehouse : '',
      item.type,
      toNum(item.quantity),
      toNum(item.unitCost),
      toNum(item.totalCost),
      item.sourceType || item.referenceType || '',
      item.referenceNumber || item.reference || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-movements-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTypeChip = (type: string) => {
    const typeColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
      in: 'success',
      out: 'error',
      adjustment: 'warning'
    };
    const typeLabels: Record<string, string> = {
      in: 'Stock In',
      out: 'Stock Out',
      adjustment: 'Adjustment'
    };
    return (
      <Chip 
        label={typeLabels[type] || type} 
        color={typeColors[type] || 'default'} 
        size="small"
        sx={{
          '& .MuiChip-root': {
            backgroundColor: type === 'in' ? (dark ? '#166534' : '#dcfce7') :
                           type === 'out' ? (dark ? '#991b1b' : '#fee2e2') :
                           (dark ? '#854d0e' : '#fef3c7'),
            color: type === 'in' ? (dark ? '#4ade80' : '#16a34a') :
                  type === 'out' ? (dark ? '#f87171' : '#dc2626') :
                  (dark ? '#fbbf24' : '#d97706'),
          }
        }}
      />
    );
  };

  const getWarehouseName = (warehouse: StockMovement['warehouse']): string => {
    if (typeof warehouse === 'object' && warehouse?.name) {
      return warehouse.name;
    }
    if (typeof warehouse === 'string' && warehouse) {
      // Look up the name from our warehouses map, fallback to ID if not found
      return warehouses[warehouse] || warehouse;
    }
    return '-';
  };

  const toNum = (v: number | string | null | undefined): number => {
    if (v == null) return 0;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const formatCurrency = (value: number | string) => {
    const num = toNum(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  // Calculate summary
  const totalIn = movements
    .filter(m => m.type === 'in')
    .reduce((sum, m) => sum + toNum(m.totalCost), 0);
  const totalOut = movements
    .filter(m => m.type === 'out')
    .reduce((sum, m) => sum + toNum(m.totalCost), 0);
  const totalAdjustments = movements
    .filter(m => m.type === 'adjustment')
    .reduce((sum, m) => sum + Math.abs(toNum(m.totalCost)), 0);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Box sx={{ p: 3 }} className="dark:text-white">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <SwapVertIcon className="text-primary" style={{ fontSize: 32 }} />
              <Typography variant="h5" component="h1" className="dark:text-white">
                {t('stockMovements.title', 'Stock Movements')}
              </Typography>
            </div>
            <div className="flex gap-2">
              <Button
                variant="contained"
                color="primary"
                onClick={() => setShowAdjustmentDialog(true)}
                startIcon={<AddIcon />}
                sx={{ mr: 1 }}
              >
                {t('stockMovements.adjustStock', 'Adjust Stock')}
              </Button>
              <Button
                variant="outlined"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Paper sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2, backgroundColor: dark ? '#1e293b' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}` }}>
            <TrendingUpIcon sx={{ color: dark ? '#4ade80' : '#16a34a' }} />
            <div>
              <Typography variant="body2" sx={{ color: dark ? '#94a3b8' : '#64748b' }}>
                {t('stockMovements.totalIn', 'Total Stock In')}
              </Typography>
              <Typography variant="h6" sx={{ color: dark ? '#f1f5f9' : '#1e293b' }}>{formatCurrency(totalIn)}</Typography>
            </div>
          </Paper>
            <Paper sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2, backgroundColor: dark ? '#1e293b' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}` }}>
              <TrendingDownIcon sx={{ color: dark ? '#f87171' : '#dc2626' }} />
              <div>
                <Typography variant="body2" sx={{ color: dark ? '#94a3b8' : '#64748b' }}>
                  {t('stockMovements.totalOut', 'Total Stock Out')}
                </Typography>
                <Typography variant="h6" sx={{ color: dark ? '#f1f5f9' : '#1e293b' }}>{formatCurrency(totalOut)}</Typography>
              </div>
            </Paper>
            <Paper sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2, backgroundColor: dark ? '#1e293b' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}` }}>
              <BalanceIcon sx={{ color: dark ? '#fbbf24' : '#d97706' }} />
              <div>
                <Typography variant="body2" sx={{ color: dark ? '#94a3b8' : '#64748b' }}>
                  {t('stockMovements.totalAdjustments', 'Total Adjustments')}
                </Typography>
                <Typography variant="h6" sx={{ color: dark ? '#f1f5f9' : '#1e293b' }}>{formatCurrency(totalAdjustments)}</Typography>
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
          <Paper sx={{ p: 4, mb: 4, backgroundColor: dark ? '#1e293b' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}` }}>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
              <TextField
                fullWidth
                size="small"
                placeholder={t('stockMovements.searchPlaceholder', 'Search product, reference...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  '& .MuiInputBase-root': {
                    backgroundColor: dark ? '#0f172a' : 'white',
                    color: dark ? '#e2e8f0' : '#1e293b',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: dark ? '#334155' : '#cbd5e1',
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon className="dark:text-slate-400" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl fullWidth size="small" sx={{
                '& .MuiInputLabel-root': {
                  color: dark ? '#94a3b8' : '#64748b',
                },
                '& .MuiInputBase-root': {
                  backgroundColor: dark ? '#0f172a' : 'white',
                  color: dark ? '#e2e8f0' : '#1e293b',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: dark ? '#334155' : '#cbd5e1',
                },
              }}>
                <InputLabel>{t('stockMovements.movementType', 'Movement Type')}</InputLabel>
                <Select
                  value={typeFilter}
                  label={t('stockMovements.movementType', 'Movement Type')}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="">{t('common.all', 'All')}</MenuItem>
                  <MenuItem value="in">{t('stockMovements.stockIn', 'Stock In')}</MenuItem>
                  <MenuItem value="out">{t('stockMovements.stockOut', 'Stock Out')}</MenuItem>
                  <MenuItem value="adjustment">{t('stockMovements.adjustment', 'Adjustment')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                type="date"
                label={t('stockMovements.startDate', 'Start Date')}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputBase-root': {
                    backgroundColor: dark ? '#0f172a' : 'white',
                    color: dark ? '#e2e8f0' : '#1e293b',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: dark ? '#334155' : '#cbd5e1',
                  },
                  '& .MuiInputLabel-root': {
                    color: dark ? '#94a3b8' : '#64748b',
                  },
                }}
              />
              <TextField
                fullWidth
                size="small"
                type="date"
                label={t('stockMovements.endDate', 'End Date')}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiInputBase-root': {
                    backgroundColor: dark ? '#0f172a' : 'white',
                    color: dark ? '#e2e8f0' : '#1e293b',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: dark ? '#334155' : '#cbd5e1',
                  },
                  '& .MuiInputLabel-root': {
                    color: dark ? '#94a3b8' : '#64748b',
                  },
                }}
              />
              <Button 
                fullWidth 
                variant="outlined" 
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
                  setStartDate('');
                  setEndDate('');
                }}
                sx={{
                  borderColor: dark ? '#475569' : '#cbd5e1',
                  color: dark ? '#e2e8f0' : '#475569',
                }}
              >
                {t('common.clear', 'Clear')}
              </Button>
            </div>
          </Paper>

          {/* Table */}
          <Paper sx={{ backgroundColor: dark ? '#1e293b' : 'white', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}` }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: dark ? '#0f172a' : '#f1f5f9' }}>
                    <TableCell sx={{ color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}>{t('stockMovements.date', 'Date')}</TableCell>
                    <TableCell sx={{ color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}>{t('stockMovements.product', 'Product')}</TableCell>
                    <TableCell sx={{ color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}>{t('stockMovements.warehouse', 'Warehouse')}</TableCell>
                    <TableCell sx={{ color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}>{t('stockMovements.type', 'Type')}</TableCell>
                    <TableCell align="right" sx={{ color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}>{t('stockMovements.quantity', 'Qty')}</TableCell>
                    <TableCell align="right" sx={{ color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}>{t('stockMovements.unitCost', 'Unit Cost')}</TableCell>
                    <TableCell align="right" sx={{ color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}>{t('stockMovements.totalCost', 'Total Cost')}</TableCell>
                    <TableCell sx={{ color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}>{t('stockMovements.sourceType', 'Source Type')}</TableCell>
                    <TableCell sx={{ color: dark ? '#e2e8f0' : '#1e293b', fontWeight: 600 }}>{t('stockMovements.reference', 'Reference')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody sx={{ backgroundColor: dark ? '#1e293b' : 'white' }}>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: dark ? '#94a3b8' : '#64748b' }}>
                        {t('stockMovements.noData', 'No stock movements found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((item) => (
                      <TableRow key={item._id} hover sx={{ backgroundColor: dark ? '#1e293b' : 'white', '&:hover': { backgroundColor: dark ? '#0f172a' : '#f1f5f9' } }}>
                        <TableCell sx={{ color: dark ? '#e2e8f0' : '#1e293b' }}>
                          {item.movementDate || item.date ? new Date(item.movementDate || item.date!).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: dark ? '#f1f5f9' : '#1e293b' }}>{item.product?.name || '-'}</Typography>
                          <Typography variant="caption" sx={{ color: dark ? '#94a3b8' : '#64748b' }}>
                            {item.product?.sku || ''}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: dark ? '#e2e8f0' : '#1e293b' }}>
                          {getWarehouseName(item.warehouse)}
                        </TableCell>
                        <TableCell>{getTypeChip(item.type)}</TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: item.type === 'out' ? (dark ? '#f87171' : '#ef4444') : (dark ? '#e2e8f0' : '#1e293b'),
                            fontWeight: item.type === 'out' ? 'bold' : 'normal'
                          }}
                        >
                          {item.type === 'out' ? '-' : ''}{toNum(item.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ color: dark ? '#e2e8f0' : '#1e293b' }}>{formatCurrency(item.unitCost)}</TableCell>
                        <TableCell align="right" sx={{ color: dark ? '#e2e8f0' : '#1e293b' }}>{formatCurrency(item.totalCost)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={item.sourceType || item.referenceType || '-'} 
                            size="small" 
                            variant="outlined"
                            sx={{ borderColor: dark ? '#475569' : '#cbd5e1', color: dark ? '#cbd5e1' : '#475569' }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: dark ? '#e2e8f0' : '#1e293b' }}>{item.referenceNumber || item.reference || '-'}</TableCell>
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
              sx={{
                backgroundColor: dark ? '#0f172a' : '#f1f5f9',
                color: dark ? '#e2e8f0' : '#1e293b',
                borderTop: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  color: 'inherit',
                },
              }}
            />
          </Paper>
        </Box>
      </div>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={showAdjustmentDialog}
        onOpenChange={setShowAdjustmentDialog}
        onSuccess={() => {
          fetchMovements();
        }}
      />
    </Layout>
  );
}