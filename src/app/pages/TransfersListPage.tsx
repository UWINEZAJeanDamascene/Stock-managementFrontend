import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
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
  IconButton
} from '@mui/material';
import { 
  Search as SearchIcon,
  Download as DownloadIcon,
  MoreHorizontal as MoreHorizontalIcon,
  Plus as PlusIcon,
  Eye as EyeIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Truck as TruckIcon
} from 'lucide-react';
import { stockApi } from '@/lib/api';
import { Layout } from '../layout/Layout';

interface TransferItem {
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  unitCost: number;
}

interface StockTransfer {
  _id: string;
  reference: string;
  fromWarehouse: {
    _id: string;
    name: string;
  };
  toWarehouse: {
    _id: string;
    name: string;
  };
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  transferDate: string;
  items: TransferItem[];
  journalEntry?: string;
  createdAt: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function TransfersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
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
  const [statusFilter, setStatusFilter] = useState('');
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState('');
  const [toWarehouseFilter, setToWarehouseFilter] = useState('');
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

  // Fetch transfers
  const fetchTransfers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await stockApi.getTransfers({
        status: statusFilter || undefined,
        fromWarehouse: fromWarehouseFilter || undefined,
        toWarehouse: toWarehouseFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit
      });
      
      if (response && response.success) {
        setTransfers(response.data as StockTransfer[]);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            ...response.pagination as PaginationInfo
          }));
        }
      } else if (response) {
        const errMsg = (response as { message?: string }).message;
        setError(errMsg || 'Failed to fetch transfers');
      }
    } catch (err) {
      console.error('[TransfersList] Error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [pagination.page, statusFilter, fromWarehouseFilter, toWarehouseFilter, startDate, endDate, debouncedSearch]);

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
      'Reference',
      'From Warehouse',
      'To Warehouse',
      'Status',
      'Date',
      'Lines Count',
      'Journal Entry'
    ];
    
    const rows = transfers.map(item => [
      item.reference,
      item.fromWarehouse?.name || '',
      item.toWarehouse?.name || '',
      item.status,
      new Date(item.transferDate).toLocaleDateString(),
      item.items?.length || 0,
      item.journalEntry || '-'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-transfers-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusChip = (status: string) => {
    const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
      draft: 'default',
      confirmed: 'primary',
      completed: 'success',
      cancelled: 'error'
    };
    const statusLabels: Record<string, string> = {
      draft: 'Draft',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return <Chip label={statusLabels[status] || status} color={statusColors[status] || 'default'} size="small" />;
  };

  const handleConfirm = async (id: string) => {
    try {
      await stockApi.approveTransfer(id);
      fetchTransfers();
    } catch (err) {
      console.error('Error confirming transfer:', err);
      setError('Failed to confirm transfer');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await stockApi.cancelTransfer(id);
      fetchTransfers();
    } catch (err) {
      console.error('Error cancelling transfer:', err);
      setError('Failed to cancel transfer');
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <TruckIcon className="text-primary" style={{ fontSize: 32 }} />
            <Typography variant="h5" component="h1">
              {t('transfers.title', 'Stock Transfers')}
            </Typography>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              {t('common.export', 'Export')}
            </Button>
            <Button
              variant="contained"
              startIcon={<PlusIcon />}
              onClick={() => navigate('/stock-transfers/new')}
            >
              {t('transfers.newTransfer', 'New Transfer')}
            </Button>
          </div>
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
              placeholder={t('transfers.searchPlaceholder', 'Search by reference...')}
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
              <InputLabel>{t('transfers.status', 'Status')}</InputLabel>
              <Select
                value={statusFilter}
                label={t('transfers.status', 'Status')}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">{t('common.all', 'All')}</MenuItem>
                <MenuItem value="draft">{t('transfers.draft', 'Draft')}</MenuItem>
                <MenuItem value="confirmed">{t('transfers.confirmed', 'Confirmed')}</MenuItem>
                <MenuItem value="completed">{t('transfers.completed', 'Completed')}</MenuItem>
                <MenuItem value="cancelled">{t('transfers.cancelled', 'Cancelled')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              size="small"
              type="date"
              label={t('transfers.startDate', 'Start Date')}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              size="small"
              type="date"
              label={t('transfers.endDate', 'End Date')}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setFromWarehouseFilter('');
                setToWarehouseFilter('');
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
                  <TableCell>{t('transfers.reference', 'Reference')}</TableCell>
                  <TableCell>{t('transfers.fromWarehouse', 'From Warehouse')}</TableCell>
                  <TableCell>{t('transfers.toWarehouse', 'To Warehouse')}</TableCell>
                  <TableCell>{t('transfers.status', 'Status')}</TableCell>
                  <TableCell>{t('transfers.date', 'Date')}</TableCell>
                  <TableCell align="center">{t('transfers.linesCount', 'Lines')}</TableCell>
                  <TableCell>{t('transfers.journalEntry', 'Journal Entry')}</TableCell>
                  <TableCell align="right">{t('common.actions', 'Actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                </TableRow>
                ) : transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      {t('transfers.noData', 'No transfers found')}
                    </TableCell>
                </TableRow>
                ) : (
                  transfers.map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.reference}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.fromWarehouse?.name || '-'}</TableCell>
                      <TableCell>{item.toWarehouse?.name || '-'}</TableCell>
                      <TableCell>{getStatusChip(item.status)}</TableCell>
                      <TableCell>
                        {item.transferDate ? new Date(item.transferDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={item.items?.length || 0} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{item.journalEntry || '-'}</TableCell>
                      <TableCell align="right">
                        <div className="flex items-center gap-1">
                          <Button
                            size="small"
                            startIcon={<EyeIcon />}
                            onClick={() => navigate(`/stock-transfers/${item._id}`)}
                          >
                            {t('common.view', 'View')}
                          </Button>
                          {item.status === 'draft' && (
                            <Button
                              size="small"
                              color="success"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleConfirm(item._id)}
                            >
                              {t('transfers.confirm', 'Confirm')}
                            </Button>
                          )}
                          {item.status === 'confirmed' && (
                            <Button
                              size="small"
                              color="error"
                              startIcon={<XCircleIcon />}
                              onClick={() => handleCancel(item._id)}
                            >
                              {t('transfers.cancel', 'Cancel')}
                            </Button>
                          )}
                        </div>
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