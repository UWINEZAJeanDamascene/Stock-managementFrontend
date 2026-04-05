import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { pickPackApi, salesOrdersApi, warehousesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft,
  Package,
  Loader2,
  User,
  Warehouse,
  Calendar
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
import { toast } from "sonner";

// Helper to convert MongoDB Decimal128 to number
const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && '$numberDecimal' in value) {
    return parseFloat(value.$numberDecimal);
  }
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

interface SalesOrder {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
  };
  lines: Array<{
    _id: string;
    product: {
      _id: string;
      name: string;
      sku: string;
    };
    description: string;
    qty: number;
    qtyReserved: number;
  }>;
  status: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code?: string;
}

export default function PickPackCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSalesOrderId = searchParams.get('salesOrderId');

  const [loading, setLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<SalesOrder | null>(null);

  const [formData, setFormData] = useState({
    salesOrder: preselectedSalesOrderId || '',
    warehouse: '',
    priority: 'normal',
    notes: '',
    expectedDate: '',
  });

  useEffect(() => {
    fetchSalesOrders();
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (preselectedSalesOrderId) {
      loadSalesOrder(preselectedSalesOrderId);
    }
  }, [preselectedSalesOrderId]);

  const fetchSalesOrders = async () => {
    console.log('[PickPackCreate] Fetching sales orders...');
    try {
      const response = await salesOrdersApi.getReadyForPicking();
      console.log('[PickPackCreate] Sales orders response:', response);
      if (response.success) {
        setSalesOrders(response.data as SalesOrder[]);
        console.log('[PickPackCreate] Set sales orders:', response.data);
      }
    } catch (error) {
      console.error('[PickPackCreate] Error fetching sales orders:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await warehousesApi.getAll({ isActive: true });
      if (response.success) {
        setWarehouses(response.data as Warehouse[]);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const loadSalesOrder = async (id: string) => {
    console.log('[PickPackCreate] Loading sales order:', id);
    try {
      const response = await salesOrdersApi.getById(id);
      console.log('[PickPackCreate] Sales order response:', response);
      if (response.success) {
        setSelectedSalesOrder(response.data as SalesOrder);
        console.log('[PickPackCreate] Set selected sales order');
      }
    } catch (error) {
      console.error('[PickPackCreate] Error loading sales order:', error);
      toast.error('Failed to load sales order details');
    }
  };

  const handleSalesOrderChange = async (id: string) => {
    console.log('[PickPackCreate] Sales order selected:', id);
    setFormData(prev => ({ ...prev, salesOrder: id }));
    if (id) {
      await loadSalesOrder(id);
    } else {
      setSelectedSalesOrder(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.salesOrder) {
      toast.error('Please select a sales order');
      return;
    }

    if (!formData.warehouse) {
      toast.error('Please select a warehouse');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        salesOrderId: formData.salesOrder,
        warehouseId: formData.warehouse,
        priority: formData.priority,
        notes: formData.notes,
        expectedDate: formData.expectedDate,
      };

      const response = await pickPackApi.create(payload);

      if (response.success) {
        toast.success('Pick & Pack task created successfully');
        navigate('/pick-packs');
      }
    } catch (error: any) {
      console.error('Error creating pick pack:', error);
      toast.error(error.message || 'Failed to create pick pack');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/pick-packs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Create Pick & Pack</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sales Order <span className="text-red-500">*</span></Label>
                      <div className="text-xs text-gray-400">Debug: {salesOrders.length} orders loaded</div>
                      <Select value={formData.salesOrder} onValueChange={handleSalesOrderChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sales order" />
                        </SelectTrigger>
                        <SelectContent className="z-50">
                          {salesOrders.length === 0 && (
                            <SelectItem value="_empty" disabled>No sales orders ready for picking</SelectItem>
                          )}
                          {salesOrders.map((order) => (
                            <SelectItem key={order._id} value={order._id}>
                              {order.referenceNo} - {order.client?.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500">
                        Only confirmed sales orders ready for picking are shown
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Warehouse <span className="text-red-500">*</span></Label>
                      <Select value={formData.warehouse} onValueChange={(value) => setFormData({ ...formData, warehouse: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse._id} value={warehouse._id}>
                              {warehouse.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Expected Completion Date</Label>
                      <Input
                        type="date"
                        value={formData.expectedDate}
                        onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Any special instructions for the warehouse team..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Selected Sales Order Lines */}
              {selectedSalesOrder && (
                <Card>
                  <CardHeader>
                    <CardTitle>Items to Pick</CardTitle>
                    <p className="text-sm text-gray-500">
                      From {selectedSalesOrder.referenceNo}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      {selectedSalesOrder.lines && selectedSalesOrder.lines.length > 0 ? (
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left py-2">Product</th>
                              <th className="text-right py-2">Qty Ordered</th>
                              <th className="text-right py-2">Qty Reserved</th>
                              <th className="text-right py-2">To Pick</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSalesOrder.lines.map((line, index) => (
                              <tr key={line._id || index} className="border-b last:border-0">
                                <td className="py-3">
                                  <div className="font-medium">{line.description || '-'}</div>
                                  <div className="text-sm text-gray-500">{line.product?.sku || '-'}</div>
                                </td>
                                <td className="text-right py-3">{toNumber(line.qty)}</td>
                                <td className="text-right py-3">{toNumber(line.qtyReserved)}</td>
                                <td className="text-right py-3 font-medium text-blue-600">
                                  {toNumber(line.qtyReserved)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-gray-500">No line items found in this sales order.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {selectedSalesOrder && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Order Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{selectedSalesOrder.client?.name}</p>
                        <p className="text-sm text-gray-500">Client</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{(selectedSalesOrder.lines?.length || 0)} items</p>
                        <p className="text-sm text-gray-500">Total Products</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{selectedSalesOrder.status}</p>
                        <p className="text-sm text-gray-500">Status</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !formData.salesOrder || !formData.warehouse}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-2" />
                        Create Pick & Pack
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Creates a pick & pack task for the warehouse team
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
