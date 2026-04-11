import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { pettyCashApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

export default function PettyCashTransactionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [fund, setFund] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchTransactions = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (typeFilter !== "all") params.type = typeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await pettyCashApi.getFundTransactions(id, params);
      console.log("[PettyCashTransactionsPage] API Response:", response);

      if (response.success && response.data) {
        setFund(response.data.fund);
        setTransactions(response.data.transactions);
        setTotal(response.total);
        setPages(response.pages);
      }
    } catch (error) {
      console.error(
        "[PettyCashTransactionsPage] Failed to fetch transactions:",
        error,
      );
      toast.error("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [id, page, typeFilter, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterChange = () => {
    setPage(1);
    fetchTransactions();
  };

  const handleResetFilters = () => {
    setTypeFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Fix A — use fund's currencyCode instead of hardcoded 'USD'
  const formatCurrency = (amount: number) => {
    const currency = fund?.currencyCode || "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Fix B — fetch ALL transactions before building the CSV
  const exportTransactions = async () => {
    if (!id) return;
    setExportLoading(true);
    try {
      // Fetch the full dataset — limit 10000 covers any realistic fund
      const params: any = { page: 1, limit: 10000 };
      if (typeFilter !== "all") params.type = typeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await pettyCashApi.getFundTransactions(id, params);

      if (!response.success || !response.data) {
        toast.error("Failed to fetch transactions for export");
        return;
      }

      const allTx: any[] = response.data.transactions;

      const headers = [
        "Date",
        "Reference",
        "Type",
        "Description",
        "Account",
        "Amount",
        "Balance",
        "Receipt Ref",
        "Journal Entry",
      ];
      const rows = allTx.map((tx) => [
        formatDate(tx.transactionDate),
        tx.referenceNo ?? "",
        tx.typeLabel ?? tx.type ?? "",
        `"${(tx.description ?? "").replace(/"/g, '""')}"`,
        tx.expenseAccountName
          ? `"${tx.expenseAccountName} (${tx.expenseAccountId})"`
          : (tx.expenseAccountId ?? ""),
        tx.amount.toFixed(2),
        tx.runningBalance.toFixed(2),
        tx.receiptRef ?? "",
        tx.journalEntryId ?? "",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
        "\n",
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `petty-cash-transactions-${fund?.name || "export"}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(
        `Exported ${allTx.length} transaction${allTx.length !== 1 ? "s" : ""}`,
      );
    } catch (error) {
      console.error("[PettyCashTransactionsPage] Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/petty-cash")} className="dark:text-slate-200">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 dark:text-white">
                <Wallet className="h-8 w-8" />
                {fund?.name ||
                  t("pettyCash.transactions.title", "Transactions")}
              </h1>
              <p className="text-muted-foreground mt-1 dark:text-slate-400">
                {t(
                  "pettyCash.transactions.description",
                  "View transaction history",
                )}
              </p>
            </div>
          </div>
          {/* Fix B — Export button with loading state */}
          <Button
            variant="outline"
            onClick={exportTransactions}
            disabled={exportLoading}
            className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {exportLoading ? "Exporting…" : t("common.export", "Export")}
          </Button>
        </div>

        {/* Fund Summary */}
        {fund && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400">
                  {t("pettyCash.currentBalance", "Current Balance")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(fund.currentBalance)}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400">
                  {t("pettyCash.floatAmount", "Float Amount")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold dark:text-white">
                  {formatCurrency(fund.floatAmount)}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400">
                  {t("pettyCash.replenishmentNeeded", "Replenishment Needed")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-bold ${fund.replenishmentNeeded > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}
                >
                  {formatCurrency(fund.replenishmentNeeded)}
                </p>
              </CardContent>
            </Card>
            <Card className="dark:bg-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-slate-400">
                  {t("pettyCash.totalTransactions", "Total Transactions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold dark:text-white">{total}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="dark:bg-slate-800">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block dark:text-slate-400">
                  Type
                </Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="top_up">Top Up</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="opening">Opening</SelectItem>
                    <SelectItem value="replenishment">Replenishment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block dark:text-slate-400">
                  From Date
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block dark:text-slate-400">
                  To Date
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <Button onClick={handleFilterChange} variant="secondary" className="dark:bg-slate-700 dark:text-slate-200">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              <Button onClick={handleResetFilters} variant="ghost" className="dark:text-slate-200">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="dark:bg-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mb-4 dark:text-slate-400" />
                <p className="text-muted-foreground dark:text-slate-400">No transactions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                    <TableHead className="dark:text-slate-200">{t("pettyCash.date", "Date")}</TableHead>
                    <TableHead className="dark:text-slate-200">
                      {t("pettyCash.reference", "Reference")}
                    </TableHead>
                    <TableHead className="dark:text-slate-200">{t("pettyCash.type", "Type")}</TableHead>
                    <TableHead className="dark:text-slate-200">
                      {t("pettyCash.description", "Description")}
                    </TableHead>
                    <TableHead className="dark:text-slate-200">
                      {t("pettyCash.expenseAccount", "Account")}
                    </TableHead>
                    <TableHead className="text-right dark:text-slate-200">
                      {t("pettyCash.amount", "Amount")}
                    </TableHead>
                    <TableHead className="text-right dark:text-slate-200">
                      {t("pettyCash.balance", "Balance")}
                    </TableHead>
                    <TableHead className="dark:text-slate-200">
                      {t("pettyCash.receiptRef", "Receipt")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx._id} className="dark:border-slate-600">
                      <TableCell className="whitespace-nowrap dark:text-slate-300">
                        {formatDate(tx.transactionDate)}
                      </TableCell>
                      <TableCell className="font-mono text-sm dark:text-slate-300">
                        {tx.referenceNo}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.type === "top_up" ||
                            tx.type === "opening" ||
                            tx.type === "replenishment"
                              ? "default"
                              : "secondary"
                          }
                          className="gap-1 dark:bg-slate-700 dark:text-slate-200"
                        >
                          {tx.type === "top_up" && (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {tx.type === "expense" && (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {tx.typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="dark:text-slate-300">{tx.description}</TableCell>
                      <TableCell>
                        {tx.expenseAccountName ? (
                          <span className="text-sm dark:text-slate-300">
                            {tx.expenseAccountName}
                            <span className="text-muted-foreground ml-1 dark:text-slate-400">
                              ({tx.expenseAccountId})
                            </span>
                          </span>
                        ) : tx.expenseAccountId ? (
                          <span className="text-muted-foreground text-sm dark:text-slate-400">
                            {tx.expenseAccountId}
                          </span>
                        ) : (
                          <span className="text-muted-foreground dark:text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === "expense"
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {tx.type === "expense" ? "-" : "+"}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold dark:text-slate-300">
                        {formatCurrency(tx.runningBalance)}
                      </TableCell>
                      {/* Fix C — Receipt ref + optional GL journal entry badge */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-muted-foreground text-sm dark:text-slate-400">
                            {tx.receiptRef || "-"}
                          </span>
                          {tx.journalEntryId && (
                            <button
                              type="button"
                              title="View general ledger entry"
                              onClick={() =>
                                navigate(
                                  `/journal?sourceId=${tx.journalEntryId}`,
                                )
                              }
                              className="inline-flex items-center gap-0.5 self-start rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-200 transition-colors dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                              GL
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground dark:text-slate-400">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
