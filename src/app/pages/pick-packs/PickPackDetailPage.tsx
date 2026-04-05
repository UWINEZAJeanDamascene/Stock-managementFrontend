import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { pickPackApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft,
  Play,
  CheckCircle,
  Box,
  Truck,
  Loader2,
  Package,
  User,
  Warehouse,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Progress } from '@/app/components/ui/progress';
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

interface PickPackLine {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  description: string;
  qtyToPick: number;
  qtyPicked: number;
  qtyPacked: number;
  status: 'pending' | 'picking' | 'picked' | 'packed' | 'issue';
  location?: string;
}

interface PickPack {
  _id: string;
  referenceNo: string;
  salesOrder: {
    _id: string;
    referenceNo: string;
    client: {
      _id: string;
      name: string;
    };
  };
  warehouse: {
    _id: string;
    name: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
  };
  status: 'draft' | 'picking' | 'picked' | 'packed' | 'ready_for_delivery' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  pickingStartedAt?: string;
  pickingCompletedAt?: string;
  packingStartedAt?: string;
  packingCompletedAt?: string;
  packageCount: number;
  totalWeight: number;
  trackingNumber?: string;
  shippingMethod?: string;
  notes?: string;
  lines: PickPackLine[];
  deliveryNote?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  picking: 'bg-yellow-100 text-yellow-800',
  picked: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  ready_for_delivery: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function PickPackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pickPack, setPickPack] = useState<PickPack | null>(null);

  useEffect(() => {
    if (id) {
      fetchPickPack();
    }
  }, [id]);

  const fetchPickPack = async () => {
    try {
      setLoading(true);
      const response = await pickPackApi.getById(id as string);
      if (response.success) {
        setPickPack(response.data as PickPack);
      }
    } catch (error) {
      console.error('Error fetching pick pack:', error);
      toast.error('Failed to fetch pick pack details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPicking = async () => {
    try {
      const response = await pickPackApi.startPicking(id as string);
      if (response.success) {
        toast.success('Picking started');
        fetchPickPack();
      }
    } catch (error) {
      toast.error('Failed to start picking');
    }
  };

  const handleCompletePicking = async () => {
    try {
      const response = await pickPackApi.completePicking(id as string);
      if (response.success) {
        toast.success('Picking completed');
        fetchPickPack();
      }
    } catch (error) {
      toast.error('Failed to complete picking');
    }
  };

  const handleStartPacking = async () => {
    try {
      const response = await pickPackApi.startPacking(id as string);
      if (response.success) {
        toast.success('Packing started');
        fetchPickPack();
      }
    } catch (error) {
      toast.error('Failed to start packing');
    }
  };

  const handleCompletePacking = async () => {
    try {
      const response = await pickPackApi.completePacking(id as string);
      if (response.success) {
        toast.success('Packing completed - Delivery Note created');
        fetchPickPack();
      }
    } catch (error) {
      toast.error('Failed to complete packing');
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!pickPack) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Pick Pack Not Found</h2>
            <Button onClick={() => navigate('/pick-packs')} className="mt-4">
              Back to Pick Packs
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const pickedQty = pickPack.lines.reduce((sum, line) => sum + toNumber(line.qtyPicked), 0);
  const totalQty = pickPack.lines.reduce((sum, line) => sum + toNumber(line.qtyToPick), 0);
  const packedQty = pickPack.lines.reduce((sum, line) => sum + toNumber(line.qtyPacked), 0);

  return (
    <Layout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/pick-packs')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{pickPack.referenceNo}</h1>
              <p className="text-gray-500">Pick & Pack Task</p>
            </div>
          </div>
          <div className="flex gap-2">
            {pickPack.status === 'draft' && (
              <Button onClick={handleStartPicking}>
                <Play className="h-4 w-4 mr-2" />
                Start Picking
              </Button>
            )}
            {pickPack.status === 'picking' && (
              <Button onClick={handleCompletePicking}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Picking
              </Button>
            )}
            {pickPack.status === 'picked' && (
              <Button onClick={handleStartPacking}>
                <Play className="h-4 w-4 mr-2" />
                Start Packing
              </Button>
            )}
            {pickPack.status === 'packed' && (
              <Button onClick={handleCompletePacking}>
                <Truck className="h-4 w-4 mr-2" />
                Complete Packing
              </Button>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="mb-6 flex gap-2">
          <Badge className={`${STATUS_COLORS[pickPack.status]} text-lg px-4 py-2 capitalize`}>
            {pickPack.status.replace(/_/g, ' ')}
          </Badge>
          <Badge className={`${PRIORITY_COLORS[pickPack.priority]} capitalize`}>
            {pickPack.priority} Priority
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Picking Progress</span>
                    <span>{pickedQty} / {totalQty} items</span>
                  </div>
                  <Progress value={(pickedQty / totalQty) * 100} />
                </div>
                {(pickPack.status === 'packed' || pickPack.status === 'ready_for_delivery') && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Packing Progress</span>
                      <span>{packedQty} / {totalQty} items</span>
                    </div>
                    <Progress value={(packedQty / totalQty) * 100} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>Items to Process</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2">Product</th>
                        <th className="text-right py-2">To Pick</th>
                        <th className="text-right py-2">Picked</th>
                        <th className="text-right py-2">Packed</th>
                        <th className="text-center py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pickPack.lines.map((line) => (
                        <tr key={line._id} className="border-b last:border-0">
                          <td className="py-3">
                            <div className="font-medium">{line.description}</div>
                            <div className="text-sm text-gray-500">{line.product?.sku}</div>
                          </td>
                          <td className="text-right py-3">{toNumber(line.qtyToPick)}</td>
                          <td className="text-right py-3">{toNumber(line.qtyPicked)}</td>
                          <td className="text-right py-3">{toNumber(line.qtyPacked)}</td>
                          <td className="text-center py-3">
                            <Badge className="capitalize">{line.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{pickPack.salesOrder?.referenceNo}</p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-sm"
                      onClick={() => navigate(`/sales-orders/${pickPack.salesOrder?._id}`)}
                    >
                      View Sales Order
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{pickPack.salesOrder?.client?.name}</p>
                    <p className="text-sm text-gray-500">Client</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Warehouse</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Warehouse className="h-5 w-5 text-gray-400" />
                  <span>{pickPack.warehouse?.name}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipping Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span>{pickPack.shippingMethod || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Packages:</span>
                  <span>{toNumber(pickPack.packageCount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weight:</span>
                  <span>{toNumber(pickPack.totalWeight)} kg</span>
                </div>
                {pickPack.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tracking:</span>
                    <span>{pickPack.trackingNumber}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {pickPack.deliveryNote && (
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Note</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-gray-400" />
                    <div>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto"
                        onClick={() => navigate(`/delivery-notes/${pickPack.deliveryNote}`)}
                      >
                        View Delivery Note
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{formatDate(pickPack.createdAt)}</span>
                </div>
                {pickPack.pickingStartedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Picking Started:</span>
                    <span>{formatDate(pickPack.pickingStartedAt)}</span>
                  </div>
                )}
                {pickPack.pickingCompletedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Picking Completed:</span>
                    <span>{formatDate(pickPack.pickingCompletedAt)}</span>
                  </div>
                )}
                {pickPack.packingStartedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Packing Started:</span>
                    <span>{formatDate(pickPack.packingStartedAt)}</span>
                  </div>
                )}
                {pickPack.packingCompletedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Packing Completed:</span>
                    <span>{formatDate(pickPack.packingCompletedAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
