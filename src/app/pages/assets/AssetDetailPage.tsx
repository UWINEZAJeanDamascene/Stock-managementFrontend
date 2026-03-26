import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { fixedAssetsApi, FixedAsset, DepreciationScheduleItem, DepreciationEntry } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  Package,
  Calendar,
  DollarSign,
  Calculator,
  TrendingDown,
  FileText,
  Trash2,
  Plus,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function AssetDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<FixedAsset | null>(null);
  const [schedule, setSchedule] = useState<DepreciationScheduleItem[]>([]);
  const [depreciationEntries, setDepreciationEntries] = useState<DepreciationEntry[]>([]);
  const [activeTab, setActiveTab] = useState('details');

  // Depreciation dialog
  const [depreciateDialogOpen, setDepreciateDialogOpen] = useState(false);
  const [depreciateDate, setDepreciateDate] = useState(new Date().toISOString().split('T')[0]);
  const [depreciating, setDepreciating] = useState(false);
  const [depreciationPreview, setDepreciationPreview] = useState<any>(null);

  // Disposal dialog
  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false);
  const [disposalForm, setDisposalForm] = useState({
    disposalDate: new Date().toISOString().split('T')[0],
    disposalProceeds: 0,
    disposalMethod: 'sold',
    notes: '',
  });
  const [disposing, setDisposing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAsset();
    }
  }, [id]);

  const fetchAsset = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [assetRes, scheduleRes]: any = await Promise.all([
        fixedAssetsApi.getById(id),
        fixedAssetsApi.getDepreciationSchedule(id),
      ]);
      if (assetRes.success) {
        setAsset(assetRes.data);
        if (scheduleRes.success) {
          setSchedule(scheduleRes.data?.schedule || []);
        }
      }
    } catch (error) {
      console.error('[AssetDetailPage] Failed to fetch asset:', error);
      toast.error(t('assets.errors.fetchFailed'));
      navigate('/assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepreciationEntries = async () => {
    if (!id) return;
    try {
      const response: any = await fixedAssetsApi.getDepreciationEntries(id);
      if (response.success) {
        setDepreciationEntries(response.data || []);
      }
    } catch (error) {
      console.error('[AssetDetailPage] Failed to fetch depreciation entries:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'entries' && id) {
      fetchDepreciationEntries();
    }
  }, [activeTab, id]);

  const handleDepreciate = async () => {
    if (!id) return;
    setDepreciating(true);
    try {
      const response: any = await fixedAssetsApi.postDepreciation(id, depreciateDate);
      if (response.success) {
        toast.success(t('assets.success.depreciation'));
        setDepreciateDialogOpen(false);
        fetchAsset();
      } else {
        toast.error(response.error || t('assets.errors.depreciationFailed'));
      }
    } catch (error: any) {
      console.error('[AssetDetailPage] Depreciation error:', error);
      toast.error(error.response?.data?.error || t('assets.errors.depreciationFailed'));
    } finally {
      setDepreciating(false);
    }
  };

  const handleDispose = async () => {
    if (!id) return;
    setDisposing(true);
    try {
      const response = await fixedAssetsApi.dispose(id, {
        disposalDate: disposalForm.disposalDate,
        disposalProceeds: disposalForm.disposalProceeds,
        disposalMethod: disposalForm.disposalMethod,
        notes: disposalForm.notes,
      });
      const res: any = response;
      if (res.success) {
        toast.success(t('assets.success.disposal'));
        setDisposeDialogOpen(false);
        fetchAsset();
      } else {
        toast.error(res.error || t('assets.errors.disposalFailed'));
      }
    } catch (error: any) {
      console.error('[AssetDetailPage] Disposal error:', error);
      toast.error(error.response?.data?.error || t('assets.errors.disposalFailed'));
    } finally {
      setDisposing(false);
    }
  };

  const formatCurrency = (amount: any) => {
    let numAmount = 0;
    if (amount !== null && amount !== undefined && amount !== '') {
      if (typeof amount === 'object') {
        if (amount.$numberDecimal) {
          numAmount = parseFloat(amount.$numberDecimal);
        } else if (typeof amount.toString === 'function') {
          numAmount = parseFloat(amount.toString());
        }
      } else if (typeof amount === 'string') {
        numAmount = parseFloat(amount);
      } else {
        numAmount = amount;
      }
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">{t('assets.status.active')}</Badge>;
      case 'fully_depreciated':
        return <Badge variant="secondary" className="bg-amber-500">{t('assets.status.fullyDepreciated')}</Badge>;
      case 'disposed':
        return <Badge variant="destructive">{t('assets.status.disposed')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!asset) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <p>{t('assets.errors.notFound')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/assets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{asset.name}</h1>
              {getStatusBadge(asset.status)}
            </div>
            <p className="text-muted-foreground">{asset.referenceNo}</p>
          </div>
          {asset.status === 'active' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDepreciateDialogOpen(true)}>
                <Calculator className="mr-2 h-4 w-4" />
                {t('assets.actions.depreciate')}
              </Button>
              <Button variant="destructive" onClick={() => setDisposeDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('assets.actions.dispose')}
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="details">{t('assets.tabs.details')}</TabsTrigger>
            <TabsTrigger value="schedule">{t('assets.tabs.schedule')}</TabsTrigger>
            <TabsTrigger value="entries">{t('assets.tabs.entries')}</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Asset Info */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('assets.sections.assetInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">{t('assets.fields.referenceNo')}</Label>
                      <p className="font-medium">{asset.referenceNo}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('assets.fields.name')}</Label>
                      <p className="font-medium">{asset.name}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">{t('assets.fields.description')}</Label>
                      <p>{asset.description || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('assets.fields.purchaseDate')}</Label>
                      <p>{formatDate(asset.purchaseDate)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('assets.fields.purchaseCost')}</Label>
                      <p className="font-medium">{formatCurrency(asset.purchaseCost)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Depreciation Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    {t('assets.sections.depreciationSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.purchaseCost')}</Label>
                    <p className="text-2xl font-bold">{formatCurrency(asset.purchaseCost)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.accumulatedDepreciation')}</Label>
                    <p className="text-xl">{formatCurrency(asset.accumulatedDepreciation)}</p>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.netBookValue')}</Label>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(asset.netBookValue)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.salvageValue')}</Label>
                    <p>{formatCurrency(asset.salvageValue)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.usefulLifeMonths')}</Label>
                    <p>{asset.usefulLifeMonths} months</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('assets.fields.depreciationMethod')}</Label>
                    <p>
                      {asset.depreciationMethod === 'straight_line'
                        ? t('assets.depreciation.straightLine')
                        : t('assets.depreciation.decliningBalance')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Account Codes */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t('assets.sections.accountCodes')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground">{t('assets.fields.assetAccount')}</Label>
                      <p className="font-mono">{asset.assetAccountCode}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('assets.fields.accumDepreciationAccount')}</Label>
                      <p className="font-mono">{asset.accumDepreciationAccountCode}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t('assets.fields.depreciationExpenseAccount')}</Label>
                      <p className="font-mono">{asset.depreciationExpenseAccountCode}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Depreciation Schedule Tab */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>{t('assets.sections.depreciationSchedule')}</CardTitle>
                <CardDescription>{t('assets.sections.depreciationScheduleDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {schedule.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4" />
                    <p>{t('assets.noSchedule')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('assets.schedule.period')}</TableHead>
                        <TableHead>{t('assets.schedule.date')}</TableHead>
                        <TableHead className="text-right">{t('assets.schedule.openingNBV')}</TableHead>
                        <TableHead className="text-right">{t('assets.schedule.depreciation')}</TableHead>
                        <TableHead className="text-right">{t('assets.schedule.closingNBV')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((item) => (
                        <TableRow key={item.period}>
                          <TableCell>{item.label}</TableCell>
                          <TableCell>{formatDate(item.date)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.openingNBV)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.depreciation)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.closingNBV)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posted Entries Tab */}
          <TabsContent value="entries">
            <Card>
              <CardHeader>
                <CardTitle>{t('assets.sections.postedEntries')}</CardTitle>
                <CardDescription>{t('assets.sections.postedEntriesDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {depreciationEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4" />
                    <p>{t('assets.noEntries')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('assets.entries.period')}</TableHead>
                        <TableHead>{t('assets.entries.date')}</TableHead>
                        <TableHead className="text-right">{t('assets.entries.depreciation')}</TableHead>
                        <TableHead className="text-right">{t('assets.entries.accumAfter')}</TableHead>
                        <TableHead className="text-right">{t('assets.entries.nbvAfter')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {depreciationEntries.map((entry) => (
                        <TableRow key={entry._id}>
                          <TableCell>{formatDate(entry.periodDate)}</TableCell>
                          <TableCell>{formatDate(entry.createdAt)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.depreciationAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.accumulatedAfter)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(entry.netBookValueAfter)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Depreciate Dialog */}
        <Dialog open={depreciateDialogOpen} onOpenChange={setDepreciateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('assets.dialogs.depreciate.title')}</DialogTitle>
              <DialogDescription>{t('assets.dialogs.depreciate.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('assets.fields.periodDate')}</Label>
                <Input
                  type="date"
                  value={depreciateDate}
                  onChange={(e) => setDepreciateDate(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepreciateDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleDepreciate} disabled={depreciating}>
                {depreciating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('assets.actions.depreciate')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dispose Dialog */}
        <Dialog open={disposeDialogOpen} onOpenChange={setDisposeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('assets.dialogs.dispose.title')}</DialogTitle>
              <DialogDescription>{t('assets.dialogs.dispose.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('assets.fields.disposalDate')}</Label>
                <Input
                  type="date"
                  value={disposalForm.disposalDate}
                  onChange={(e) => setDisposalForm({ ...disposalForm, disposalDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('assets.fields.disposalProceeds')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={disposalForm.disposalProceeds}
                  onChange={(e) => setDisposalForm({ ...disposalForm, disposalProceeds: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('assets.fields.netBookValue')}</Label>
                <div className="p-2 bg-muted rounded">
                  {formatCurrency(asset.netBookValue)}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDisposeDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDispose} disabled={disposing}>
                {disposing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('assets.actions.dispose')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
