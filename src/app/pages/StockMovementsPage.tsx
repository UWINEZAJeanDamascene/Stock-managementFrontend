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
  Balance as BalanceIcon
} from '@mui/icons-material';
import { stockApi } from '@/lib/api';
import { Layout } from '../layout/Layout';

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

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function StockMovementsPage() {
  const { t } = useTranslation();
  const [movements, setMovements] = useState<StockMovement[]>([]);
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
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

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
    return <Chip label={typeLabels[type] || type} color={typeColors[type] || 'default'} size="small" />;
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
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <SwapVertIcon className="text-primary" style={{ fontSize: 32 }} />
            <Typography variant="h5" component="h1">
              {t('stockMovements.title', 'Stock Movements')}
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
            <TrendingUpIcon color="success" />
            <div>
              <Typography variant="body2" color="text.secondary">
                {t('stockMovements.totalIn', 'Total Stock In')}
              </Typography>
              <Typography variant="h6">{formatCurrency(totalIn)}</Typography>
            </div>
          </Paper>
          <Paper className="p-4 flex items-center gap-4">
            <TrendingDownIcon color="error" />
            <div>
              <Typography variant="body2" color="text.secondary">
                {t('stockMovements.totalOut', 'Total Stock Out')}
              </Typography>
              <Typography variant="h6">{formatCurrency(totalOut)}</Typography>
            </div>
          </Paper>
          <Paper className="p-4 flex items-center gap-4">
            <BalanceIcon color="warning" />
            <div>
              <Typography variant="body2" color="text.secondary">
                {t('stockMovements.totalAdjustments', 'Total Adjustments')}
              </Typography>
              <Typography variant="h6">{formatCurrency(totalAdjustments)}</Typography>
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            <TextField
              fullWidth
              size="small"
              placeholder={t('stockMovements.searchPlaceholder', 'Search product, reference...')}
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
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label={t('stockMovements.endDate', 'End Date')}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
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
                  <TableCell>{t('stockMovements.date', 'Date')}</TableCell>
                  <TableCell>{t('stockMovements.product', 'Product')}</TableCell>
                  <TableCell>{t('stockMovements.warehouse', 'Warehouse')}</TableCell>
                  <TableCell>{t('stockMovements.type', 'Type')}</TableCell>
                  <TableCell align="right">{t('stockMovements.quantity', 'Qty')}</TableCell>
                  <TableCell align="right">{t('stockMovements.unitCost', 'Unit Cost')}</TableCell>
                  <TableCell align="right">{t('stockMovements.totalCost', 'Total Cost')}</TableCell>
                  <TableCell>{t('stockMovements.sourceType', 'Source Type')}</TableCell>
                  <TableCell>{t('stockMovements.reference', 'Reference')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      {t('stockMovements.noData', 'No stock movements found')}
                    </TableCell>
                </TableRow>
                ) : (
                  movements.map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>
                        {item.movementDate || item.date ? new Date(item.movementDate || item.date!).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{item.product?.name || '-'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.product?.sku || ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {typeof item.warehouse === 'object' && item.warehouse?.name
                          ? item.warehouse.name
                          : typeof item.warehouse === 'string' && item.warehouse
                            ? item.warehouse
                            : '-'}
                      </TableCell>
                      <TableCell>{getTypeChip(item.type)}</TableCell>
                      <TableCell 
                        align="right"
                        sx={{ 
                          color: item.type === 'out' ? 'error.main' : 'inherit',
                          fontWeight: item.type === 'out' ? 'bold' : 'normal'
                        }}
                      >
                        {item.type === 'out' ? '-' : ''}{toNum(item.quantity).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.totalCost)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={item.sourceType || item.referenceType || '-'} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{item.referenceNumber || item.reference || '-'}</TableCell>
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