import { useState, useEffect, useCallback } from 'react';
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
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Plus as PlusIcon,
  Eye as EyeIcon,
  CheckCircle as CheckCircleIcon,
  ClipboardList as ClipboardListIcon,
  FilterX as FilterXIcon,
} from 'lucide-react';
import { stockAuditApi, StockAudit, warehousesApi } from '@/lib/api';
import { Layout } from '../layout/Layout';

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  draft: 'default',
  counting: 'warning',
  posted: 'success',
  cancelled: 'error',
};

export default function AuditsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [audits, setAudits] = useState<StockAudit[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 50,
    pages: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Post dialog
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<StockAudit | null>(null);
  const [postLoading, setPostLoading] = useState(false);

  // Load warehouses
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const response = await warehousesApi.getAll({});
        if (response.success && (response as any).data) {
          const warehousesData = Array.isArray((response as any).data) 
            ? (response as any).data 
            : [];
          setWarehouses(warehousesData);
        }
      } catch (err) {
        console.error('Failed to load warehouses:', err);
      }
    };
    loadWarehouses();
  }, []);

  // Load audits
  const loadAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      };
      if (statusFilter) params.status = statusFilter;
      if (warehouseFilter) params.warehouse = warehouseFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await stockAuditApi.getAll(params);
      if (response.success) {
        setAudits(response.data || []);
        setPagination((prev) => ({
          ...prev,
          total: response.total || 0,
          pages: response.pages || 0,
        }));
      } else {
        setError(t('common.stockAudits.loadError'));
      }
    } catch (err) {
      console.error('Failed to load audits:', err);
      setError(t('common.stockAudits.loadError'));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, warehouseFilter, dateFrom, dateTo, t]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  // Handle page change
  const handlePageChange = (_: unknown, newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage + 1 }));
  };

  // Handle rows per page change
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPagination((prev) => ({ ...prev, limit: parseInt(event.target.value, 10), page: 1 }));
  };

  // Clear filters
  const handleClearFilters = () => {
    setStatusFilter('');
    setWarehouseFilter('');
    setDateFrom('');
    setDateTo('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle view action
  const handleView = (audit: StockAudit) => {
    navigate(`/stock-audits/${audit._id}`);
  };

  // Handle post action
  const handlePostClick = (audit: StockAudit) => {
    setSelectedAudit(audit);
    setPostDialogOpen(true);
  };

  // Confirm post
  const handleConfirmPost = async () => {
    if (!selectedAudit) return;

    setPostLoading(true);
    try {
      const response = await stockAuditApi.post(selectedAudit._id);
      if (response.success) {
        setPostDialogOpen(false);
        setSelectedAudit(null);
        loadAudits();
      } else {
        setError(response.message || t('common.stockAudits.postError'));
      }
    } catch (err) {
      console.error('Failed to post audit:', err);
      setError(t('common.stockAudits.postError'));
    } finally {
      setPostLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Format currency
  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  };

  // Check if has active filters
  const hasActiveFilters = statusFilter || warehouseFilter || dateFrom || dateTo;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ClipboardListIcon size={28} />
            <Typography variant="h5" component="h1">
              {t('common.stockAudits.title')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            onClick={() => navigate('/stock-audits/new')}
          >
            {t('common.stockAudits.newAudit')}
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>{t('common.stockAudits.status')}</InputLabel>
              <Select
                value={statusFilter}
                label={t('common.stockAudits.status')}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="draft">{t('common.stockAudits.statuses.draft')}</MenuItem>
                <MenuItem value="counting">{t('common.stockAudits.statuses.counting')}</MenuItem>
                <MenuItem value="posted">{t('common.stockAudits.statuses.posted')}</MenuItem>
                <MenuItem value="cancelled">{t('common.stockAudits.statuses.cancelled')}</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('common.stockAudits.warehouse')}</InputLabel>
              <Select
                value={warehouseFilter}
                label={t('common.stockAudits.warehouse')}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                <MenuItem value="">{t('common.all')}</MenuItem>
                {warehouses.map((wh) => (
                  <MenuItem key={wh._id} value={wh._id}>
                    {wh.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="date"
              size="small"
              label={t('common.stockAudits.dateFrom')}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />

            <TextField
              type="date"
              size="small"
              label={t('common.stockAudits.dateTo')}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 160 }}
            />

            {hasActiveFilters && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterXIcon size={16} />}
                onClick={handleClearFilters}
              >
                {t('common.clearFilters')}
              </Button>
            )}
          </Box>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Table */}
        {!loading && (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('common.stockAudits.reference')}</TableCell>
                    <TableCell>{t('common.stockAudits.warehouse')}</TableCell>
                    <TableCell>{t('common.stockAudits.auditDate')}</TableCell>
                    <TableCell>{t('common.stockAudits.status')}</TableCell>
                    <TableCell align="right">{t('common.stockAudits.totalVarianceValue')}</TableCell>
                    <TableCell>{t('common.stockAudits.postedBy')}</TableCell>
                    <TableCell align="center">{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {audits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          {t('common.stockAudits.noAudits')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    audits.map((audit) => (
                      <TableRow key={audit._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {audit.referenceNo}
                          </Typography>
                        </TableCell>
                        <TableCell>{audit.warehouse?.name || '-'}</TableCell>
                        <TableCell>{formatDate(audit.auditDate)}</TableCell>
                        <TableCell>
                          <Chip
                            label={t(`common.stockAudits.statuses.${audit.status}`)}
                            color={STATUS_COLORS[audit.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(audit.totalVarianceValue)}
                        </TableCell>
                        <TableCell>{audit.postedBy?.name || '-'}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            {/* View button - always visible */}
                            <IconButton
                              size="small"
                              onClick={() => handleView(audit)}
                              title={t('common.view')}
                            >
                              <EyeIcon size={18} />
                            </IconButton>

                            {/* Post button - only for counting status */}
                            {audit.status === 'counting' && (
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handlePostClick(audit)}
                                title={t('common.stockAudits.post')}
                              >
                                <CheckCircleIcon size={18} />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
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
        )}

        {/* Post Confirmation Dialog */}
        <Dialog open={postDialogOpen} onClose={() => setPostDialogOpen(false)}>
          <DialogTitle>{t('common.stockAudits.postConfirmTitle')}</DialogTitle>
          <DialogContent>
            <Typography>
              {t('common.stockAudits.postConfirmMessage', {
                reference: selectedAudit?.referenceNo,
                variance: formatCurrency(selectedAudit?.totalVarianceValue || '0'),
              })}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPostDialogOpen(false)} disabled={postLoading}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirmPost}
              variant="contained"
              color="success"
              disabled={postLoading}
            >
              {postLoading ? <CircularProgress size={20} /> : t('common.stockAudits.post')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
