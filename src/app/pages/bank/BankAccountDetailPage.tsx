import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { bankAccountsApi } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Check,
  TrendingUp,
  TrendingDown,
  Upload,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Badge } from "@/app/components/ui/badge";
import { useTranslation } from "react-i18next";

interface StatementLine {
  _id: string;
  transactionDate: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  runningBalance: number;
  isReconciled: boolean;
}

interface ReconciliationItem {
  _id: string;
  date: string;
  description: string;
  amount: number;
  matched: boolean;
}

const TODAY = new Date().toISOString().split("T")[0];

export default function BankAccountDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [statementLines, _setStatementLines] = useState<StatementLine[]>([]);

  // Fix B — initialise active tab from ?tab= URL query param
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "transactions",
  );

  // ── Reconciliation state ─────────────────────────────────────────────────────
  const [journalItems, _setJournalItems] = useState<ReconciliationItem[]>([]);
  const [bankItems, _setBankItems] = useState<ReconciliationItem[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  // Fix E — statement balance / date inputs + reconcile call state
  const [reconcileBalance, setReconcileBalance] = useState("");
  const [reconcileDate, setReconcileDate] = useState(TODAY);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);

  // Fix A — Deposit / Withdraw dialog state
  const [showTxDialog, setShowTxDialog] = useState(false);
  const [txType, setTxType] = useState<"deposit" | "withdrawal">("deposit");
  const [txSaving, setTxSaving] = useState(false);
  const [txForm, setTxForm] = useState({
    amount: "",
    description: "",
    paymentMethod: "cash",
    referenceNumber: "",
    date: TODAY,
  });

  // Fix C — Transaction filter state
  const [txStartDate, setTxStartDate] = useState("");
  const [txEndDate, setTxEndDate] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  // Fix D — Import Statement dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importSaving, setImportSaving] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch statement lines - ONLY show imported CSV data
  const fetchStatementLines = useCallback(async () => {
    // Statement lines are ONLY from CSV/Excel imports
    // We don't fetch journal transactions here
    // The statementLines state is populated only via handleImport
    console.log('[BankImport] StatementLines tab only shows imported CSV data');
  }, []);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchAccount = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await bankAccountsApi.getById(id);
      if (response.success) {
        setAccount(response.data);
      }
    } catch (error) {
      console.error("[BankAccountDetailPage] Failed to fetch account:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fix C — fetchTransactions accepts optional filter params
  const fetchTransactions = useCallback(
    async (filters?: {
      startDate?: string;
      endDate?: string;
      type?: string;
    }) => {
      if (!id) return;
      try {
        const params: Record<string, string> = {};
        if (filters?.startDate) params.startDate = filters.startDate;
        if (filters?.endDate) params.endDate = filters.endDate;
        if (filters?.type && filters.type !== "all") params.type = filters.type;
        const response = await bankAccountsApi.getTransactions(id, params);
        if (response.success) {
          const txs = (response.data as any[]) || [];
          // Calculate running balance for each transaction
          // Sort by date ascending to calculate, then restore original order
          const sortedTxs = [...txs].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          let runningBalance = 0;
          const txsWithBalance = sortedTxs.map((tx) => {
            if (tx.type === "deposit" || tx.type === "transfer_in") {
              runningBalance += tx.amount || 0;
            } else if (tx.type === "withdrawal" || tx.type === "transfer_out") {
              runningBalance -= tx.amount || 0;
            } else if (tx.type === "adjustment") {
              runningBalance += tx.amount || 0; // adjustment can be positive or negative
            }
            return { ...tx, runningBalance };
          });
          // Restore original sort order (newest first)
          setTransactions(txsWithBalance.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          ));
        }
      } catch (error) {
        console.error(
          "[BankAccountDetailPage] Failed to fetch transactions:",
          error,
        );
      }
    },
    [id],
  );

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (account) {
      fetchTransactions();
      fetchStatementLines();
    }
  }, [account, fetchTransactions, fetchStatementLines]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatCurrency = (amount: any, currency: string = "USD") => {
    if (amount === null || amount === undefined || amount === "") return "-";
    let num: number;
    if (typeof amount === "object") {
      if (amount.$numberDecimal) {
        num = parseFloat(amount.$numberDecimal);
      } else if (amount.toString && typeof amount.toString === "function") {
        const str = amount.toString();
        if (str === "[object Object]") return "-";
        num = parseFloat(str);
      } else {
        return "-";
      }
    } else if (typeof amount === "string") {
      num = parseFloat(amount);
    } else {
      num = amount;
    }
    if (isNaN(num)) return "-";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
      }).format(num || 0);
    } catch {
      return `${currency} ${num.toFixed(2)}`;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  const getDifference = () => {
    const journalAmount = unmatchedJournalItems.find((j) => j._id === selectedJournal)?.amount || 0;
    const bankAmount = unmatchedStatementItems.find((b) => b._id === selectedBank)?.amount || 0;
    return journalAmount - bankAmount;
  };

  // ── Fix A: deposit/withdrawal submit ────────────────────────────────────────
  const openTxDialog = (type: "deposit" | "withdrawal") => {
    setTxType(type);
    setTxForm({
      amount: "",
      description: "",
      paymentMethod: "cash",
      referenceNumber: "",
      date: TODAY,
    });
    setShowTxDialog(true);
  };

  const handleTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setTxSaving(true);
    try {
      const response = await bankAccountsApi.addTransaction(id, {
        type: txType,
        amount: parseFloat(txForm.amount) || 0,
        description: txForm.description,
        paymentMethod: txForm.paymentMethod,
        referenceNumber: txForm.referenceNumber,
        date: txForm.date,
      } as any);
      if (response.success) {
        setShowTxDialog(false);
        setTxForm({
          amount: "",
          description: "",
          paymentMethod: "cash",
          referenceNumber: "",
          date: TODAY,
        });
        fetchTransactions({
          startDate: txStartDate,
          endDate: txEndDate,
          type: txTypeFilter,
        });
        fetchAccount();
      } else {
        alert("Failed to add transaction. Please try again.");
      }
    } catch (error) {
      console.error(
        "[BankAccountDetailPage] Failed to add transaction:",
        error,
      );
      alert("Failed to add transaction. Please try again.");
    } finally {
      setTxSaving(false);
    }
  };

  // ── Fix C: apply filter ──────────────────────────────────────────────────────
  const handleApplyFilters = () => {
    fetchTransactions({
      startDate: txStartDate,
      endDate: txEndDate,
      type: txTypeFilter,
    });
  };

  // ── Fix D: import statement ──────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setImportMessage({
        ok: false,
        text: "Invalid file type. Please upload a CSV or Excel file.",
      });
      return;
    }
    
    setImportFile(file);
    setImportMessage(null);
    
    // Parse the file
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('[BankImport] CSV parsed:', results);
          const parsed = results.data as any[];
          const mapped = parsed.map((row: any) => ({
            date: row.date || row.Date || row.DATE || row.transactionDate || row['Transaction Date'] || '',
            description: row.description || row.Description || row.DESCRIPTION || row.desc || row['Description'] || '',
            reference: row.reference || row.Reference || row.REFERENCE || row.ref || row['Reference'] || '',
            debit: parseFloat(row.debit || row.Debit || row.DEBIT || row.dr || row['Debit'] || row.withdrawal || row.Withdrawal || 0),
            credit: parseFloat(row.credit || row.Credit || row.CREDIT || row.cr || row['Credit'] || row.deposit || row.Deposit || 0),
          })).filter((row: any) => row.date && (row.debit > 0 || row.credit > 0 || row.description));
          
          console.log('[BankImport] Mapped data:', mapped);
          setImportData(mapped);
          setImportMessage({
            ok: true,
            text: `Successfully parsed ${mapped.length} transactions from CSV.`,
          });
        },
        error: (error) => {
          console.error('[BankImport] CSV parse error:', error);
          setImportMessage({
            ok: false,
            text: `Failed to parse CSV: ${error.message}`,
          });
        },
      });
    } else {
      // Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          console.log('[BankImport] Excel parsed:', jsonData);
          
          const mapped = jsonData.map((row: any) => ({
            date: row.date || row.Date || row.DATE || row.transactionDate || row['Transaction Date'] || '',
            description: row.description || row.Description || row.DESCRIPTION || row.desc || row['Description'] || '',
            reference: row.reference || row.Reference || row.REFERENCE || row.ref || row['Reference'] || '',
            debit: parseFloat(row.debit || row.Debit || row.DEBIT || row.dr || row['Debit'] || row.withdrawal || row.Withdrawal || 0),
            credit: parseFloat(row.credit || row.Credit || row.CREDIT || row.cr || row['Credit'] || row.deposit || row.Deposit || 0),
          })).filter((row: any) => row.date && (row.debit > 0 || row.credit > 0 || row.description));
          
          console.log('[BankImport] Mapped data:', mapped);
          setImportData(mapped);
          setImportMessage({
            ok: true,
            text: `Successfully parsed ${mapped.length} transactions from Excel.`,
          });
        } catch (error) {
          console.error('[BankImport] Excel parse error:', error);
          setImportMessage({
            ok: false,
            text: "Failed to parse Excel file. Please check the format.",
          });
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleImport = async () => {
    if (!id || importData.length === 0) {
      setImportMessage({
        ok: false,
        text: "No data to import. Please select a file first.",
      });
      return;
    }
    
    console.log('[BankImport] Starting import:', { accountId: id, count: importData.length });
    setImportSaving(true);
    setImportMessage(null);
    
    try {
      const payload = {
        transactions: importData.map(tx => ({
          ...tx,
          type: tx.debit > 0 ? 'withdrawal' : 'deposit',
          amount: tx.debit > 0 ? tx.debit : tx.credit,
          source: 'statement_import',
          referenceType: 'statement',
        })),
      };
      
      console.log('[BankImport] Sending payload:', payload);
      
      const response = await bankAccountsApi.importCSV(id, payload);
      
      console.log('[BankImport] API response:', response);
      
      if (response.success) {
        const count = (response.data as any)?.imported ?? importData.length;
        setImportMessage({
          ok: true,
          text: `Successfully imported ${count} transaction(s).`,
        });
        
        // Add imported data to statementLines state (ONLY CSV data, not journal transactions)
        const newStatementLines: StatementLine[] = importData.map((tx, index) => ({
          _id: `imported-${Date.now()}-${index}`,
          transactionDate: tx.date,
          description: tx.description,
          reference: tx.reference || "",
          debit: tx.debit || 0,
          credit: tx.credit || 0,
          runningBalance: 0, // Will be calculated
          isReconciled: false,
        }));
        
        _setStatementLines(prev => [...prev, ...newStatementLines]);
        
        setImportFile(null);
        setImportData([]);
        
        // Refresh transactions tab only
        await fetchTransactions({
          startDate: txStartDate,
          endDate: txEndDate,
          type: txTypeFilter,
        });
        await fetchAccount();
      } else {
        setImportMessage({
          ok: false,
          text: "Import failed — the server rejected the request.",
        });
      }
    } catch (error: any) {
      console.error("[BankImport] Import error:", error);
      setImportMessage({
        ok: false,
        text: error.message || "Import failed — please try again.",
      });
    } finally {
      setImportSaving(false);
    }
  };

  // ── Fix E: reconcile ─────────────────────────────────────────────────────────
  const handleReconcile = async () => {
    if (!id) return;
    setReconciling(true);
    setReconcileMessage(null);
    try {
      const response = await bankAccountsApi.reconcile(id, {
        statementBalance: parseFloat(reconcileBalance) || 0,
        statementDate: reconcileDate,
      });
      if (response.success) {
        setReconcileMessage("✓ Reconciliation completed successfully.");
        setSelectedJournal(null);
        setSelectedBank(null);
        // Refresh to get updated lists
        fetchTransactions({
          startDate: txStartDate,
          endDate: txEndDate,
          type: txTypeFilter,
        });
      } else {
        setReconcileMessage(
          "Reconciliation failed — please check your inputs and try again.",
        );
      }
    } catch (error) {
      console.error("[BankAccountDetailPage] Reconcile error:", error);
      setReconcileMessage("Reconciliation failed — please try again.");
    } finally {
      setReconciling(false);
    }
  };

  // Prepare reconciliation data - journal items (transactions) vs statement items (imported)
  const unmatchedJournalItems = transactions.filter(tx => 
    !tx.isReconciled && 
    (tx.type === 'deposit' || tx.type === 'withdrawal' || tx.type === 'transfer_in' || tx.type === 'transfer_out')
  ).map(tx => ({
    _id: tx._id,
    date: tx.date,
    description: tx.description || tx.referenceNumber || tx.type,
    amount: tx.type === 'deposit' || tx.type === 'transfer_in' ? tx.amount : -tx.amount,
    matched: false,
  }));

  const unmatchedStatementItems = statementLines.filter(line => !line.isReconciled).map(line => ({
    _id: line._id,
    date: line.transactionDate,
    description: line.description,
    amount: line.credit > 0 ? line.credit : -line.debit,
    matched: false,
  }));

  // ── Loading guard ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin dark:text-slate-400" />
        </div>
      </Layout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Page header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/bank-accounts")}
            className="dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold dark:text-white">
              {account?.name ||
                t("bankAccount.details", "Bank Account Details")}
            </h1>
            <p className="text-muted-foreground dark:text-slate-400">
              {account?.bankName} — {account?.accountNumber}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-200">
                {t("bankAccount.currentBalance", "Current Balance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {formatCurrency(
                  account?.cachedBalance ?? account?.openingBalance ?? 0,
                  account?.currencyCode,
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-200">
                {t("bankAccount.currency", "Currency")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {account?.currencyCode || "USD"}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-200">
                {t("bankAccount.type", "Type")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize dark:text-white">
                {account?.accountType?.replace(/_/g, " ") || "Bank"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 dark:bg-slate-800">
            <TabsTrigger value="transactions" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              {t("bankAccount.transactions", "Transactions")}
            </TabsTrigger>
            <TabsTrigger value="statements" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              {t("bankAccount.statementLines", "Statement Lines")}
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              {t("bankAccount.reconciliation", "Reconciliation")}
            </TabsTrigger>
          </TabsList>

          {/* ── Transactions Tab ──────────────────────────────────────────────── */}
          <TabsContent value="transactions">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="dark:text-white">
                    {t(
                      "bankAccounts.journalTransactions",
                      "Journal Transactions",
                    )}
                  </CardTitle>
                  <div className="flex gap-2">
                    {/* Fix A — Deposit button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/40"
                      onClick={() => openTxDialog("deposit")}
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      {t("bankAccount.deposit", "Deposit")}
                    </Button>
                    {/* Fix A — Withdraw button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                      onClick={() => openTxDialog("withdrawal")}
                    >
                      <TrendingDown className="mr-2 h-4 w-4" />
                      {t("bankAccount.withdraw", "Withdraw")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        fetchTransactions({
                          startDate: txStartDate,
                          endDate: txEndDate,
                          type: txTypeFilter,
                        })
                      }
                      className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t("common.refresh", "Refresh")}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Fix C — Filter row */}
                <div className="flex flex-wrap gap-3 mb-4 p-3 bg-muted/40 rounded-lg border dark:bg-slate-700/50 dark:border-slate-600">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("bankAccount.dateFrom", "Date From")}
                    </Label>
                    <Input
                      type="date"
                      className="h-8 text-sm w-36 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      value={txStartDate}
                      onChange={(e) => setTxStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("bankAccount.dateTo", "Date To")}
                    </Label>
                    <Input
                      type="date"
                      className="h-8 text-sm w-36 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      value={txEndDate}
                      onChange={(e) => setTxEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground dark:text-slate-400">
                      {t("bankAccount.type", "Type")}
                    </Label>
                    <Select
                      value={txTypeFilter}
                      onValueChange={setTxTypeFilter}
                    >
                      <SelectTrigger className="h-8 text-sm w-40 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="all" className="dark:text-slate-200">
                          {t("common.all", "All")}
                        </SelectItem>
                        <SelectItem value="deposit" className="dark:text-slate-200">
                          {t("bankAccount.deposit", "Deposit")}
                        </SelectItem>
                        <SelectItem value="withdrawal" className="dark:text-slate-200">
                          {t("bankAccount.withdrawal", "Withdrawal")}
                        </SelectItem>
                        <SelectItem value="transfer_in" className="dark:text-slate-200">
                          {t("bankAccount.transferIn", "Transfer In")}
                        </SelectItem>
                        <SelectItem value="transfer_out" className="dark:text-slate-200">
                          {t("bankAccount.transferOut", "Transfer Out")}
                        </SelectItem>
                        <SelectItem value="adjustment" className="dark:text-slate-200">
                          {t("bankAccount.adjustment", "Adjustment")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button size="sm" onClick={handleApplyFilters} className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">
                      {t("common.apply", "Apply")}
                    </Button>
                  </div>
                </div>

                {/* Transactions table */}
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700/50">
                      <TableHead className="dark:text-slate-200">{t("bankAccount.date", "Date")}</TableHead>
                      <TableHead className="dark:text-slate-200">
                        {t("bankAccount.description", "Description")}
                      </TableHead>
                      <TableHead className="dark:text-slate-200">
                        {t("bankAccount.reference", "Reference")}
                      </TableHead>
                      <TableHead className="dark:text-slate-200">{t("bankAccount.type", "Type")}</TableHead>
                      <TableHead className="dark:text-slate-200">{t("bankAccount.amount", "Amount")}</TableHead>
                      <TableHead className="dark:text-slate-200">
                        {t("bankAccount.runningBalance", "Running Balance")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="dark:bg-slate-800">
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground dark:text-slate-400"
                        >
                          {t(
                            "bankAccount.noTransactions",
                            "No transactions found",
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx._id} className="dark:hover:bg-slate-700/30">
                          <TableCell className="dark:text-slate-300">{formatDate(tx.date)}</TableCell>
                          <TableCell className="dark:text-slate-300">{tx.description || "-"}</TableCell>
                          <TableCell className="dark:text-slate-300">
                            {tx.reference ||
                              tx.referenceNumber ||
                              tx.journalEntryNumber ||
                              tx.sourceReference ||
                              (tx.journalEntryId
                                ? tx.journalEntryId.slice(-8)
                                : tx._id
                                  ? tx._id.slice(-8)
                                  : "-")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                tx.type === "deposit" || tx.type === "transfer_in" ? "default" : "secondary"
                              }
                              className={
                                tx.type === "deposit" || tx.type === "transfer_in"
                                  ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                  : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                              }
                            >
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium dark:text-slate-200">
                            <span
                              className={
                                tx.type === "deposit" || tx.type === "transfer_in"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }
                            >
                              {tx.type === "deposit" || tx.type === "transfer_in" ? "+" : "-"}
                              {formatCurrency(tx.amount, account?.currencyCode)}
                            </span>
                          </TableCell>
                          <TableCell className="dark:text-slate-300">
                            {formatCurrency(
                              tx.runningBalance,
                              account?.currencyCode,
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Statement Lines Tab ──────────────────────────────────────────── */}
          <TabsContent value="statements">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="dark:text-white">
                    {t(
                      "bankAccount.bankStatementLines",
                      "Bank Statement Lines",
                    )}
                  </CardTitle>
                  {/* Fix D — Import Statement button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImportFile(null);
                      setImportData([]);
                      setImportMessage(null);
                      setShowImportDialog(true);
                    }}
                    className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {t("bankAccount.importStatement", "Import Statement")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {statementLines.length === 0 ? (
                  <p className="text-muted-foreground dark:text-slate-400 text-center py-8">
                    {t(
                      "bankAccount.noStatementLines",
                      "No statement lines imported yet. Import a bank statement to see lines here.",
                    )}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700/50">
                        <TableHead className="dark:text-slate-200">{t("bankAccount.date", "Date")}</TableHead>
                        <TableHead className="dark:text-slate-200">
                          {t("bankAccount.description", "Description")}
                        </TableHead>
                        <TableHead className="dark:text-slate-200">
                          {t("bankAccount.reference", "Reference")}
                        </TableHead>
                        <TableHead className="dark:text-slate-200">{t("bankAccount.debit", "Debit")}</TableHead>
                        <TableHead className="dark:text-slate-200">
                          {t("bankAccount.credit", "Credit")}
                        </TableHead>
                        <TableHead className="dark:text-slate-200">
                          {t("bankAccount.runningBalance", "Balance")}
                        </TableHead>
                        <TableHead className="dark:text-slate-200">
                          {t("bankAccount.status", "Status")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="dark:bg-slate-800">
                      {statementLines.map((line) => (
                        <TableRow key={line._id} className="dark:hover:bg-slate-700/30">
                          <TableCell className="dark:text-slate-300">
                            {formatDate(line.transactionDate)}
                          </TableCell>
                          <TableCell className="dark:text-slate-300">{line.description}</TableCell>
                          <TableCell className="dark:text-slate-300">{line.reference || "-"}</TableCell>
                          <TableCell className="text-red-600 dark:text-red-400">
                            {line.debit
                              ? formatCurrency(
                                  line.debit,
                                  account?.currencyCode,
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="text-green-600 dark:text-green-400">
                            {line.credit
                              ? formatCurrency(
                                  line.credit,
                                  account?.currencyCode,
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="dark:text-slate-300">
                            {formatCurrency(
                              line.runningBalance,
                              account?.currencyCode,
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                line.isReconciled ? "default" : "secondary"
                              }
                            >
                              {line.isReconciled
                                ? t("bankAccount.reconciled", "Reconciled")
                                : t("bankAccount.unreconciled", "Unreconciled")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Reconciliation Tab ───────────────────────────────────────────── */}
          <TabsContent value="reconciliation">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  {t("bankAccount.reconciliation", "Bank Reconciliation")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Fix E — Statement balance & date inputs */}
                <div className="mb-6 p-4 border rounded-lg bg-muted/40 space-y-4 dark:bg-slate-700/50 dark:border-slate-600">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide dark:text-slate-400">
                    {t("bankAccount.reconcileInputs", "Statement Details")}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="reconcileBalance" className="dark:text-slate-200">
                        {t(
                          "bankAccount.statementBalance",
                          "Statement Closing Balance",
                        )}
                      </Label>
                      <Input
                        id="reconcileBalance"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={reconcileBalance}
                        onChange={(e) => setReconcileBalance(e.target.value)}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="reconcileDate" className="dark:text-slate-200">
                        {t("bankAccount.statementDate", "Statement Date")}
                      </Label>
                      <Input
                        id="reconcileDate"
                        type="date"
                        value={reconcileDate}
                        onChange={(e) => setReconcileDate(e.target.value)}
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Difference display */}
                <div className="mb-6 p-4 bg-muted rounded-lg dark:bg-slate-700/50">
                  <div className="text-sm text-muted-foreground dark:text-slate-400">
                    {t("bankAccount.difference", "Difference")}
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      getDifference() === 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {formatCurrency(getDifference(), account?.currencyCode)}
                  </div>
                </div>

                {/* Two-column matching */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Journal Items */}
                  <div>
                    <h3 className="font-medium mb-2 dark:text-slate-200">
                      {t(
                        "bankAccount.unmatchedJournal",
                        "Unmatched Journal Lines",
                      )}
                      <span className="ml-2 text-sm text-muted-foreground dark:text-slate-400">
                        ({unmatchedJournalItems.length})
                      </span>
                    </h3>
                    <div className="border rounded-lg dark:border-slate-600">
                      {unmatchedJournalItems.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground dark:text-slate-400">
                          {t(
                            "bankAccount.noJournalItems",
                            "No unmatched journal items",
                          )}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="dark:bg-slate-700/50">
                              <TableHead />
                              <TableHead className="dark:text-slate-200">
                                {t("bankAccount.date", "Date")}
                              </TableHead>
                              <TableHead className="dark:text-slate-200">
                                {t("bankAccount.description", "Description")}
                              </TableHead>
                              <TableHead className="dark:text-slate-200">
                                {t("bankAccount.amount", "Amount")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="dark:bg-slate-800">
                            {unmatchedJournalItems.map((item) => (
                              <TableRow
                                key={item._id}
                                className={`cursor-pointer dark:hover:bg-slate-700/30 ${selectedJournal === item._id ? "bg-muted dark:bg-slate-700" : ""}`}
                                onClick={() => setSelectedJournal(item._id)}
                              >
                                <TableCell>
                                  <input
                                    type="radio"
                                    readOnly
                                    checked={selectedJournal === item._id}
                                    className="dark:accent-slate-400"
                                  />
                                </TableCell>
                                <TableCell className="dark:text-slate-300">{formatDate(item.date)}</TableCell>
                                <TableCell className="dark:text-slate-300">{item.description}</TableCell>
                                <TableCell className={item.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                  {formatCurrency(
                                    Math.abs(item.amount),
                                    account?.currencyCode,
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>

                  {/* Bank Statement Items */}
                  <div>
                    <h3 className="font-medium mb-2 dark:text-slate-200">
                      {t(
                        "bankAccount.unmatchedStatement",
                        "Unmatched Statement Lines",
                      )}
                      <span className="ml-2 text-sm text-muted-foreground dark:text-slate-400">
                        ({unmatchedStatementItems.length})
                      </span>
                    </h3>
                    <div className="border rounded-lg dark:border-slate-600">
                      {unmatchedStatementItems.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground dark:text-slate-400">
                          {t(
                            "bankAccount.noBankItems",
                            "No unmatched statement items. Import a statement first.",
                          )}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="dark:bg-slate-700/50">
                              <TableHead />
                              <TableHead className="dark:text-slate-200">
                                {t("bankAccount.date", "Date")}
                              </TableHead>
                              <TableHead className="dark:text-slate-200">
                                {t("bankAccount.description", "Description")}
                              </TableHead>
                              <TableHead className="dark:text-slate-200">
                                {t("bankAccount.amount", "Amount")}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="dark:bg-slate-800">
                            {unmatchedStatementItems.map((item) => (
                              <TableRow
                                key={item._id}
                                className={`cursor-pointer dark:hover:bg-slate-700/30 ${selectedBank === item._id ? "bg-muted dark:bg-slate-700" : ""}`}
                                onClick={() => setSelectedBank(item._id)}
                              >
                                <TableCell>
                                  <input
                                    type="radio"
                                    readOnly
                                    checked={selectedBank === item._id}
                                    className="dark:accent-slate-400"
                                  />
                                </TableCell>
                                <TableCell className="dark:text-slate-300">{formatDate(item.date)}</TableCell>
                                <TableCell className="dark:text-slate-300">{item.description}</TableCell>
                                <TableCell className={item.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                  {formatCurrency(
                                    Math.abs(item.amount),
                                    account?.currencyCode,
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fix E — Reconcile button (calls real endpoint) */}
                <div className="mt-6 flex flex-col items-center gap-3">
                  {reconcileMessage && (
                    <p
                      className={`text-sm font-medium ${
                        reconcileMessage.startsWith("✓")
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {reconcileMessage}
                    </p>
                  )}
                  <Button
                    disabled={reconciling || !reconcileBalance}
                    onClick={handleReconcile}
                    className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                  >
                    {reconciling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("bankAccount.reconciling", "Reconciling...")}
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {t("bankAccount.match", "Match Selected")}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Fix A: Deposit / Withdraw Dialog ────────────────────────────────── */}
      <Dialog open={showTxDialog} onOpenChange={setShowTxDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {txType === "deposit"
                ? t("bankAccount.addDeposit", "Add Deposit")
                : t("bankAccount.addWithdrawal", "Add Withdrawal")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTxSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tx-amount" className="dark:text-slate-200">
                {t("bankAccount.amount", "Amount")} *
              </Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={txForm.amount}
                onChange={(e) =>
                  setTxForm({ ...txForm, amount: e.target.value })
                }
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-description" className="dark:text-slate-200">
                {t("bankAccount.description", "Description")}
              </Label>
              <Input
                id="tx-description"
                placeholder={t(
                  "bankAccount.descriptionPlaceholder",
                  "e.g., Payment received",
                )}
                value={txForm.description}
                onChange={(e) =>
                  setTxForm({ ...txForm, description: e.target.value })
                }
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-payment-method" className="dark:text-slate-200">
                {t("bankAccount.paymentMethod", "Payment Method")}
              </Label>
              <Select
                value={txForm.paymentMethod}
                onValueChange={(v) =>
                  setTxForm({ ...txForm, paymentMethod: v })
                }
              >
                <SelectTrigger id="tx-payment-method" className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="cash" className="dark:text-slate-200">
                    {t("bankAccount.cash", "Cash")}
                  </SelectItem>
                  <SelectItem value="bank_transfer" className="dark:text-slate-200">
                    {t("bankAccount.bankTransfer", "Bank Transfer")}
                  </SelectItem>
                  <SelectItem value="cheque" className="dark:text-slate-200">
                    {t("bankAccount.cheque", "Cheque")}
                  </SelectItem>
                  <SelectItem value="mobile_money" className="dark:text-slate-200">
                    {t("bankAccount.mobileMoney", "Mobile Money")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-reference" className="dark:text-slate-200">
                {t("bankAccount.referenceNumber", "Reference Number")}
              </Label>
              <Input
                id="tx-reference"
                placeholder={t(
                  "bankAccount.referencePlaceholder",
                  "e.g., REF-001",
                )}
                value={txForm.referenceNumber}
                onChange={(e) =>
                  setTxForm({ ...txForm, referenceNumber: e.target.value })
                }
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600 dark:placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date" className="dark:text-slate-200">{t("bankAccount.date", "Date")}</Label>
              <Input
                id="tx-date"
                type="date"
                value={txForm.date}
                onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                required
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTxDialog(false)}
                disabled={txSaving}
                className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                type="submit"
                disabled={txSaving}
                className={
                  txType === "deposit"
                    ? "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                    : "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
                }
              >
                {txSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.saving", "Saving...")}
                  </>
                ) : txType === "deposit" ? (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    {t("bankAccount.confirmDeposit", "Deposit")}
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-2 h-4 w-4" />
                    {t("bankAccount.confirmWithdrawal", "Withdraw")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Fix D: Import Statement Dialog ──────────────────────────────────── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg dark:bg-slate-900 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {t("bankAccount.importStatement", "Import Bank Statement")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground dark:text-slate-400">
              {t(
                "bankAccount.importDescription",
                "Upload a CSV or Excel file containing bank statement transactions. The file should include columns for date, description, debit/credit amounts, and reference.",
              )}
            </p>
            <div className="space-y-2">
              <Label htmlFor="import-file" className="dark:text-slate-200">
                {t("bankAccount.selectFile", "Select File")}
              </Label>
              <Input
                ref={fileInputRef}
                id="import-file"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
              <p className="text-xs text-muted-foreground dark:text-slate-400">
                {t("bankAccount.supportedFormats", "Supported formats: CSV, Excel (.xlsx, .xls)")}
              </p>
            </div>
            
            {importFile && (
              <div className="p-3 bg-muted rounded-md dark:bg-slate-700">
                <p className="text-sm font-medium dark:text-slate-200">{importFile.name}</p>
                <p className="text-xs text-muted-foreground dark:text-slate-400">
                  {(importFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            )}
            
            {importData.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  {importData.length} transactions ready to import
                </p>
              </div>
            )}
            
            {importMessage && (
              <p
                className={`text-sm font-medium ${
                  importMessage.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {importMessage.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportFile(null);
                setImportData([]);
                setImportMessage(null);
              }}
              disabled={importSaving}
              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={importSaving || importData.length === 0}
              className="dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            >
              {importSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("bankAccount.importing", "Importing...")}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("bankAccount.import", "Import")} ({importData.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
