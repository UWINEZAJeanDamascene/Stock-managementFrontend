import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { 
  Paper,
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  Save as SaveIcon,
  ArrowLeft as ArrowLeftIcon
} from 'lucide-react';
import { stockApi, productsApi } from '@/lib/api';
import { Layout } from '../layout/Layout';

interface Product {
  _id: string;
  name: string;
  sku: string;
  currentStock: number;
  averageCost: number;
}

interface Warehouse {
  _id: string;
  name: string;
}

interface TransferItem {
  product: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitCost: number;
}

interface JournalEntry {
  _id: string;
  reference: string;
}

export default function TransferCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form data
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  
  // Dropdown data
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  
  // Success dialog
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [journalEntry, setJournalEntry] = useState<JournalEntry | null>(null);

  // Fetch products and warehouses
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, warehousesRes] = await Promise.all([
          productsApi.getAll({ limit: 1000 }),
          stockApi.getLevels({ limit: 1000 })
        ]);
        
        if (productsRes.success) {
          setProducts(productsRes.data as Product[]);
        }
        
        if (warehousesRes.success && warehousesRes.warehouses) {
          setWarehouses(warehousesRes.warehouses as Warehouse[]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    
    fetchData();
  }, []);

  const handleAddItem = () => {
    if (!selectedProduct) return;
    
    const product = products.find(p => p._id === selectedProduct);
    if (!product) return;
    
    const newItem: TransferItem = {
      product: product._id,
      productName: product.name,
      productSku: product.sku,
      quantity: 1,
      unitCost: product.averageCost || 0
    };
    
    setItems([...items, newItem]);
    setSelectedProduct('');
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof TransferItem, value: number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!fromWarehouse || !toWarehouse || items.length === 0) {
      setError('Please fill in all required fields and add at least one item');
      return;
    }
    
    if (fromWarehouse === toWarehouse) {
      setError('From and To warehouses must be different');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await stockApi.createTransfer({
        fromWarehouse,
        toWarehouse,
        transferDate,
        notes: notes || undefined,
        items: items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unitCost: item.unitCost
        }))
      });
      
      if (response.success) {
        const data = response.data as { journalEntry?: JournalEntry; _id: string };
        setJournalEntry(data.journalEntry || null);
        setShowSuccessDialog(true);
      } else {
        setError((response as { message?: string }).message || 'Failed to create transfer');
      }
    } catch (err) {
      console.error('Error creating transfer:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    navigate('/stock-transfers');
  };

  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            startIcon={<ArrowLeftIcon />}
            onClick={() => navigate('/stock-transfers')}
          >
            {t('common.back', 'Back')}
          </Button>
          <Typography variant="h5" component="h1">
            {t('transfers.newTransfer', 'New Stock Transfer')}
          </Typography>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transfer Details */}
          <Paper className="p-4">
            <Typography variant="h6" className="mb-4">
              {t('transfers.transferDetails', 'Transfer Details')}
            </Typography>
            
            <div className="space-y-4">
              <FormControl fullWidth required>
                <InputLabel>{t('transfers.fromWarehouse', 'From Warehouse')}</InputLabel>
                <Select
                  value={fromWarehouse}
                  label={t('transfers.fromWarehouse', 'From Warehouse')}
                  onChange={(e) => setFromWarehouse(e.target.value)}
                >
                  {warehouses.map(wh => (
                    <MenuItem key={wh._id} value={wh._id}>{wh.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth required>
                <InputLabel>{t('transfers.toWarehouse', 'To Warehouse')}</InputLabel>
                <Select
                  value={toWarehouse}
                  label={t('transfers.toWarehouse', 'To Warehouse')}
                  onChange={(e) => setToWarehouse(e.target.value)}
                >
                  {warehouses.map(wh => (
                    <MenuItem key={wh._id} value={wh._id}>{wh.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                type="date"
                label={t('transfers.transferDate', 'Transfer Date')}
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label={t('transfers.notes', 'Notes')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </Paper>

          {/* Transfer Items */}
          <Paper className="p-4">
            <Typography variant="h6" className="mb-4">
              {t('transfers.items', 'Transfer Items')}
            </Typography>
            
            {/* Add Product */}
            <div className="flex gap-2 mb-4">
              <FormControl fullWidth>
                <InputLabel>{t('transfers.selectProduct', 'Select Product')}</InputLabel>
                <Select
                  value={selectedProduct}
                  label={t('transfers.selectProduct', 'Select Product')}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  {products.map(p => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.name} ({p.sku})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleAddItem}
                disabled={!selectedProduct}
              >
                <PlusIcon />
              </Button>
            </div>

            {/* Items Table */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('transfers.product', 'Product')}</TableCell>
                    <TableCell align="right">{t('transfers.quantity', 'Qty')}</TableCell>
                    <TableCell align="right">{t('transfers.unitCost', 'Unit Cost')}</TableCell>
                    <TableCell align="right">{t('transfers.total', 'Total')}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        {t('transfers.noItems', 'No items added')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">{item.productName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.productSku}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            inputProps={{ min: 1 }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={item.unitCost}
                            onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                            inputProps={{ min: 0, step: 0.01 }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          ${(item.quantity * item.unitCost).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => handleRemoveItem(index)}>
                            <TrashIcon size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {items.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <strong>{t('transfers.total', 'Total')}:</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>${totalValue.toFixed(2)}</strong>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outlined"
            onClick={() => navigate('/stock-transfers')}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={loading || !fromWarehouse || !toWarehouse || items.length === 0}
          >
            {loading ? t('common.saving', 'Saving...') : t('transfers.create', 'Create Transfer')}
          </Button>
        </div>

        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onClose={handleSuccessClose}>
          <DialogTitle>{t('transfers.success', 'Transfer Created Successfully')}</DialogTitle>
          <DialogContent>
            <Typography paragraph>
              The stock transfer has been created successfully.
            </Typography>
            {journalEntry && (
              <Typography>
                <strong>Journal Entry:</strong> {journalEntry.reference}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSuccessClose} variant="contained">
              {t('common.ok', 'OK')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}