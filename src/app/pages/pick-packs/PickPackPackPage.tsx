import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { pickPackApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft,
  CheckCircle,
  Loader2,
  Package,
  AlertCircle,
  Box,
  Minus,
  Plus
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
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
  status: string;
}

interface PickPack {
  _id: string;
  referenceNo: string;
  salesOrder: {
    referenceNo: string;
  };
  client: {
    name: string;
  };
  warehouse: {
    name: string;
  };
  status: string;
  lines: PickPackLine[];
}

export default function PickPackPackPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pickPack, setPickPack] = useState<PickPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [packingLines, setPackingLines] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPickPack();
  }, [id]);

  const fetchPickPack = async () => {
    try {
      setLoading(true);
      const response = await pickPackApi.getById(id!);
      if (response.success) {
        const data = response.data as PickPack;
        setPickPack(data);
        // Initialize packing quantities with current packed values
        const initialPacking: Record<string, number> = {};
        data.lines.forEach(line => {
          initialPacking[line._id] = toNumber(line.qtyPacked);
        });
        setPackingLines(initialPacking);
      }
    } catch (error) {
      console.error('Error fetching pick pack:', error);
      toast.error('Failed to load pick pack task');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (lineId: string, delta: number) => {
    const line = pickPack?.lines.find(l => l._id === lineId);
    if (!line) return;

    const currentQty = packingLines[lineId] || 0;
    const maxQty = toNumber(line.qtyPicked);
    const newQty = Math.max(0, Math.min(maxQty, currentQty + delta));

    setPackingLines(prev => ({ ...prev, [lineId]: newQty }));
  };

  const handleSetQty = (lineId: string, value: number) => {
    const line = pickPack?.lines.find(l => l._id === lineId);
    if (!line) return;

    const maxQty = toNumber(line.qtyPicked);
    const newQty = Math.max(0, Math.min(maxQty, value));

    setPackingLines(prev => ({ ...prev, [lineId]: newQty }));
  };

  const handleCompletePacking = async () => {
    try {
      setSubmitting(true);

      // Pack each line
      for (const line of pickPack!.lines) {
        const qtyToRecord = packingLines[line._id] || 0;
        const currentPacked = toNumber(line.qtyPacked);
        
        if (qtyToRecord > currentPacked) {
          // Call API for each line individually
          await fetch(`${import.meta.env.VITE_API_URL || 'https://stock-tenancy-system.onrender.com/api'}/pick-packs/${id}/pack-items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              lineId: line._id,
              qtyPacked: qtyToRecord,
              notes: ''
            })
          }).then(res => res.json());
        }
      }

      // Complete packing - this creates the delivery note
      const response = await pickPackApi.completePacking(id!, {
        packageCount: 1,
        packageType: 'box'
      });

      if (response.success) {
        toast.success('Packing completed - Delivery Note created');
        navigate(`/pick-packs/${id}`);
      } else {
        toast.error((response as any).message || 'Failed to complete packing');
      }
    } catch (error: any) {
      console.error('Error completing packing:', error);
      toast.error(error.message || 'Failed to complete packing');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
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

  const allPacked = pickPack.lines.every(line => {
    const packed = packingLines[line._id] || 0;
    return packed >= toNumber(line.qtyPicked);
  });

  return (
    <Layout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/pick-packs/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pack Items</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {pickPack.referenceNo} - {pickPack.client?.name}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Packing List */}
          <div className="lg:col-span-2 space-y-4">
            {pickPack.lines.map((line) => {
              const qtyPicked = toNumber(line.qtyPicked);
              const packedQty = packingLines[line._id] || 0;
              const isComplete = packedQty >= qtyPicked;

              return (
                <Card key={line._id} className={isComplete ? 'border-green-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{line.description}</h3>
                          {isComplete && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Packed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{line.product?.sku}</p>
                        <p className="text-sm text-blue-600">
                          <Box className="h-3 w-3 inline mr-1" />
                          Picked: {qtyPicked}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-500">To Pack: {qtyPicked}</div>
                          <div className="text-lg font-bold">
                            {packedQty} / {qtyPicked}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQtyChange(line._id, -1)}
                            disabled={packedQty <= 0 || submitting}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            max={qtyPicked}
                            value={packedQty}
                            onChange={(e) => handleSetQty(line._id, parseInt(e.target.value) || 0)}
                            className="w-20 text-center"
                            disabled={submitting}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQtyChange(line._id, 1)}
                            disabled={packedQty >= qtyPicked || submitting}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Packing Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-medium">{pickPack.lines.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Packed:</span>
                  <span className="font-medium">
                    {pickPack.lines.filter(l => (packingLines[l._id] || 0) >= toNumber(l.qtyPicked)).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-medium">
                    {pickPack.lines.filter(l => (packingLines[l._id] || 0) < toNumber(l.qtyPicked)).length}
                  </span>
                </div>

                <Button
                  className="w-full"
                  onClick={handleCompletePacking}
                  disabled={submitting || !allPacked}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Packing & Create Delivery Note
                    </>
                  )}
                </Button>

                {!allPacked && (
                  <p className="text-sm text-gray-500 text-center">
                    Pack all items before completing
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
