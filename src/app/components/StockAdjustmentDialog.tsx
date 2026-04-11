import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { stockApi, productsApi, warehousesApi } from "@/lib/api";
import { toast } from "sonner";

interface Product {
  _id: string;
  name: string;
  sku: string;
  currentStock?: number;
  unitCost?: number;
}

interface Warehouse {
  _id: string;
  name: string;
}

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedProductId?: string;
}

const adjustmentReasons = [
  { value: "damage", label: "Damage", color: "red" },
  { value: "loss", label: "Loss", color: "red" },
  { value: "theft", label: "Theft", color: "red" },
  { value: "expired", label: "Expired", color: "orange" },
  { value: "correction", label: "Stock Correction", color: "blue" },
  { value: "transfer", label: "Transfer", color: "green" },
];

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedProductId,
}: StockAdjustmentDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fetchingData, setFetchingData] = useState(false);

  const [form, setForm] = useState({
    product: preselectedProductId || "",
    warehouse: "",
    type: "in" as "in" | "out",
    quantity: "",
    unitCost: "",
    reason: "correction",
    notes: "",
  });

  // Fetch products and warehouses when dialog opens
  useEffect(() => {
    if (open) {
      fetchProducts();
      fetchWarehouses();
    }
  }, [open]);

  const fetchProducts = async () => {
    setFetchingData(true);
    try {
      const response: any = await productsApi.getAll({ limit: 1000 });
      if (response.success) {
        const productData = response.data?.data || response.data || [];
        setProducts(productData);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setFetchingData(false);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response: any = await warehousesApi.getAll();
      if (response.success) {
        const warehouseData = response.data || [];
        setWarehouses(warehouseData);
        // Auto-select first warehouse if available
        if (warehouseData.length > 0 && !form.warehouse) {
          setForm((prev) => ({ ...prev, warehouse: warehouseData[0]._id }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    }
  };

  const selectedProduct = products.find((p) => p._id === form.product);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.product || !form.quantity || !form.reason) {
      toast.error(t("stockAdjustment.validationError", "Please fill in all required fields"));
      return;
    }

    const quantity = parseFloat(form.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error(t("stockAdjustment.invalidQuantity", "Please enter a valid quantity greater than 0"));
      return;
    }

    // Determine type based on reason or explicit selection
    const type = form.type;

    setLoading(true);
    try {
      const response = await stockApi.adjustStock({
        product: form.product,
        warehouse: form.warehouse || undefined,
        quantity,
        type,
        reason: form.reason as any,
        notes: form.notes || undefined,
      });

      if (response.success) {
        toast.success(
          t("stockAdjustment.success", "Stock adjusted successfully")
        );
        // Reset form
        setForm({
          product: "",
          warehouse: warehouses.length > 0 ? warehouses[0]._id : "",
          type: "in",
          quantity: "",
          unitCost: "",
          reason: "correction",
          notes: "",
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(t("stockAdjustment.error", "Failed to adjust stock"));
      }
    } catch (error: any) {
      const message = error?.message || t("common.error", "An error occurred");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t("stockAdjustment.title", "Stock Adjustment")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product" className="dark:text-slate-200">
              {t("stockAdjustment.product", "Product")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={form.product}
              onValueChange={(value) =>
                setForm({ ...form, product: value, unitCost: selectedProduct?.unitCost?.toString() || "" })
              }
              disabled={!!preselectedProductId || fetchingData}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                <SelectValue
                  placeholder={
                    fetchingData
                      ? t("common.loading", "Loading...")
                      : t("stockAdjustment.selectProduct", "Select product")
                  }
                />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-600 max-h-60">
                {products.map((product) => (
                  <SelectItem
                    key={product._id}
                    value={product._id}
                    className="dark:text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{product.name}</span>
                      <span className="text-muted-foreground text-xs">({product.sku})</span>
                      {product.currentStock !== undefined && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          Stock: {product.currentStock}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warehouse Selection */}
          {warehouses.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="warehouse" className="dark:text-slate-200">
                {t("stockAdjustment.warehouse", "Warehouse")}
              </Label>
              <Select
                value={form.warehouse}
                onValueChange={(value) => setForm({ ...form, warehouse: value })}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                  <SelectValue placeholder={t("stockAdjustment.selectWarehouse", "Select warehouse")} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                  {warehouses.map((warehouse) => (
                    <SelectItem
                      key={warehouse._id}
                      value={warehouse._id}
                      className="dark:text-slate-200"
                    >
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label className="dark:text-slate-200">
              {t("stockAdjustment.type", "Adjustment Type")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="in"
                  checked={form.type === "in"}
                  onChange={() => setForm({ ...form, type: "in" })}
                  className="w-4 h-4"
                />
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  {t("stockAdjustment.stockIn", "Stock In")}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="out"
                  checked={form.type === "out"}
                  onChange={() => setForm({ ...form, type: "out" })}
                  className="w-4 h-4"
                />
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <TrendingDown className="h-4 w-4" />
                  {t("stockAdjustment.stockOut", "Stock Out")}
                </span>
              </label>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="dark:text-slate-200">
              {t("stockAdjustment.quantity", "Quantity")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0.01"
              placeholder={t("stockAdjustment.enterQuantity", "Enter quantity")}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="dark:bg-slate-800 dark:text-white dark:border-slate-600"
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="dark:text-slate-200">
              {t("stockAdjustment.reason", "Reason")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={form.reason}
              onValueChange={(value) => setForm({ ...form, reason: value })}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                <SelectValue placeholder={t("stockAdjustment.selectReason", "Select reason")} />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                {adjustmentReasons.map((reason) => (
                  <SelectItem
                    key={reason.value}
                    value={reason.value}
                    className="dark:text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full bg-${reason.color}-500`}
                      />
                      {t(`stockAdjustment.reasons.${reason.value}`, reason.label)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="dark:text-slate-200">
              {t("stockAdjustment.notes", "Notes")}
            </Label>
            <Input
              id="notes"
              placeholder={t("stockAdjustment.enterNotes", "Additional notes...")}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="dark:bg-slate-800 dark:text-white dark:border-slate-600"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.product || !form.quantity}
              className={form.type === "in" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.processing", "Processing...")}
                </>
              ) : (
                <>
                  {form.type === "in" ? (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  ) : (
                    <TrendingDown className="mr-2 h-4 w-4" />
                  )}
                  {form.type === "in"
                    ? t("stockAdjustment.addStock", "Add Stock")
                    : t("stockAdjustment.removeStock", "Remove Stock")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
