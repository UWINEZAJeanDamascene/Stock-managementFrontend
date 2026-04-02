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
  CircularProgress,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Plus as PlusIcon,
  Edit as EditIcon,
  Trash2 as TrashIcon,
  RefreshCw as RefreshIcon,
  Package as PackageIcon,
} from 'lucide-react';
import { serialNumberApi, productsApi, warehousesApi } from '@/lib/api';
import { Layout } from '../layout/Layout';

interface SerialItem {
  _id: string;
  serialNo: string;
  product?: { _id: string; name: string; sku: string };
  warehouse?: { _id: string; name: string; code: string };
  unitCost?: number | string;
  status: string;
  notes?: string;
  createdAt: string;
}

export default function SerialNumbersPage() {
  const { t } = useTranslation();
  const [serials, setSerials] = useState<SerialItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    product: '',
    warehouse: '',
    serialNo: '',
    unitCost: '',
    notes: '',
  });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState({
    serialNo: '',
    unitCost: '',
    status: '',
    notes: '',
  });

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleteName, setDeleteName] = useState('');

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [pRes, wRes] = await Promise.all([
          productsApi.getAll({ limit: 1000 }),
          warehousesApi.getAll({}),
        ]);
        if (pRes.success) setProducts(pRes.data || []);
        if (wRes.success) setWarehouses((wRes as any).data || []);
      } catch { /* ignore */ }
    };
    loadFilters();
  }, []);

  const fetchSerials = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page: page + 1, limit };
      if (search) params.search = search;
      if (productFilter) params.product = productFilter;
      if (warehouseFilter) params.warehouse = warehouseFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await serialNumberApi.getAll(params);
      if (response.success) {
        setSerials((response.data as SerialItem[]) || []);
        setTotal(response.pagination?.total || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load serial numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSerials(); }, [page, limit, search, productFilter, warehouseFilter, statusFilter]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await serialNumberApi.create({
        product: createForm.product,
        warehouse: createForm.warehouse,
        serialNo: createForm.serialNo,
        unitCost: parseFloat(createForm.unitCost) || 0,
        notes: createForm.notes || undefined,
      });
      if (response.success) {
        setCreateOpen(false);
        setCreateForm({ product: '', warehouse: '', serialNo: '', unitCost: '', notes: '' });
        fetchSerials();
      } else {
        setError((response as any).message || 'Failed to create');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    setSaving(true);
    setError(null);
    try {
      const updateData: any = {};
      if (editForm.serialNo) updateData.serialNo = editForm.serialNo;
      if (editForm.unitCost) updateData.unitCost = parseFloat(editForm.unitCost);
      if (editForm.status) updateData.status = editForm.status;
      if (editForm.notes !== undefined) updateData.notes = editForm.notes;

      const response = await serialNumberApi.update(editId, updateData);
      if (response.success) {
        setEditOpen(false);
        fetchSerials();
      } else {
        setError((response as any).message || 'Failed to update');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://stock-tenancy-system.onrender.com/api'}/serial-numbers/${deleteId}`,
        { method: 'DELETE', credentials: 'include' }
      ).then(r => r.json());
      if (response.success) {
        setDeleteOpen(false);
        fetchSerials();
      } else {
        setError(response.message || 'Failed to delete');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: SerialItem) => {
    setEditId(item._id);
    setEditForm({
      serialNo: item.serialNo,
      unitCost: String(item.unitCost || ''),
      status: item.status,
      notes: item.notes || '',
    });
    setEditOpen(true);
  };

  const openDelete = (item: SerialItem) => {
    setDeleteId(item._id);
    setDeleteName(item.serialNo);
    setDeleteOpen(true);
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    const map: Record<string, any> = {
      in_stock: 'success',
      reserved: 'warning',
      dispatched: 'primary',
      returned: 'default',
      scrapped: 'error',
    };
    return map[status] || 'default';
  };

  const statusOptions = ['in_stock', 'reserved', 'dispatched', 'returned', 'scrapped'];

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PackageIcon size={24} />
            {t('serialNumbers.title', 'Serial Numbers')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchSerials}>
              {t('common.refresh', 'Refresh')}
            </Button>
            <Button variant="contained" startIcon={<PlusIcon />} onClick={() => setCreateOpen(true)}>
              {t('serialNumbers.add', 'Add Serial')}
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              placeholder={t('serialNumbers.search', 'Search serial...')}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              size="small"
              sx={{ minWidth: 200 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon size={18} /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('serialNumbers.product', 'Product')}</InputLabel>
              <Select value={productFilter} label={t('serialNumbers.product', 'Product')} onChange={(e) => { setProductFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('common.all', 'All')}</MenuItem>
                {products.map((p: any) => <MenuItem key={p._id} value={p._id}>{p.name} ({p.sku})</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('serialNumbers.warehouse', 'Warehouse')}</InputLabel>
              <Select value={warehouseFilter} label={t('serialNumbers.warehouse', 'Warehouse')} onChange={(e) => { setWarehouseFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('common.all', 'All')}</MenuItem>
                {warehouses.map((w: any) => <MenuItem key={w._id} value={w._id}>{w.name} ({w.code})</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>{t('serialNumbers.status', 'Status')}</InputLabel>
              <Select value={statusFilter} label={t('serialNumbers.status', 'Status')} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('common.all', 'All')}</MenuItem>
                {statusOptions.map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('serialNumbers.serialNo', 'Serial No')}</TableCell>
                <TableCell>{t('serialNumbers.product', 'Product')}</TableCell>
                <TableCell>{t('serialNumbers.warehouse', 'Warehouse')}</TableCell>
                <TableCell align="right">{t('serialNumbers.unitCost', 'Unit Cost')}</TableCell>
                <TableCell>{t('serialNumbers.status', 'Status')}</TableCell>
                <TableCell align="center">{t('common.actions', 'Actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell></TableRow>
              ) : serials.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><Typography color="text.secondary">{t('serialNumbers.noSerials', 'No serial numbers found')}</Typography></TableCell></TableRow>
              ) : (
                serials.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell><Typography fontWeight="medium">{item.serialNo}</Typography></TableCell>
                    <TableCell>
                      {item.product?.name || '-'}
                      <Typography variant="caption" display="block" color="text.secondary">{item.product?.sku}</Typography>
                    </TableCell>
                    <TableCell>
                      {item.warehouse?.name || '-'}
                      <Typography variant="caption" display="block" color="text.secondary">{item.warehouse?.code}</Typography>
                    </TableCell>
                    <TableCell align="right">{Number(item.unitCost || 0).toLocaleString()}</TableCell>
                    <TableCell><Chip label={item.status.replace('_', ' ')} color={getStatusColor(item.status)} size="small" /></TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => openEdit(item)} title={t('common.edit', 'Edit')}><EditIcon size={16} /></IconButton>
                      <IconButton size="small" onClick={() => openDelete(item)} title={t('common.delete', 'Delete')} color="error"><TrashIcon size={16} /></IconButton>
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
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </TableContainer>

        {/* Create Dialog */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('serialNumbers.create', 'Add Serial Number')}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <FormControl fullWidth required>
                <InputLabel>{t('serialNumbers.product', 'Product')}</InputLabel>
                <Select value={createForm.product} label={t('serialNumbers.product', 'Product')} onChange={(e) => setCreateForm({ ...createForm, product: e.target.value })}>
                  {products.filter((p: any) => p.trackingType === 'serial').map((p: any) => <MenuItem key={p._id} value={p._id}>{p.name} ({p.sku})</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>{t('serialNumbers.warehouse', 'Warehouse')}</InputLabel>
                <Select value={createForm.warehouse} label={t('serialNumbers.warehouse', 'Warehouse')} onChange={(e) => setCreateForm({ ...createForm, warehouse: e.target.value })}>
                  {warehouses.map((w: any) => <MenuItem key={w._id} value={w._id}>{w.name} ({w.code})</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label={t('serialNumbers.serialNo', 'Serial Number')} value={createForm.serialNo} onChange={(e) => setCreateForm({ ...createForm, serialNo: e.target.value })} fullWidth required />
              <TextField label={t('serialNumbers.unitCost', 'Unit Cost')} type="number" value={createForm.unitCost} onChange={(e) => setCreateForm({ ...createForm, unitCost: e.target.value })} fullWidth required />
              <TextField label={t('common.notes', 'Notes')} value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} fullWidth multiline rows={2} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button onClick={handleCreate} variant="contained" disabled={saving || !createForm.product || !createForm.warehouse || !createForm.serialNo}>
              {saving ? <CircularProgress size={20} /> : t('common.create', 'Create')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{t('serialNumbers.edit', 'Edit Serial Number')}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField label={t('serialNumbers.serialNo', 'Serial Number')} value={editForm.serialNo} onChange={(e) => setEditForm({ ...editForm, serialNo: e.target.value })} fullWidth />
              <TextField label={t('serialNumbers.unitCost', 'Unit Cost')} type="number" value={editForm.unitCost} onChange={(e) => setEditForm({ ...editForm, unitCost: e.target.value })} fullWidth />
              <FormControl fullWidth>
                <InputLabel>{t('serialNumbers.status', 'Status')}</InputLabel>
                <Select value={editForm.status} label={t('serialNumbers.status', 'Status')} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  {statusOptions.map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label={t('common.notes', 'Notes')} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} fullWidth multiline rows={2} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button onClick={handleEdit} variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : t('common.save', 'Save')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>{t('serialNumbers.confirmDelete', 'Confirm Delete')}</DialogTitle>
          <DialogContent>
            <Typography>{t('serialNumbers.deleteConfirm', 'Are you sure you want to delete serial number')} <strong>{deleteName}</strong>?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button onClick={handleDelete} variant="contained" color="error" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : t('common.delete', 'Delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
