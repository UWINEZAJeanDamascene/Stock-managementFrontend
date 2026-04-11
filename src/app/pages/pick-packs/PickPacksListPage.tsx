import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { pickPackApi, salesOrdersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  Plus, 
  Search, 
  Loader2,
  Package,
  Eye,
  Play,
  Box,
  Filter,
  User,
  XCircle
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toast } from "sonner";

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
  batchId?: string;
}

interface PickPack {
  _id: string;
  referenceNo: string;
  salesOrder: {
    _id: string;
    referenceNo: string;
  };
  client: {
    _id: string;
    name: string;
  };
  warehouse: {
    _id: string;
    name: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
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
  lines: PickPackLine[];
  deliveryNote?: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'picking', label: 'Picking' },
  { value: 'picked', label: 'Picked' },
  { value: 'packed', label: 'Packing' },
  { value: 'ready_for_delivery', label: 'Ready for Delivery' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  picking: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  picked: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  packed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ready_for_delivery: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function PickPacksListPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pickPacks, setPickPacks] = useState<PickPack[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const fetchPickPacks = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

      const response = await pickPackApi.getAll(params);
      if (response.success) {
        setPickPacks(response.data as PickPack[]);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: (response.pagination as any).total || 0,
            pages: (response.pagination as any).pages || 1,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching pick packs:', error);
      toast.error('Failed to fetch pick packs');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchPickPacks();
  }, [fetchPickPacks]);

  const handleStartPicking = async (id: string) => {
    try {
      const response = await pickPackApi.startPicking(id);
      if (response.success) {
        toast.success('Picking started');
        fetchPickPacks();
      }
    } catch (error) {
      toast.error('Failed to start picking');
    }
  };

  const handleCompletePicking = async (id: string) => {
    try {
      const response = await pickPackApi.completePicking(id);
      if (response.success) {
        toast.success('Picking completed');
        fetchPickPacks();
      }
    } catch (error) {
      toast.error('Failed to complete picking');
    }
  };

  const handleStartPacking = async (id: string) => {
    try {
      const response = await pickPackApi.startPacking(id);
      if (response.success) {
        toast.success('Packing started');
        fetchPickPacks();
      }
    } catch (error) {
      toast.error('Failed to start packing');
    }
  };

  const handleCompletePacking = async (id: string) => {
    try {
      const response = await pickPackApi.completePacking(id);
      if (response.success) {
        toast.success('Packing completed - Delivery Note created');
        fetchPickPacks();
      }
    } catch (error) {
      toast.error('Failed to complete packing');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this pick pack task?')) return;
    
    try {
      const response = await pickPackApi.cancel(id, 'Cancelled by user');
      if (response.success) {
        toast.success('Pick pack cancelled');
        fetchPickPacks();
      }
    } catch (error) {
      toast.error('Failed to cancel pick pack');
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const getProgress = (task: PickPack) => {
    const total = task.lines.reduce((sum, line) => sum + line.qtyToPick, 0);
    const picked = task.lines.reduce((sum, line) => sum + line.qtyPicked, 0);
    const packed = task.lines.reduce((sum, line) => sum + line.qtyPacked, 0);
    
    if (task.status === 'ready_for_delivery' || task.status === 'packed') {
      return { text: `${packed}/${total} packed`, percent: (packed / total) * 100 };
    }
    return { text: `${picked}/${total} picked`, percent: (picked / total) * 100 };
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pick & Pack</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage picking and packing tasks</p>
          </div>
          <Button onClick={() => navigate('/pick-packs/create')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Pick & Pack
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Search by reference or sales order..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pick Packs Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Sales Order</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    </TableCell>
                  </TableRow>
                ) : pickPacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No pick pack tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  pickPacks.map((task) => {
                    const progress = getProgress(task);
                    return (
                      <TableRow key={task._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <span className="font-medium dark:text-gray-100">{task.referenceNo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium dark:text-gray-100">{task.salesOrder?.referenceNo}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            <span className="dark:text-gray-100">{task.client?.name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="dark:text-gray-100">{task.warehouse?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLORS[task.status]} capitalize`}>
                            {task.status.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${PRIORITY_COLORS[task.priority]} capitalize`}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-full max-w-[120px]">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{progress.text}</div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${progress.percent}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => navigate(`/pick-packs/${task._id}`)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {task.status === 'draft' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleStartPicking(task._id)}
                                title="Start Picking"
                                className="text-blue-600"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {task.status === 'picking' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate(`/pick-packs/${task._id}/pick`)}
                                title="Pick Items"
                                className="text-yellow-600"
                              >
                                <Box className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {task.status === 'picked' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleStartPacking(task._id)}
                                title="Start Packing"
                                className="text-purple-600"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {task.status === 'packed' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate(`/pick-packs/${task._id}/pack`)}
                                title="Pack Items"
                                className="text-orange-600"
                              >
                                <Box className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {task.status !== 'ready_for_delivery' && task.status !== 'cancelled' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleCancel(task._id)}
                                title="Cancel"
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {!loading && pickPacks.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {pickPacks.length} of {pagination.total} tasks
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
