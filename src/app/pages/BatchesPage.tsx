import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  CircularProgress,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  ShieldAlert as QuarantineIcon,
  ShieldCheck as UnquarantineIcon,
  RefreshCw as RefreshIcon,
} from 'lucide-react';
import { stockBatchApi, StockBatch, warehousesApi } from '@/lib/api';
import { Layout } from '../layout/Layout';

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

export default function BatchesPage() {
  const { t } = useTranslation();
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [quarantinedFilter, setQuarantinedFilter] = useState<'' | 'true' | 'false'>('');
  const [expiryFilter, setExpiryFilter] = useState('');

  // Load products for filter
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'https://stock-tenancy-system.onrender.com/api'}/products?limit=1000`,
          { credentials: 'include' }
        );
        const data = await response.json();
        if (data.success && data.data) {
          setProducts(data.data);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    };
    loadProducts();
  }, []);

  // Load warehouses for filter
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

  // Load batches
  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit,
      };

      if (search) params.search = search;
      if (productFilter) params.product = productFilter;
      if (warehouseFilter) params.warehouse = warehouseFilter;

      const response = await stockBatchApi.getAll(params);

      if (response.success && response.data) {
        let filteredBatches = response.data;

        // Client-side filtering for isQuarantined (backend doesn't support this filter)
        if (quarantinedFilter !== '') {
          filteredBatches = filteredBatches.filter(
            (b) => String(b.isQuarantined) === quarantinedFilter
          );
        }

        // Client-side filtering for expiry_before (backend doesn't support this filter)
        if (expiryFilter) {
          const expiryDate = new Date(expiryFilter);
          filteredBatches = filteredBatches.filter((b) => {
            if (!b.expiryDate) return false;
            return new Date(b.expiryDate) <= expiryDate;
          });
        }

        setBatches(filteredBatches);
        setTotal(response.pagination?.total || filteredBatches.length);
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [page, limit, search, productFilter, warehouseFilter]);

  // Handle page change
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLimit(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Toggle quarantine
  const handleToggleQuarantine = async (batchId: string) => {
    setUpdating(batchId);
    try {
      const response = await stockBatchApi.toggleQuarantine(batchId);
      if (response.success) {
        // Update the batch in the list
        setBatches((prev) =>
          prev.map((b) =>
            b._id === batchId ? { ...b, isQuarantined: response.data.isQuarantined } : b
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle quarantine:', err);
    } finally {
      setUpdating(null);
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  // Check if batch is expired
  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Check if batch is nearing expiry (within 30 days)
  const isNearingExpiry = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date(expiryDate) <= thirtyDaysFromNow && new Date(expiryDate) > new Date();
  };

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1">
            {t('common.batches.title') || 'Batches'}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchBatches}
          >
            {t('common.refresh') || 'Refresh'}
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <TextField
              placeholder={t('common.batches.searchBatch') || 'Search batch...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={18} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Product Filter */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('common.batches.product') || 'Product'}</InputLabel>
              <Select
                value={productFilter}
                label={t('common.batches.product') || 'Product'}
                onChange={(e) => setProductFilter(e.target.value)}
              >
                <MenuItem value="">{t('common.all') || 'All'}</MenuItem>
                {products.map((p) => (
                  <MenuItem key={p._id} value={p._id}>
                    {p.name} ({p.sku})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Warehouse Filter */}
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('common.batches.warehouse') || 'Warehouse'}</InputLabel>
              <Select
                value={warehouseFilter}
                label={t('common.batches.warehouse') || 'Warehouse'}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                <MenuItem value="">{t('common.all') || 'All'}</MenuItem>
                {warehouses.map((w) => (
                  <MenuItem key={w._id} value={w._id}>
                    {w.name} ({w.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Quarantined Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>{t('common.batches.quarantined') || 'Quarantined'}</InputLabel>
              <Select
                value={quarantinedFilter}
                label={t('common.batches.quarantined') || 'Quarantined'}
                onChange={(e) => setQuarantinedFilter(e.target.value as '' | 'true' | 'false')}
              >
                <MenuItem value="">{t('common.all') || 'All'}</MenuItem>
                <MenuItem value="true">{t('common.yes') || 'Yes'}</MenuItem>
                <MenuItem value="false">{t('common.no') || 'No'}</MenuItem>
              </Select>
            </FormControl>

            {/* Expiry Before Filter */}
            <TextField
              type="date"
              label={t('common.batches.expiryBefore') || 'Expiry Before'}
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              size="small"
              sx={{ minWidth: 180 }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('common.batches.batchNo') || 'Batch No'}</TableCell>
                <TableCell>{t('common.batches.product') || 'Product'}</TableCell>
                <TableCell>{t('common.batches.warehouse') || 'Warehouse'}</TableCell>
                <TableCell align="right">{t('common.batches.qtyOnHand') || 'Qty On Hand'}</TableCell>
                <TableCell align="right">{t('common.batches.unitCost') || 'Unit Cost'}</TableCell>
                <TableCell>{t('common.batches.manufactureDate') || 'Manufacture Date'}</TableCell>
                <TableCell>{t('common.batches.expiryDate') || 'Expiry Date'}</TableCell>
                <TableCell>{t('common.batches.quarantined') || 'Quarantined'}</TableCell>
                <TableCell align="center">{t('common.actions') || 'Actions'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {t('common.batches.noBatches') || 'No batches found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow
                    key={batch._id}
                    sx={{
                      backgroundColor: isExpired(batch.expiryDate)
                        ? 'error.light'
                        : isNearingExpiry(batch.expiryDate)
                        ? 'warning.light'
                        : batch.isQuarantined
                        ? 'action.hover'
                        : 'inherit',
                    }}
                  >
                    <TableCell>{batch.batchNo}</TableCell>
                    <TableCell>
                      {batch.product?.name}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {batch.product?.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {batch.warehouse?.name}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {batch.warehouse?.code}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{Number(batch.qtyOnHand || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">${Number(batch.unitCost || 0).toFixed(6)}</TableCell>
                    <TableCell>{formatDate(batch.manufactureDate)}</TableCell>
                    <TableCell>
                      <Typography
                        color={
                          isExpired(batch.expiryDate)
                            ? 'error'
                            : isNearingExpiry(batch.expiryDate)
                            ? 'warning'
                            : 'inherit'
                        }
                      >
                        {formatDate(batch.expiryDate)}
                      </Typography>
                      {isExpired(batch.expiryDate) && (
                        <Chip
                          label={t('common.batches.expired') || 'Expired'}
                          color="error"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {isNearingExpiry(batch.expiryDate) && !isExpired(batch.expiryDate) && (
                        <Chip
                          label={t('common.batches.expiringSoon') || 'Expiring Soon'}
                          color="warning"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {batch.isQuarantined ? (
                        <Chip
                          icon={<QuarantineIcon size={14} />}
                          label={t('common.yes') || 'Yes'}
                          color="error"
                          size="small"
                        />
                      ) : (
                        <Chip
                          label={t('common.no') || 'No'}
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleToggleQuarantine(batch._id)}
                        disabled={updating === batch._id}
                        title={
                          batch.isQuarantined
                            ? t('common.batches.unquarantine') || 'Remove Quarantine'
                            : t('common.batches.quarantine') || 'Quarantine'
                        }
                      >
                        {updating === batch._id ? (
                          <CircularProgress size={18} />
                        ) : batch.isQuarantined ? (
                          <UnquarantineIcon size={18} />
                        ) : (
                          <QuarantineIcon size={18} />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={total}
            rowsPerPage={limit}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      </Box>
    </Layout>
  );
}
