import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import {
  fixedAssetsApi,
  assetCategoriesApi,
  suppliersApi,
  bankAccountsApi,
  accountsApi,
  departmentsApi,
  AssetCategory,
} from "@/lib/api";
import { Supplier } from "@/services/supplierService";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  Save,
  Loader2,
  Package,
  Calculator,
  Building2,
  DollarSign,
  Clock,
  Hash,
  MapPin,
  Building,
  Shield,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function AssetCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [chartAccounts, setChartAccounts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showJournalEntry, setShowJournalEntry] = useState(false);
  const [journalEntry, setJournalEntry] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseCost: 0,
    salvageValue: 0,
    usefulLifeMonths: 60,
    depreciationMethod: "straight_line",
    decliningRate: 20,
    // Defaults aligned with the Chart of Accounts (1700-series PP&E, 1810-series accum dep)
    assetAccountCode: "1700",
    accumDepreciationAccountCode: "1810",
    depreciationExpenseAccountCode: "5800",
    supplierId: "",
    // Payment source
    bankAccountId: "",
    paymentAccountCode: "2000",
    // New fields
    referenceNo: "",
    serialNumber: "",
    location: "",
    departmentId: "",
    warrantyStartDate: "",
    warrantyEndDate: "",
    insuredValue: 0,
    status: "active",
  });

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response: any = await bankAccountsApi.getAll({ isActive: true });
      if (response.success) {
        setBankAccounts(response.data || []);
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch bank accounts:", error);
    }
  }, []);

  const fetchChartAccounts = useCallback(async () => {
    try {
      const response: any = await accountsApi.getAll();
      if (response.success) {
        setChartAccounts(response.data || []);
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch chart accounts:", error);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const response: any = await departmentsApi.getAll();
      if (response.success) {
        setDepartments(response.data || []);
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch departments:", error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response: any = await assetCategoriesApi.getAll();
      console.log("[DEBUG] Categories API response:", response);
      
      // Handle both { success: true, data: [...] } and { success: true, data: { data: [...] } }
      let categoryData = response.data;
      if (categoryData && categoryData.data && Array.isArray(categoryData.data)) {
        categoryData = categoryData.data;
      }
      
      if (response.success && Array.isArray(categoryData)) {
        const fetchedCategories = categoryData.filter((c: any) => c._id);
        console.log("[DEBUG] Filtered categories:", fetchedCategories);
        setCategories(fetchedCategories);
        
        // Auto-select first category if none selected and in create mode
        if (fetchedCategories.length > 0 && !isEdit) {
          const defaultCat = fetchedCategories[0];
          console.log("[DEBUG] Auto-selecting category:", defaultCat._id, defaultCat.name);
          setFormData((prev: any) => ({
            ...prev,
            categoryId: defaultCat._id,
            usefulLifeMonths: defaultCat.defaultUsefulLifeMonths || 60,
            depreciationMethod: defaultCat.defaultDepreciationMethod || "straight_line",
            assetAccountCode: defaultCat.defaultAssetAccountCode || "1700",
            accumDepreciationAccountCode: defaultCat.defaultAccumDepreciationAccountCode || "1810",
            depreciationExpenseAccountCode: defaultCat.defaultDepreciationExpenseAccountCode || "5800",
          }));
        }
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch categories:", error);
    }
  }, [isEdit]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response: any = await suppliersApi.getAll({ isActive: true });
      if (response.success) {
        setSuppliers(response.data || []);
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch suppliers:", error);
    }
  }, []);

  const fetchAsset = async (assetId: string) => {
    setInitialLoading(true);
    try {
      const response: any = await fixedAssetsApi.getById(assetId);
      if (response.success && response.data) {
        const asset: any = response.data;
        setFormData({
          name: asset.name || "",
          description: asset.description || "",
          categoryId: asset.categoryId?._id || asset.categoryId || "",
          purchaseDate: asset.purchaseDate
            ? new Date(asset.purchaseDate).toISOString().split("T")[0]
            : "",
          purchaseCost: getNumericValue(asset.purchaseCost),
          salvageValue: getNumericValue(asset.salvageValue),
          usefulLifeMonths: asset.usefulLifeMonths || 60,
          depreciationMethod: asset.depreciationMethod || "straight_line",
          decliningRate: asset.decliningRate || 20,
          assetAccountCode: asset.assetAccountCode || "1700",
          accumDepreciationAccountCode:
            asset.accumDepreciationAccountCode || "1810",
          depreciationExpenseAccountCode:
            asset.depreciationExpenseAccountCode || "5800",
          supplierId: asset.supplierId?._id || asset.supplierId || "",
          bankAccountId: "",
          paymentAccountCode: "2000",
          // New fields
          referenceNo: asset.referenceNo || "",
          serialNumber: asset.serialNumber || "",
          location: asset.location || "",
          departmentId: asset.departmentId?._id || asset.departmentId || "",
          warrantyStartDate: asset.warrantyStartDate
            ? new Date(asset.warrantyStartDate).toISOString().split("T")[0]
            : "",
          warrantyEndDate: asset.warrantyEndDate
            ? new Date(asset.warrantyEndDate).toISOString().split("T")[0]
            : "",
          insuredValue: getNumericValue(asset.insuredValue),
          status: asset.status || "active",
        });
      }
    } catch (error) {
      console.error("[AssetCreatePage] Failed to fetch asset:", error);
      toast.error(t("assets.errors.fetchFailed"));
      navigate("/assets");
    } finally {
      setInitialLoading(false);
    }
  };

  // Data fetching useEffect - placed after all fetch function definitions
  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
    fetchBankAccounts();
    fetchChartAccounts();
    fetchDepartments();
    if (isEdit && id) {
      fetchAsset(id);
    }
  }, [id, isEdit, fetchCategories, fetchSuppliers, fetchBankAccounts, fetchChartAccounts, fetchDepartments]);

  const handleCategoryChange = (categoryId: string) => {
    if (!categoryId) {
      // Clear category selection
      setFormData((prev) => ({ ...prev, categoryId: "" }));
      return;
    }
    
    const category = categories.find((c) => c._id === categoryId);
    if (category) {
      setFormData((prev) => ({
        ...prev,
        categoryId,
        usefulLifeMonths:
          category.defaultUsefulLifeMonths || prev.usefulLifeMonths,
        depreciationMethod:
          category.defaultDepreciationMethod || prev.depreciationMethod,
        assetAccountCode: category.defaultAssetAccountCode || "1700",
        accumDepreciationAccountCode:
          category.defaultAccumDepreciationAccountCode || "1810",
        depreciationExpenseAccountCode:
          category.defaultDepreciationExpenseAccountCode || "5800",
      }));
    } else {
      setFormData((prev) => ({ ...prev, categoryId }));
    }
  };

  const calculateDepreciation = () => {
    const depreciableAmount = formData.purchaseCost - formData.salvageValue;
    if (formData.depreciationMethod === "straight_line") {
      return depreciableAmount / formData.usefulLifeMonths;
    } else {
      const rate = formData.decliningRate / 100;
      return (formData.purchaseCost * rate) / 12;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data: any = {
        name: formData.name,
        description: formData.description,
        categoryId: formData.categoryId || undefined,
        purchaseDate: formData.purchaseDate,
        purchaseCost: formData.purchaseCost,
        salvageValue: formData.salvageValue,
        usefulLifeMonths: formData.usefulLifeMonths,
        depreciationMethod: formData.depreciationMethod as
          | "straight_line"
          | "declining_balance",
        decliningRate:
          formData.depreciationMethod === "declining_balance"
            ? formData.decliningRate
            : undefined,
        assetAccountCode: formData.assetAccountCode,
        accumDepreciationAccountCode: formData.accumDepreciationAccountCode,
        depreciationExpenseAccountCode: formData.depreciationExpenseAccountCode,
        supplierId: formData.supplierId || undefined,
        // Payment source
        bankAccountId: formData.bankAccountId || undefined,
        paymentAccountCode: formData.bankAccountId
          ? undefined
          : formData.paymentAccountCode || "2000",
        // New fields
        serialNumber: formData.serialNumber || undefined,
        location: formData.location || undefined,
        departmentId: formData.departmentId || undefined,
        warrantyStartDate: formData.warrantyStartDate || undefined,
        warrantyEndDate: formData.warrantyEndDate || undefined,
        insuredValue: formData.insuredValue || undefined,
        status: formData.status,
      };

      let response;
      if (isEdit && id) {
        response = await fixedAssetsApi.update(id, data);
      } else {
        response = await fixedAssetsApi.create(data);
      }

      if (response.success) {
        toast.success(
          isEdit ? t("assets.success.update") : t("assets.success.create"),
        );

        // Show journal entry if created new
        if (!isEdit && (response as any).journalEntry) {
          setJournalEntry((response as any).journalEntry);
          setShowJournalEntry(true);
        } else {
          navigate("/assets");
        }
      } else {
        toast.error((response as any).error || t("assets.errors.saveFailed"));
      }
    } catch (error: any) {
      console.error("[AssetCreatePage] Save error:", error);
      toast.error(error.response?.data?.error || t("assets.errors.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to convert MongoDB Decimal values to JavaScript numbers
  const getNumericValue = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    if (typeof value === 'object') {
      // Handle MongoDB Decimal128 objects with $numberDecimal
      if (value.$numberDecimal !== undefined) {
        const num = parseFloat(value.$numberDecimal);
        return isNaN(num) ? 0 : num;
      }
      // Handle objects with toString method
      if (value.toString && typeof value.toString === 'function') {
        const str = value.toString();
        if (str === '[object Object]') return 0;
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
      }
    }
    return 0;
  };

  const formatCurrency = (amount: any) => {
    const num = getNumericValue(amount);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  if (initialLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const monthlyDepreciation = calculateDepreciation();
  const annualDepreciation = monthlyDepreciation * 12;
  const depreciableAmount = formData.purchaseCost - formData.salvageValue;

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
            <h1 className="text-3xl font-bold dark:text-white">
              {isEdit ? t("assets.editTitle") : t("assets.createTitle")}
            </h1>
            <p className="text-muted-foreground dark:text-slate-400">
              {isEdit
                ? t("assets.editDescription")
                : t("assets.createDescription")}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/assets")}
            className="mr-2 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <X className="mr-2 h-4 w-4" />
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {t("common.save")}
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Package className="h-5 w-5" />
                    {t("assets.sections.basicInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Reference Number - Only shown when editing */}
                  {isEdit && formData.referenceNo && (
                    <div className="space-y-2">
                      <Label htmlFor="referenceNo" className="dark:text-slate-200">
                        <Hash className="h-4 w-4 inline mr-1" />
                        {t("assets.fields.referenceNo")}
                      </Label>
                      <Input
                        id="referenceNo"
                        value={formData.referenceNo}
                        disabled
                        className="bg-muted dark:bg-slate-700"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="dark:text-slate-200">{t("assets.fields.name")} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                        placeholder={t("assets.placeholders.name")}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className="dark:text-slate-200">
                        {t("assets.fields.category")}
                      </Label>
                      {/* DEBUG: categories count: {categories.length}, formData.categoryId: {formData.categoryId || "(empty)"} */}
                      <Select
                        value={formData.categoryId || "none"}
                        onValueChange={(v) => {
                          console.log("[DEBUG] Category selected:", v);
                          handleCategoryChange(v === "none" ? "" : v);
                        }}
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue
                            placeholder={t("assets.placeholders.category")}
                          />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="none">{t("common.none")}</SelectItem>
                          {categories
                            .filter((c: any) => c._id)
                            .map((cat: any) => (
                              <SelectItem key={cat._id} value={cat._id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="dark:text-slate-200">
                      {t("assets.fields.description")}
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder={t("assets.placeholders.description")}
                      rows={3}
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serialNumber" className="dark:text-slate-200">
                        <Hash className="h-4 w-4 inline mr-1" />
                        {t("assets.fields.serialNumber")}
                      </Label>
                      <Input
                        id="serialNumber"
                        value={formData.serialNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, serialNumber: e.target.value })
                        }
                        placeholder={t("assets.placeholders.serialNumber")}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="dark:text-slate-200">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        {t("assets.fields.location")}
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        placeholder={t("assets.placeholders.location")}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="departmentId" className="dark:text-slate-200">
                        <Building className="h-4 w-4 inline mr-1" />
                        {t("assets.fields.department")}
                      </Label>
                      <Select
                        value={formData.departmentId || "none"}
                        onValueChange={(v) =>
                          setFormData({ ...formData, departmentId: v === "none" ? "" : v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue
                            placeholder={t("assets.placeholders.department")}
                          />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="none">{t("common.none")}</SelectItem>
                          {departments.map((dept: any) => (
                            <SelectItem key={dept._id} value={dept._id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="dark:text-slate-200">
                        {t("assets.fields.status")}
                      </Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) =>
                          setFormData({ ...formData, status: v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="active">{t("assets.status.active")}</SelectItem>
                          <SelectItem value="fully_depreciated">{t("assets.status.fullyDepreciated")}</SelectItem>
                          <SelectItem value="disposed">{t("assets.status.disposed")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier" className="dark:text-slate-200">
                      {t("assets.fields.supplier")}
                    </Label>
                    <Select
                      value={formData.supplierId}
                      onValueChange={(v) =>
                        setFormData({ ...formData, supplierId: v })
                      }
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue
                          placeholder={t("assets.placeholders.supplier")}
                        />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {suppliers
                          .filter((s: any) => s._id)
                          .map((sup: any) => (
                            <SelectItem key={sup._id} value={sup._id}>
                              {sup.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Purchase Details */}
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <DollarSign className="h-5 w-5" />
                    {t("assets.sections.purchaseDetails")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate" className="dark:text-slate-200">
                        {t("assets.fields.purchaseDate")} *
                      </Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purchaseDate: e.target.value,
                          })
                        }
                        required
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchaseCost" className="dark:text-slate-200">
                        {t("assets.fields.purchaseCost")} *
                      </Label>
                      <Input
                        id="purchaseCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.purchaseCost}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purchaseCost: parseFloat(e.target.value) || 0,
                          })
                        }
                        required
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salvageValue" className="dark:text-slate-200">
                        {t("assets.fields.salvageValue")}
                      </Label>
                      <Input
                        id="salvageValue"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.salvageValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salvageValue: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">{t("assets.fields.depreciableAmount")}</Label>
                      <div className="p-2 bg-muted rounded-md dark:bg-slate-700">
                        <span className="text-lg font-semibold dark:text-white">
                          {formatCurrency(depreciableAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Warranty & Insurance */}
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Shield className="h-5 w-5" />
                    {t("assets.sections.warrantyInsurance")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="warrantyStartDate" className="dark:text-slate-200">
                        {t("assets.fields.warrantyStartDate")}
                      </Label>
                      <Input
                        id="warrantyStartDate"
                        type="date"
                        value={formData.warrantyStartDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            warrantyStartDate: e.target.value,
                          })
                        }
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="warrantyEndDate" className="dark:text-slate-200">
                        {t("assets.fields.warrantyEndDate")}
                      </Label>
                      <Input
                        id="warrantyEndDate"
                        type="date"
                        value={formData.warrantyEndDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            warrantyEndDate: e.target.value,
                          })
                        }
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insuredValue" className="dark:text-slate-200">
                      {t("assets.fields.insuredValue")}
                    </Label>
                    <Input
                      id="insuredValue"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.insuredValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          insuredValue: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                    />
                    {formData.insuredValue > 0 && (
                      <p className="text-sm text-muted-foreground dark:text-slate-400">
                        {formatCurrency(formData.insuredValue)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Depreciation Settings */}
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Calculator className="h-5 w-5" />
                    {t("assets.sections.depreciation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="usefulLifeMonths" className="dark:text-slate-200">
                        {t("assets.fields.usefulLifeMonths")} *
                      </Label>
                      <Input
                        id="usefulLifeMonths"
                        type="number"
                        min="1"
                        value={formData.usefulLifeMonths}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            usefulLifeMonths: parseInt(e.target.value) || 60,
                          })
                        }
                        required
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depreciationMethod" className="dark:text-slate-200">
                        {t("assets.fields.depreciationMethod")} *
                      </Label>
                      <Select
                        value={formData.depreciationMethod}
                        onValueChange={(v) =>
                          setFormData({ ...formData, depreciationMethod: v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="straight_line">
                            {t("assets.depreciation.straightLine")}
                          </SelectItem>
                          <SelectItem value="declining_balance">
                            {t("assets.depreciation.decliningBalance")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.depreciationMethod === "declining_balance" && (
                      <div className="space-y-2">
                        <Label htmlFor="decliningRate" className="dark:text-slate-200">
                          {t("assets.fields.decliningRate")} (%)
                        </Label>
                        <Input
                          id="decliningRate"
                          type="number"
                          min="1"
                          max="100"
                          value={formData.decliningRate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              decliningRate: parseInt(e.target.value) || 20,
                            })
                          }
                          className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Account Codes */}
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Building2 className="h-5 w-5" />
                    {t("assets.sections.accounts")}
                  </CardTitle>
                  <CardDescription className="dark:text-slate-400">
                    {t("assets.sections.accountsDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assetAccountCode" className="dark:text-slate-200">
                        {t("assets.fields.assetAccount")}
                      </Label>
                      <Select
                        value={formData.assetAccountCode}
                        onValueChange={(v) =>
                          setFormData({ ...formData, assetAccountCode: v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Select asset account" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          {chartAccounts
                            .filter((acc: any) => acc.type === "asset" && acc.code?.startsWith("17"))
                            .map((acc: any) => (
                              <SelectItem key={acc.code} value={acc.code}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accumDepreciationAccountCode" className="dark:text-slate-200">
                        {t("assets.fields.accumDepreciationAccount")}
                      </Label>
                      <Select
                        value={formData.accumDepreciationAccountCode}
                        onValueChange={(v) =>
                          setFormData({ ...formData, accumDepreciationAccountCode: v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Select accumulated depreciation account" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          {chartAccounts
                            .filter((acc: any) => acc.type === "asset" && (acc.code?.startsWith("18") || acc.name?.toLowerCase().includes("accumulated depreciation")))
                            .map((acc: any) => (
                              <SelectItem key={acc.code} value={acc.code}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depreciationExpenseAccountCode" className="dark:text-slate-200">
                        {t("assets.fields.depreciationExpenseAccount")}
                      </Label>
                      <Select
                        value={formData.depreciationExpenseAccountCode}
                        onValueChange={(v) =>
                          setFormData({ ...formData, depreciationExpenseAccountCode: v })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Select depreciation expense account" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          {chartAccounts
                            .filter((acc: any) => acc.type === "expense" && (acc.code?.startsWith("5") || acc.code?.startsWith("6") || acc.name?.toLowerCase().includes("depreciation")))
                            .map((acc: any) => (
                              <SelectItem key={acc.code} value={acc.code}>
                                {acc.code} - {acc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Source */}
              {!isEdit && (
                <Card className="dark:bg-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 dark:text-white">
                      <DollarSign className="h-5 w-5" />
                      Payment Source
                    </CardTitle>
                    <CardDescription className="dark:text-slate-400">
                      How was this asset paid for? Leave blank to record as a
                      credit purchase (Accounts Payable — 2000).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankAccountId" className="dark:text-slate-200">
                        Pay from Bank Account (optional)
                      </Label>
                      <Select
                        value={formData.bankAccountId}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            bankAccountId: v === "none" ? "" : v,
                            paymentAccountCode: v && v !== "none" ? "" : "2000",
                          })
                        }
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Credit purchase — AP (2000)" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="none">
                            Credit purchase — Accounts Payable (2000)
                          </SelectItem>
                          {bankAccounts.map((acc: any) => (
                            <SelectItem key={acc._id} value={acc._id}>
                              {acc.name}
                              {acc.cachedBalance !== undefined
                                ? ` — Balance: ${acc.cachedBalance?.toLocaleString()}`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.bankAccountId ? (
                        <p className="text-xs text-muted-foreground dark:text-slate-400">
                          Journal: DR Asset Account / CR Bank Account
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground dark:text-slate-400">
                          Journal: DR Asset Account / CR Accounts Payable (2000)
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Summary */}
            <div className="space-y-6">
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="dark:text-white">{t("assets.sections.summary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.purchaseCost")}
                    </Label>
                    <div className="text-2xl font-bold dark:text-white">
                      {formatCurrency(formData.purchaseCost)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.salvageValue")}
                    </Label>
                    <div className="text-xl dark:text-slate-300">
                      {formatCurrency(formData.salvageValue)}
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.depreciableAmount")}
                    </Label>
                    <div className="text-xl font-semibold dark:text-white">
                      {formatCurrency(depreciableAmount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.usefulLifeMonths")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                      <span className="dark:text-slate-300">
                        {formData.usefulLifeMonths} months (
                        {Math.floor(formData.usefulLifeMonths / 12)} years)
                      </span>
                    </div>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.monthlyDepreciation")}
                    </Label>
                    <div className="text-2xl font-bold text-primary dark:text-primary">
                      {formatCurrency(monthlyDepreciation)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground dark:text-slate-400">
                      {t("assets.fields.annualDepreciation")}
                    </Label>
                    <div className="text-xl dark:text-slate-300">
                      {formatCurrency(annualDepreciation)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>

        {/* Journal Entry Dialog */}
        {showJournalEntry && journalEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-[600px] max-h-[80vh] overflow-y-auto dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white">{t("assets.journalEntry.title")}</CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t("assets.journalEntry.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg dark:bg-slate-700">
                  <p className="font-medium dark:text-white">
                    {t("assets.journalEntry.posted")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 dark:text-slate-400">
                    {t("assets.journalEntry.entryNumber")}:{" "}
                    {journalEntry.entryNumber}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t("assets.journalEntry.lines")}</Label>
                  <div className="border rounded-lg overflow-hidden dark:border-slate-600">
                    <table className="w-full text-sm">
                      <thead className="bg-muted dark:bg-slate-700">
                        <tr>
                          <th className="text-left p-2 dark:text-slate-200">
                            {t("assets.journalEntry.account")}
                          </th>
                          <th className="text-right p-2 dark:text-slate-200">
                            {t("assets.journalEntry.debit")}
                          </th>
                          <th className="text-right p-2 dark:text-slate-200">
                            {t("assets.journalEntry.credit")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {journalEntry.lines?.map((line: any, idx: number) => (
                          <tr key={idx} className="border-t dark:border-slate-600">
                            <td className="p-2 dark:text-slate-300">{line.accountName}</td>
                            <td className="text-right p-2 dark:text-slate-300">
                              {line.debit > 0
                                ? formatCurrency(line.debit)
                                : "-"}
                            </td>
                            <td className="text-right p-2 dark:text-slate-300">
                              {line.credit > 0
                                ? formatCurrency(line.credit)
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => {
                      setShowJournalEntry(false);
                      navigate("/assets");
                    }}
                    className="dark:bg-primary dark:text-primary-foreground"
                  >
                    {t("common.done")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
