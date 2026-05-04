import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  fixedAssetsApi,
  bankAccountsApi,
  FixedAsset,
  DepreciationScheduleItem,
  DepreciationEntry,
} from "@/lib/api";
import { Layout } from "../../layout/Layout";
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
  Shield,
  Play,
  Pause,
  Wrench,
  History,
  Truck,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function AssetDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<FixedAsset | null>(null);
  const [schedule, setSchedule] = useState<DepreciationScheduleItem[]>([]);
  const [depreciationEntries, setDepreciationEntries] = useState<
    DepreciationEntry[]
  >([]);
  const [activeTab, setActiveTab] = useState("details");

  // Depreciation dialog
  const [depreciateDialogOpen, setDepreciateDialogOpen] = useState(false);
  const [depreciateDate, setDepreciateDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [depreciating, setDepreciating] = useState(false);
  const [depreciationPreview, setDepreciationPreview] = useState<any>(null);

  // Disposal dialog
  const [disposeDialogOpen, setDisposeDialogOpen] = useState(false);
  const [disposalForm, setDisposalForm] = useState({
    disposalDate: new Date().toISOString().split("T")[0],
    disposalProceeds: 0,
    disposalCosts: 0,
    disposalMethod: "sale",
    bankAccountId: "",
    disposalAuthNumber: "",
    notes: "",
  });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [disposing, setDisposing] = useState(false);

  // Status management dialogs
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    toStatus: "",
    reason: "",
    notes: "",
  });
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchAsset();
      fetchBankAccounts();
    }
  }, [id]);

  const fetchBankAccounts = async () => {
    try {
      const res: any = await bankAccountsApi.getAll({ isActive: true });
      if (res.success) setBankAccounts(res.data || []);
    } catch {
      // non-fatal
    }
  };

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
      console.error("[AssetDetailPage] Failed to fetch asset:", error);
      toast.error(t("assets.errors.fetchFailed"));
      navigate("/assets");
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
      console.error(
        "[AssetDetailPage] Failed to fetch depreciation entries:",
        error,
      );
    }
  };

  useEffect(() => {
    if (activeTab === "entries" && id) {
      fetchDepreciationEntries();
    }
  }, [activeTab, id]);

  const handleDepreciate = async () => {
    if (!id) return;
    setDepreciating(true);
    try {
      const response: any = await fixedAssetsApi.postDepreciation(
        id,
        depreciateDate,
      );
      if (response.success) {
        toast.success(t("assets.success.depreciation"));
        setDepreciateDialogOpen(false);
        fetchAsset();
      } else {
        toast.error(response.error || t("assets.errors.depreciationFailed"));
      }
    } catch (error: any) {
      console.error("[AssetDetailPage] Depreciation error:", error);
      toast.error(
        error.response?.data?.error || t("assets.errors.depreciationFailed"),
      );
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
        disposalCosts: disposalForm.disposalCosts,
        disposalMethod: disposalForm.disposalMethod,
        bankAccountId: disposalForm.bankAccountId || undefined,
        disposalAuthNumber: disposalForm.disposalAuthNumber || undefined,
        notes: disposalForm.notes,
      });
      const res: any = response;
      if (res.success) {
        toast.success(t("assets.success.disposal") || "Asset disposed successfully");
        setDisposeDialogOpen(false);
        fetchAsset();
      } else {
        toast.error(res.error || t("assets.errors.disposalFailed"));
      }
    } catch (error: any) {
      console.error("[AssetDetailPage] Disposal error:", error);
      toast.error(
        error.response?.data?.error || t("assets.errors.disposalFailed"),
      );
    } finally {
      setDisposing(false);
    }
  };

  const formatCurrency = (amount: any) => {
    let numAmount = 0;
    if (amount !== null && amount !== undefined && amount !== "") {
      if (typeof amount === "object") {
        if (amount.$numberDecimal) {
          numAmount = parseFloat(amount.$numberDecimal);
        } else if (typeof amount.toString === "function") {
          numAmount = parseFloat(amount.toString());
        }
      } else if (typeof amount === "string") {
        numAmount = parseFloat(amount);
      } else {
        numAmount = amount;
      }
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numAmount);
  };

  const formatDate = (date: string | undefined | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string; icon: any }> = {
      in_transit: { color: "bg-blue-500", label: t("assets.status.inTransit") || "In Transit", icon: Truck },
      in_service: { color: "bg-green-500", label: t("assets.status.inService") || "In Service", icon: Play },
      under_maintenance: { color: "bg-orange-500", label: t("assets.status.maintenance") || "Under Maintenance", icon: Wrench },
      idle: { color: "bg-yellow-500", label: t("assets.status.idle") || "Idle", icon: Pause },
      fully_depreciated: { color: "bg-amber-500", label: t("assets.status.fullyDepreciated") || "Fully Depreciated", icon: TrendingDown },
      disposed: { color: "bg-red-500", label: t("assets.status.disposed") || "Disposed", icon: Trash2 },
      active: { color: "bg-green-500", label: t("assets.status.active") || "Active", icon: Play },
    };

    const config = statusConfig[status] || { color: "bg-slate-500", label: status, icon: null };
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white dark:opacity-90 flex items-center gap-1`}>
        {Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const getValidTransitions = (currentStatus: string) => {
    const transitions: Record<string, { value: string; label: string; icon: any }[]> = {
      in_transit: [
        { value: "in_service", label: "Place In Service", icon: Play },
      ],
      in_service: [
        { value: "under_maintenance", label: "Start Maintenance", icon: Wrench },
        { value: "idle", label: "Mark Idle", icon: Pause },
      ],
      under_maintenance: [
        { value: "in_service", label: "Return to Service", icon: Play },
        { value: "idle", label: "Mark Idle", icon: Pause },
      ],
      idle: [
        { value: "in_service", label: "Return to Service", icon: Play },
        { value: "under_maintenance", label: "Start Maintenance", icon: Wrench },
      ],
      fully_depreciated: [],
      disposed: [],
    };
    return transitions[currentStatus] || [];
  };

  const fetchStatusHistory = async () => {
    if (!id) return;
    try {
      const response: any = await fixedAssetsApi.getStatusHistory(id);
      if (response.success) {
        setStatusHistory(response.data || []);
      }
    } catch (error) {
      console.error("[AssetDetailPage] Failed to fetch status history:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "history" && id) {
      fetchStatusHistory();
    }
  }, [activeTab, id]);

  const handlePlaceInService = async () => {
    if (!id) return;
    setChangingStatus(true);
    try {
      const response: any = await fixedAssetsApi.placeInService(id, {
        inServiceDate: new Date().toISOString().split("T")[0],
      });
      if (response.success) {
        toast.success("Asset placed in service. Depreciation will start from in-service date.");
        fetchAsset();
      } else {
        toast.error(response.error || "Failed to place asset in service");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to place asset in service");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleStatusTransition = async () => {
    if (!id || !statusForm.toStatus) return;
    setChangingStatus(true);
    try {
      const response: any = await fixedAssetsApi.transitionStatus(id, {
        toStatus: statusForm.toStatus,
        reason: statusForm.reason,
        notes: statusForm.notes,
      });
      if (response.success) {
        toast.success(`Asset status changed to ${statusForm.toStatus.replace("_", " ")}`);
        setStatusDialogOpen(false);
        fetchAsset();
      } else {
        toast.error(response.error || "Failed to change status");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to change status");
    } finally {
      setChangingStatus(false);
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
          <p>{t("assets.errors.notFound")}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/assets")}
            className="dark:text-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold dark:text-white">{asset.name}</h1>
              {getStatusBadge(asset.status)}
            </div>
            <p className="text-muted-foreground dark:text-slate-400">{asset.referenceNo}</p>
          </div>
          <div className="flex gap-2">
            {/* Status-specific actions */}
            {asset.status === "in_transit" && (
              <Button
                onClick={handlePlaceInService}
                disabled={changingStatus}
                className="dark:bg-blue-600 dark:text-white"
              >
                <Play className="mr-2 h-4 w-4" />
                Place In Service
              </Button>
            )}

            {/* Status transition button for valid transitions */}
            {getValidTransitions(asset.status).length > 0 && (
              <Button
                variant="outline"
                onClick={() => setStatusDialogOpen(true)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Change Status
              </Button>
            )}

            {/* Depreciate button for active assets */}
            {(asset.status === "in_service" || asset.status === "active") && (
              <Button
                variant="outline"
                onClick={() => setDepreciateDialogOpen(true)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Calculator className="mr-2 h-4 w-4" />
                {t("assets.actions.depreciate")}
              </Button>
            )}

            {/* Dispose button (not for already disposed) */}
            {asset.status !== "disposed" && (
              <Button
                variant="destructive"
                onClick={() => setDisposeDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("assets.actions.dispose")}
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="dark:bg-slate-800">
            <TabsTrigger value="details" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-700">
              {t("assets.tabs.details")}
            </TabsTrigger>
            <TabsTrigger value="schedule" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-700">
              {t("assets.tabs.schedule")}
            </TabsTrigger>
            <TabsTrigger value="entries" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-700">
              {t("assets.tabs.entries")}
            </TabsTrigger>
            <TabsTrigger value="history" className="dark:text-slate-300 dark:data-[state=active]:bg-slate-700">
              <History className="h-4 w-4 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Asset Info */}
              <Card className="lg:col-span-2 dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Package className="h-5 w-5" />
                    {t("assets.sections.assetInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.referenceNo")}
                      </Label>
                      <p className="font-medium dark:text-white">{asset.referenceNo}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.name")}
                      </Label>
                      <p className="font-medium dark:text-white">{asset.name}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.description")}
                      </Label>
                      <p className="dark:text-slate-300">{asset.description || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.category")}
                      </Label>
                      <p className="dark:text-slate-300">{(asset.categoryId as any)?.name || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.status")}
                      </Label>
                      <p className="dark:text-slate-300">{asset.status}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.serialNumber")}
                      </Label>
                      <p className="dark:text-slate-300">{asset.serialNumber || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.location")}
                      </Label>
                      <p className="dark:text-slate-300">{asset.location || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.department")}
                      </Label>
                      <p className="dark:text-slate-300">{(asset.departmentId as any)?.name || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.supplier")}
                      </Label>
                      <p className="dark:text-slate-300">{(asset.supplierId as any)?.name || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.purchaseDate")}
                      </Label>
                      <p className="dark:text-slate-300">{formatDate(asset.purchaseDate)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.purchaseCost")}
                      </Label>
                      <p className="font-medium dark:text-white">
                        {formatCurrency(asset.purchaseCost)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Depreciation Summary */}
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <TrendingDown className="h-5 w-5" />
                    {t("assets.sections.depreciationSummary")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.purchaseCost")}
                    </Label>
                    <p className="text-2xl font-bold dark:text-white">
                      {formatCurrency(asset.purchaseCost)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.accumulatedDepreciation")}
                    </Label>
                    <p className="text-xl dark:text-slate-300">
                      {formatCurrency(asset.accumulatedDepreciation)}
                    </p>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.netBookValue")}
                    </Label>
                    <p className="text-2xl font-bold text-primary dark:text-primary">
                      {formatCurrency(asset.netBookValue)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.salvageValue")}
                    </Label>
                    <p className="dark:text-slate-300">{formatCurrency(asset.salvageValue)}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.usefulLifeMonths")}
                    </Label>
                    <p className="dark:text-slate-300">{asset.usefulLifeMonths} months</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.depreciationMethod")}
                    </Label>
                    <p className="dark:text-slate-300">
                      {asset.depreciationMethod === "straight_line"
                        ? t("assets.depreciation.straightLine")
                        : t("assets.depreciation.decliningBalance")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Warranty & Insurance */}
              {(asset.warrantyStartDate || asset.warrantyEndDate || asset.insuredValue) && (
                <Card className="lg:col-span-3 dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-white">
                      <Shield className="h-5 w-5" />
                      {t("assets.sections.warrantyInsurance")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground dark:text-slate-400">
                          {t("assets.fields.warrantyStartDate")}
                        </Label>
                        <p className="dark:text-slate-300">{formatDate(asset.warrantyStartDate)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground dark:text-slate-400">
                          {t("assets.fields.warrantyEndDate")}
                        </Label>
                        <p className="dark:text-slate-300">{formatDate(asset.warrantyEndDate)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground dark:text-slate-400">
                          {t("assets.fields.insuredValue")}
                        </Label>
                        <p className="font-medium dark:text-white">
                          {formatCurrency(asset.insuredValue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Codes */}
              <Card className="lg:col-span-3 dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <FileText className="h-5 w-5" />
                    {t("assets.sections.accountCodes")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.assetAccount")}
                      </Label>
                      <p className="font-mono dark:text-white">{asset.assetAccountCode}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.accumDepreciationAccount")}
                      </Label>
                      <p className="font-mono dark:text-white">
                        {asset.accumDepreciationAccountCode}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground dark:text-slate-400">
                        {t("assets.fields.depreciationExpenseAccount")}
                      </Label>
                      <p className="font-mono dark:text-white">
                        {asset.depreciationExpenseAccountCode}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Depreciation Schedule Tab */}
          <TabsContent value="schedule">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  {t("assets.sections.depreciationSchedule")}
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t("assets.sections.depreciationScheduleDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {schedule.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                    <Calculator className="h-12 w-12 mx-auto mb-4 dark:text-slate-500" />
                    <p>{t("assets.noSchedule")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                        <TableHead className="dark:text-slate-200">{t("assets.schedule.period")}</TableHead>
                        <TableHead className="dark:text-slate-200">{t("assets.schedule.date")}</TableHead>
                        <TableHead className="text-right dark:text-slate-200">
                          {t("assets.schedule.openingNBV")}
                        </TableHead>
                        <TableHead className="text-right dark:text-slate-200">
                          {t("assets.schedule.depreciation")}
                        </TableHead>
                        <TableHead className="text-right dark:text-slate-200">
                          {t("assets.schedule.closingNBV")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((item) => (
                        <TableRow key={item.period} className="dark:border-slate-600">
                          <TableCell className="dark:text-slate-300">{item.label}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatDate(item.date)}</TableCell>
                          <TableCell className="text-right dark:text-slate-300">
                            {formatCurrency(item.openingNBV)}
                          </TableCell>
                          <TableCell className="text-right dark:text-slate-300">
                            {formatCurrency(item.depreciation)}
                          </TableCell>
                          <TableCell className="text-right font-medium dark:text-white">
                            {formatCurrency(item.closingNBV)}
                          </TableCell>
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
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">{t("assets.sections.postedEntries")}</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t("assets.sections.postedEntriesDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {depreciationEntries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 dark:text-slate-500" />
                    <p>{t("assets.noEntries")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                        <TableHead className="dark:text-slate-200">{t("assets.entries.period")}</TableHead>
                        <TableHead className="dark:text-slate-200">{t("assets.entries.date")}</TableHead>
                        <TableHead className="text-right dark:text-slate-200">
                          {t("assets.entries.depreciation")}
                        </TableHead>
                        <TableHead className="text-right dark:text-slate-200">
                          {t("assets.entries.accumAfter")}
                        </TableHead>
                        <TableHead className="text-right dark:text-slate-200">
                          {t("assets.entries.nbvAfter")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {depreciationEntries.map((entry) => (
                        <TableRow key={entry._id} className="dark:border-slate-600">
                          <TableCell className="dark:text-slate-300">{formatDate(entry.periodDate)}</TableCell>
                          <TableCell className="dark:text-slate-300">{formatDate(entry.createdAt)}</TableCell>
                          <TableCell className="text-right dark:text-slate-300">
                            {formatCurrency(entry.depreciationAmount)}
                          </TableCell>
                          <TableCell className="text-right dark:text-slate-300">
                            {formatCurrency(entry.accumulatedAfter)}
                          </TableCell>
                          <TableCell className="text-right font-medium dark:text-white">
                            {formatCurrency(entry.netBookValueAfter)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Status History Tab */}
          <TabsContent value="history">
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 dark:text-white">
                  <History className="h-5 w-5" />
                  Asset Status History
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  Complete lifecycle audit trail for this asset
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                    <History className="h-12 w-12 mx-auto mb-4 dark:text-slate-500" />
                    <p>No status history recorded yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                        <TableHead className="dark:text-slate-200">Date</TableHead>
                        <TableHead className="dark:text-slate-200">From</TableHead>
                        <TableHead className="dark:text-slate-200">To</TableHead>
                        <TableHead className="dark:text-slate-200">Changed By</TableHead>
                        <TableHead className="dark:text-slate-200">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statusHistory.map((entry) => (
                        <TableRow key={entry._id} className="dark:border-slate-600">
                          <TableCell className="dark:text-slate-300">{formatDate(entry.changedAt)}</TableCell>
                          <TableCell>{getStatusBadge(entry.fromStatus)}</TableCell>
                          <TableCell>{getStatusBadge(entry.toStatus)}</TableCell>
                          <TableCell className="dark:text-slate-300">
                            {entry.changedBy?.name || "System"}
                          </TableCell>
                          <TableCell className="dark:text-slate-300">{entry.reason || "-"}</TableCell>
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
        <Dialog
          open={depreciateDialogOpen}
          onOpenChange={setDepreciateDialogOpen}
        >
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t("assets.dialogs.depreciate.title")}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t("assets.dialogs.depreciate.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t("assets.fields.periodDate")}</Label>
                <Input
                  type="date"
                  value={depreciateDate}
                  onChange={(e) => setDepreciateDate(e.target.value)}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDepreciateDialogOpen(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleDepreciate} disabled={depreciating} className="dark:bg-primary dark:text-primary-foreground">
                {depreciating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("assets.actions.depreciate")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Status Transition Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Change Asset Status</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Transition asset from {asset.status.replace("_", " ")} to a new status
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-200">New Status</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  value={statusForm.toStatus}
                  onChange={(e) => setStatusForm({ ...statusForm, toStatus: e.target.value })}
                >
                  <option value="">Select new status...</option>
                  {getValidTransitions(asset.status).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Reason</Label>
                <Input
                  value={statusForm.reason}
                  onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                  placeholder="e.g., Scheduled maintenance, Seasonal idle"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Notes</Label>
                <Input
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                  placeholder="Additional details..."
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStatusTransition} disabled={changingStatus || !statusForm.toStatus}>
                {changingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Status
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dispose Dialog - Enhanced */}
        <Dialog open={disposeDialogOpen} onOpenChange={setDisposeDialogOpen}>
          <DialogContent className="dark:bg-slate-800 max-w-lg">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t("assets.dialogs.dispose.title")}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Record asset disposal with complete financial details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Disposal Method */}
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Disposal Method</Label>
                <select
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  value={disposalForm.disposalMethod}
                  onChange={(e) => setDisposalForm({ ...disposalForm, disposalMethod: e.target.value })}
                >
                  <option value="sale">Sale (Sold to third party)</option>
                  <option value="scrap">Scrap (No proceeds)</option>
                  <option value="donation">Donation (Given away)</option>
                  <option value="trade_in">Trade-in (Exchanged)</option>
                  <option value="theft_loss">Theft/Loss (Insurance claim)</option>
                </select>
              </div>

              {/* Disposal Date */}
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t("assets.fields.disposalDate")}</Label>
                <Input
                  type="date"
                  value={disposalForm.disposalDate}
                  onChange={(e) => setDisposalForm({ ...disposalForm, disposalDate: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Gross Proceeds</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={disposalForm.disposalProceeds}
                    onChange={(e) => setDisposalForm({ ...disposalForm, disposalProceeds: parseFloat(e.target.value) || 0 })}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Disposal Costs</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={disposalForm.disposalCosts}
                    onChange={(e) => setDisposalForm({ ...disposalForm, disposalCosts: parseFloat(e.target.value) || 0 })}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </div>

              {/* Net Proceeds Preview */}
              <div className="p-3 bg-muted rounded dark:bg-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="dark:text-slate-300">Net Proceeds:</span>
                  <span className="font-semibold dark:text-white">
                    {formatCurrency(disposalForm.disposalProceeds - disposalForm.disposalCosts)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="dark:text-slate-300">Current Book Value:</span>
                  <span className="font-semibold dark:text-white">{formatCurrency(asset.netBookValue)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1 pt-2 border-t dark:border-slate-600">
                  <span className="dark:text-slate-300">Expected Gain/Loss:</span>
                  <span className={`font-semibold ${
                    (disposalForm.disposalProceeds - disposalForm.disposalCosts - parseFloat(asset.netBookValue?.toString() || "0")) >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    {formatCurrency(disposalForm.disposalProceeds - disposalForm.disposalCosts - parseFloat(asset.netBookValue?.toString() || "0"))}
                  </span>
                </div>
              </div>

              {/* Bank Account for Proceeds */}
              {disposalForm.disposalProceeds > 0 && (
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Deposit Proceeds to Bank Account</Label>
                  <select
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    value={disposalForm.bankAccountId}
                    onChange={(e) => setDisposalForm({ ...disposalForm, bankAccountId: e.target.value })}
                  >
                    <option value="">Select bank account...</option>
                    {bankAccounts.map((acc: any) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} (Bal: {formatCurrency(acc.cachedBalance || 0)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* RRA Disposal Authorization */}
              <div className="space-y-2">
                <Label className="dark:text-slate-200">RRA Disposal Auth Number (Optional)</Label>
                <Input
                  value={disposalForm.disposalAuthNumber}
                  onChange={(e) => setDisposalForm({ ...disposalForm, disposalAuthNumber: e.target.value })}
                  placeholder="e.g., RRA-2024-001234"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Notes</Label>
                <Input
                  value={disposalForm.notes}
                  onChange={(e) => setDisposalForm({ ...disposalForm, notes: e.target.value })}
                  placeholder="Additional disposal details..."
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDisposeDialogOpen(false)}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDispose}
                disabled={disposing}
              >
                {disposing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("assets.actions.dispose")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
