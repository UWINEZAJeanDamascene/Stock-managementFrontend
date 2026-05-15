import { useState } from "react";
import { useNavigate } from "react-router";
import { Input } from "@/app/components/ui/input";
import {
  ArrowLeftRight,
  Calendar,
  Clock,
  Download,
  FileText,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { toast } from "sonner";
import {
  ReportCollectionPage,
  type ReportCatalogItem,
  type ReportMetric,
} from "./components/ReportCollectionPage";

const dailyReports: ReportCatalogItem[] = [
  {
    id: "sales",
    name: "Daily Sales Summary",
    description: "Total sales, invoices, cash vs credit breakdown, top products",
    icon: ShoppingCart,
    tone: "blue",
  },
  {
    id: "purchases",
    name: "Daily Purchases Summary",
    description: "Goods received, supplier invoices, total purchase value",
    icon: Package,
    tone: "emerald",
  },
  {
    id: "cash",
    name: "Daily Cash Position",
    description: "Opening balance, receipts, payments, closing balance per account",
    icon: Wallet,
    tone: "amber",
  },
  {
    id: "stock",
    name: "Daily Stock Movement",
    description: "Stock-in and stock-out transactions with running balances",
    icon: ArrowLeftRight,
    tone: "violet",
  },
  {
    id: "ar",
    name: "Daily AR Activity",
    description: "New invoices, payments received, credit notes",
    icon: Users,
    tone: "indigo",
  },
  {
    id: "ap",
    name: "Daily AP Activity",
    description: "New bills posted, payments made, debit notes",
    icon: Truck,
    tone: "rose",
  },
  {
    id: "journal",
    name: "Daily Journal Entries",
    description: "Every journal entry with debit, credit, narration, and user",
    icon: FileText,
    tone: "cyan",
  },
  {
    id: "tax",
    name: "Daily Tax Collected",
    description: "Output VAT from sales and withholding tax breakdown",
    icon: Receipt,
    tone: "teal",
  },
];

const reportPaths = {
  sales: "/reports/daily/sales",
  purchases: "/reports/daily/purchases",
  cash: "/reports/daily/cash",
  stock: "/reports/daily/stock",
  ar: "/reports/daily/ar",
  ap: "/reports/daily/ap",
  journal: "/reports/daily/journal",
  tax: "/reports/daily/tax",
} as const;

export default function DailyReportsPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dailyReportsApi.getToday());
  const [loading, setLoading] = useState<string | null>(null);

  const metrics: ReportMetric[] = [
    {
      label: "Reports",
      value: String(dailyReports.length),
      caption: `Available for ${selectedDate}`,
      icon: TrendingUp,
      tone: "blue",
    },
    {
      label: "Exports",
      value: String(dailyReports.length * 2),
      caption: "PDF and Excel formats",
      icon: Download,
      tone: "emerald",
    },
    {
      label: "Data",
      value: "Live",
      caption: "Operational updates",
      icon: Clock,
      tone: "amber",
    },
    {
      label: "Coverage",
      value: "Any Date",
      caption: "Historical report access",
      icon: Calendar,
      tone: "violet",
    },
  ];

  const handleViewReport = (reportId: string) => {
    const path = reportPaths[reportId as keyof typeof reportPaths];
    if (path) navigate(`${path}?date=${selectedDate}`);
  };

  const handleDownloadPDF = async (reportId: string) => {
    setLoading(reportId);
    try {
      switch (reportId) {
        case "sales":
          await dailyReportsApi.downloadSalesPDF(selectedDate);
          break;
        case "purchases":
          await dailyReportsApi.downloadPurchasesPDF(selectedDate);
          break;
        case "cash":
          await dailyReportsApi.downloadCashPositionPDF(selectedDate);
          break;
        case "stock":
          await dailyReportsApi.downloadStockMovementPDF(selectedDate);
          break;
        case "ar":
          await dailyReportsApi.downloadARActivityPDF(selectedDate);
          break;
        case "ap":
          await dailyReportsApi.downloadAPActivityPDF(selectedDate);
          break;
        case "journal":
          await dailyReportsApi.downloadJournalEntriesPDF(selectedDate);
          break;
        case "tax":
          await dailyReportsApi.downloadTaxCollectedPDF(selectedDate);
          break;
      }
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadExcel = async (reportId: string) => {
    setLoading(`${reportId}-excel`);
    try {
      switch (reportId) {
        case "sales":
          await dailyReportsApi.downloadSalesExcel(selectedDate);
          break;
        case "purchases":
          await dailyReportsApi.downloadPurchasesExcel(selectedDate);
          break;
        case "cash":
          await dailyReportsApi.downloadCashPositionExcel(selectedDate);
          break;
        case "stock":
          await dailyReportsApi.downloadStockMovementExcel(selectedDate);
          break;
        case "ar":
          await dailyReportsApi.downloadARActivityExcel(selectedDate);
          break;
        case "ap":
          await dailyReportsApi.downloadAPActivityExcel(selectedDate);
          break;
        case "journal":
          await dailyReportsApi.downloadJournalEntriesExcel(selectedDate);
          break;
        case "tax":
          await dailyReportsApi.downloadTaxCollectedExcel(selectedDate);
          break;
      }
    } catch {
      toast.error("Failed to download Excel");
    } finally {
      setLoading(null);
    }
  };

  return (
    <ReportCollectionPage
      title="Daily Reports"
      subtitle="Operational snapshots for end-of-day analysis across sales, purchasing, cash, stock, AR, AP, journals, and tax."
      badge="Daily"
      icon={Calendar}
      tone="blue"
      reports={dailyReports}
      metrics={metrics}
      infoTitle="End-of-day operating pack"
      infoBody="Select any calendar date to review the business activity captured for that day, then open the detailed report or export it for distribution."
      controls={
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          <div className="min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Report Date
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-2 h-9 w-44 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            />
          </div>
        </div>
      }
      onView={handleViewReport}
      onDownloadPDF={handleDownloadPDF}
      onDownloadExcel={handleDownloadExcel}
      loading={loading}
    />
  );
}
