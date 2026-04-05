import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { salesOrdersApi, clientsApi, productsApi, quotationsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Package
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';

// Helper to safely convert values to numbers
const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  return 0;
};

interface Client {
  _id: string;
  name: string;
  code?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  unit: string;
}

interface Quotation {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
  };
}

interface LineItem {
  id: string;
  product: string;
  description: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  lineTotal: number;
}

export default function SalesOrderCreatePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  
  const [formData, setFormData] = useState({
    client: '',
    quotation: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    currencyCode: 'USD',
    terms: '',
    notes: '',
  });

  const [lines, setLines] = useState<LineItem[]>([
    { id: '1', product: '', description: '', qty: 1, unitPrice: 0, discountPct: 0, taxRate: 0, lineTotal: 0 }
  ]);

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchQuotations();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await clientsApi.getAll({ limit: 1000, isActive: true });
      if (response.success) {
        setClients(response.data as Client[]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsApi.getAll({ limit: 1000 });
      if (response.success) {
        setProducts((response.data as Product[]) || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await quotationsApi.getAll({ status: 'accepted', limit: 100 });
      if (response.success) {
        setQuotations((response.data as Quotation[]) || []);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    }
  };

  const addLine = () => {
    const newLine: LineItem = {
      id: Date.now().toString(),
      product: '',
      description: '',
      qty: 1,
      unitPrice: 0,
      discountPct: 0,
      taxRate: 0,
      lineTotal: 0,
    };
    setLines([...lines, newLine]);
  };

  const removeLine = (id: string) => {
    if (lines.length === 1) return;
    setLines(lines.filter(line => line.id !== id));
  };

  const updateLine = (id: string, field: keyof LineItem, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      
      const updated = { ...line, [field]: value };
      
      if (field === 'product') {
        const product = products.find(p => p._id === value);
        if (product) {
          updated.description = product.name;
          updated.unitPrice = product.sellingPrice || 0;
        }
      }
      
      // Ensure all numeric values are actually numbers
      const qty = Number(updated.qty) || 0;
      const unitPrice = Number(updated.unitPrice) || 0;
      const discount = Number(updated.discountPct) || 0;
      const taxRate = Number(updated.taxRate) || 0;
      
      const subtotal = qty * unitPrice;
      const discountAmount = subtotal * (discount / 100);
      const netAmount = subtotal - discountAmount;
      const taxAmount = netAmount * (taxRate / 100);
      updated.lineTotal = netAmount + taxAmount;
      
      return updated;
    }));
  };

  const handleQuotationChange = async (quotationId: string) => {
    const actualValue = quotationId === '_none' ? '' : quotationId;
    setFormData(prev => ({ ...prev, quotation: actualValue }));
    
    if (!actualValue) return;
    
    try {
      const response = await quotationsApi.getById(quotationId);
      if (response.success) {
        const quotation = response.data as any;
        if (quotation.client?._id) {
          setFormData(prev => ({ ...prev, client: quotation.client._id }));
        }
        if (quotation.lines) {
          setLines(quotation.lines.map((line: any, index: number) => ({
            id: (index + 1).toString(),
            product: line.product?._id || line.product,
            description: line.description || line.product?.name || '',
            qty: line.qty || line.quantity || 1,
            unitPrice: line.unitPrice || 0,
            discountPct: line.discountPct || 0,
            taxRate: line.taxRate || 0,
            lineTotal: (line.qty || 1) * (line.unitPrice || 0),
          })));
        }
      }
    } catch (error) {
      console.error('Error loading quotation:', error);
    }
  };

  const calculateTotals = () => {
    console.log('[calculateTotals] Lines:', lines);
    const subtotal = lines.reduce((sum, line) => {
      const qty = toNumber(line.qty);
      const unitPrice = toNumber(line.unitPrice);
      const discount = toNumber(line.discountPct);
      const lineSum = (qty * unitPrice) * (1 - discount / 100);
      return sum + lineSum;
    }, 0);
    const taxTotal = lines.reduce((sum, line) => {
      const qty = toNumber(line.qty);
      const unitPrice = toNumber(line.unitPrice);
      const discount = toNumber(line.discountPct);
      const taxRate = toNumber(line.taxRate);
      const netAmount = (qty * unitPrice) * (1 - discount / 100);
      const taxAmount = netAmount * (taxRate / 100);
      return sum + taxAmount;
    }, 0);
    const grandTotal = Number(subtotal) + Number(taxTotal);
    return { subtotal, taxTotal, grandTotal };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client) {
      toast.error('Please select a client');
      return;
    }

    if (lines.some(line => !line.product)) {
      toast.error('Please select a product for all lines');
      return;
    }

    try {
      setLoading(true);
      
      const { subtotal, taxTotal, grandTotal } = calculateTotals();
      
      const payload = {
        ...formData,
        lines: lines.map(line => ({
          product: line.product,
          description: line.description,
          qty: line.qty,
          unitPrice: line.unitPrice,
          discountPct: line.discountPct,
          taxRate: line.taxRate,
          lineTotal: line.lineTotal,
        })),
        subtotal,
        taxTotal,
        grandTotal,
      };

      const response = await salesOrdersApi.create(payload);
      
      if (response.success) {
        toast.success('Sales order created successfully');
        navigate('/sales-orders');
      }
    } catch (error: any) {
      console.error('Error creating sales order:', error);
      toast.error(error.message || 'Failed to create sales order');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxTotal, grandTotal } = calculateTotals();

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/sales-orders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Create Sales Order</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Convert from Quotation</Label>
                      <Select value={formData.quotation || '_none'} onValueChange={handleQuotationChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select quotation (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {quotations.map((quotation) => (
                            <SelectItem key={quotation._id} value={quotation._id}>
                              {quotation.referenceNo} - {quotation.client?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Client <span className="text-red-500">*</span></Label>
                      <Select value={formData.client} onValueChange={(value) => setFormData({ ...formData, client: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client._id} value={client._id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Order Date <span className="text-red-500">*</span></Label>
                      <Input
                        type="date"
                        value={formData.orderDate}
                        onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Expected Date</Label>
                      <Input
                        type="date"
                        value={formData.expectedDate}
                        onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={formData.currencyCode} onValueChange={(value) => setFormData({ ...formData, currencyCode: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="RWF">RWF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Terms & Conditions</Label>
                    <Textarea
                      value={formData.terms}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Line Items</CardTitle>
                  <Button type="button" onClick={addLine} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lines.map((line, index) => (
                      <div key={line.id} className="grid grid-cols-12 gap-2 items-end border p-4 rounded-lg">
                        <div className="col-span-4">
                          <Label className="text-xs">Product</Label>
                          <Select value={line.product} onValueChange={(value) => updateLine(line.id, 'product', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product._id} value={product._id}>
                                  {product.name} ({product.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={(e) => updateLine(line.id, 'qty', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs">Discount %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={line.discountPct}
                            onChange={(e) => updateLine(line.id, 'discountPct', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="col-span-1">
                          <Label className="text-xs">Tax %</Label>
                          <Input
                            type="number"
                            min="0"
                            value={line.taxRate}
                            onChange={(e) => updateLine(line.id, 'taxRate', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length === 1}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="col-span-12 text-right text-sm text-gray-600">
                          Line Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currencyCode }).format(toNumber(line.lineTotal) || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-xs text-gray-400 mb-2">
                    Debug: {JSON.stringify({subtotal, taxTotal, grandTotal, linesCount: lines.length})}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currencyCode || 'RWF' }).format(Number(subtotal) || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currencyCode || 'RWF' }).format(Number(taxTotal) || 0)}
                    </span>
                  </div>
                  <div className="border-t pt-4 flex justify-between text-lg font-bold">
                    <span>Grand Total:</span>
                    <span>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: formData.currencyCode || 'RWF' }).format(Number(grandTotal) || 0)}
                    </span>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-2" />
                        Create Sales Order
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
