import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useParams, useNavigate } from "react-router";
import { Layout } from "@/app/layout/Layout";
import { bankAccountsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Check,
  X,
  Upload,
  FileSpreadsheet,
  Calculator,
  Lock,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Save,
  Ban,
  Play,
  Search,
  Link as LinkIcon,
  Unlink,
  EyeOff,
  FileEdit,
  Building2,
  CreditCard,
  Smartphone,
  Banknote,
  PiggyBank,
  BadgeCheck,
  Calendar,
  FileUp,
  CircleDot,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Label } from "@/app/components/ui/label";
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
  CardDescription,
  CardFooter,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { cn } from "@/lib/utils";

const getAccountTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    bk_bank: "BK Bank",
    equity_bank: "Equity Bank",
    im_bank: "I&M Bank",
    cogebanque: "Cogebanque",
    ecobank: "Ecobank",
    mtn_momo: "MTN MoMo",
    airtel_money: "Airtel Money",
    cash_in_hand: "Cash in Hand",
  };
  return labels[type] || type;
};

const getAccountTypeIcon = (type: string): ReactNode => {
  switch (type) {
    case "mtn_momo":
    case "airtel_money":
      return <Smartphone className="h-5 w-5" />;
    case "cash_in_hand":
      return <Banknote className="h-5 w-5" />;
    case "bk_bank":
    case "equity_bank":
    case "im_bank":
    case "cogebanque":
    case "ecobank":
      return <CreditCard className="h-5 w-5" />;
    default:
      return <Building2 className="h-5 w-5" />;
  }
};

const getAccountTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    bk_bank: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
    equity_bank: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60",
    im_bank: "bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60",
    cogebanque: "bg-cyan-50 text-cyan-700 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60",
    ecobank: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/60",
    mtn_momo: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    airtel_money: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
    cash_in_hand: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  };
  return colors[type] || colors.bk_bank;
};

interface JournalLine {
  type: "journal";
  journalEntryId: string;
  lineId: string;
  entryNumber: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  amount: number;
  isDebit: boolean;
  reconciled: boolean;
  matchIds?: string[];
  matchedStatementLineIds?: string[];
  sourceType: string;
  isLocked: boolean;
}

interface BankLine {
  type: "bank";
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  amount: number;
  isDebit: boolean;
  balance?: number;
  reference?: string;
  reconciled: boolean;
  status: string;
  matchedAmount: number;
  matchIds?: string[];
}

interface ReconciliationData {
  reconciliationId: string;
  status: string;
  period: { start: string; end: string };
  statementClosingBalance: number;
  bookClosingBalance: number;
  journalLines: JournalLine[];
  journalSummary: {
    totalLines: number;
    reconciledCount: number;
    unreconciledCount: number;
    totalDebits: number;
    totalCredits: number;
    bookBalance: number;
  };
  bankLines: BankLine[];
  bankSummary: {
    totalLines: number;
    reconciledCount: number;
    unreconciledCount: number;
    lastStatementBalance: number;
  };
  summary: {
    depositsInTransit: number;
    outstandingChecks: number;
    bankCreditsNotInBooks: number;
    bankChargesNotInBooks: number;
    adjustedBankBalance: number;
    adjustedBookBalance: number;
    difference: number;
  };
}

interface MatchSuggestion {
  statementLineId: string;
  journalEntryId: string;
  journalLineId: string;
  score: number;
  matchType: string;
  details: {
    statementAmount: number;
    journalAmount: number;
    daysDiff: number;
    statementDescription: string;
    journalDescription: string;
  };
}

interface BankReconciliationPageProps {
  embedded?: boolean;
  accountId?: string;
  accountData?: any;
}

export default function BankReconciliationPage({
  embedded = false,
  accountId,
  accountData,
}: BankReconciliationPageProps = {}) {
  const params = useParams<{ id: string }>();
  const id = accountId || params.id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  // State
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<{ _id: string; name: string; ledgerAccountId?: string; currency?: string } | null>(accountData || null);
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [selectedJournalLine, setSelectedJournalLine] = useState<string | null>(null);
  const [selectedBankLine, setSelectedBankLine] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("unmatched");

  // Dialogs
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedStatementLineForAdjust, setSelectedStatementLineForAdjust] = useState<BankLine | null>(null);

  // Form state
  const [startForm, setStartForm] = useState({
    statementDateStart: "",
    statementDateEnd: "",
    statementClosingBalance: "",
    notes: "",
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importConfig, setImportConfig] = useState({
    dateFormat: "auto",
    dateColumn: "Date",
    descriptionColumn: "Description",
    debitColumn: "Debit",
    creditColumn: "Credit",
    balanceColumn: "Balance",
    referenceColumn: "Reference",
  });
  const [adjustForm, setAdjustForm] = useState({
    expenseAccountCode: "6200",
    description: "",
  });
  const [processing, setProcessing] = useState(false);

  // Fetch account details
  const fetchAccount = useCallback(async () => {
    if (!id) return;
    if (accountData) {
      setAccount(accountData);
      return;
    }
    try {
      const response = await bankAccountsApi.getById(id);
      if (response.success) {
        setAccount(response.data);
      }
    } catch (error) {
      toast({
        title: t("common.error", "Error"),
        description: t("bankReconciliation.failedLoadAccount", "Failed to load bank account"),
        variant: "destructive",
      });
    }
  }, [id, accountData, toast, t]);

  // Fetch reconciliation data
  const fetchReconciliationData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await bankAccountsApi.getReconciliationDataNew(id);
      if (response.success) {
        setReconciliation(response.data);
      }
    } catch (error) {
      // No active reconciliation - that's ok
      setReconciliation(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch match suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!id || !reconciliation) return;
    try {
      const response = await bankAccountsApi.getMatchSuggestionsNew(id, {
        reconciliationId: reconciliation.reconciliationId,
      });
      if (response.success) {
        setSuggestions(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    }
  }, [id, reconciliation]);

  // Initial load - run once on mount
  useEffect(() => {
    fetchAccount();
    fetchReconciliationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch suggestions when reconciliation is loaded
  useEffect(() => {
    if (reconciliation?.status === "in_progress") {
      fetchSuggestions();
    }
  }, [reconciliation, fetchSuggestions]);

  // Start reconciliation
  const handleStartReconciliation = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const response = await bankAccountsApi.startReconciliationNew(id, {
        statementDateStart: startForm.statementDateStart,
        statementDateEnd: startForm.statementDateEnd,
        statementClosingBalance: parseFloat(startForm.statementClosingBalance) || 0,
        notes: startForm.notes,
      });

      if (response.success) {
        toast({
          title: t("bankReconciliation.started", "Reconciliation Started"),
          description: t("bankReconciliation.startedDesc", "New reconciliation session created successfully"),
        });
        setShowStartDialog(false);
        await fetchReconciliationData();
      }
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error?.message || t("bankReconciliation.startFailed", "Failed to start reconciliation"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Import statement
  const handleImport = async () => {
    if (!id || !importFile) return;
    setProcessing(true);
    try {
      const response = await bankAccountsApi.importStatementNew(id, {
        reconciliationId: reconciliation?.reconciliationId,
        file: importFile,
        ...importConfig,
      });

      if (response.success) {
        toast({
          title: t("bankReconciliation.imported", "Statement Imported"),
          description: t("bankReconciliation.importedDesc", "{{count}} lines imported", { count: response.data.count }),
        });
        setShowImportDialog(false);
        setImportFile(null);
        await fetchReconciliationData();
      }
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error?.message || t("bankReconciliation.importFailed", "Failed to import statement"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Match items
  const handleMatch = async (journalLineId: string, bankLineId: string) => {
    if (!id || !reconciliation) return;
    setProcessing(true);
    try {
      const journalLine = reconciliation.journalLines.find(j => j.lineId === journalLineId);
      const response = await bankAccountsApi.matchItemsNew(id, {
        reconciliationId: reconciliation.reconciliationId,
        journalEntryId: journalLine?.journalEntryId || "",
        journalLineId: journalLineId,
        statementLineId: bankLineId,
      });

      if (response.success) {
        toast({
          title: t("bankReconciliation.matched", "Items Matched"),
          description: response.data.isFullyReconciled
            ? t("bankReconciliation.fullyReconciled", "Statement line fully reconciled")
            : t("bankReconciliation.partiallyReconciled", "Match created, amounts differ by {{difference}}", {
                difference: response.data.difference.toFixed(2),
              }),
        });
        await fetchReconciliationData();
        setSelectedJournalLine(null);
        setSelectedBankLine(null);
      }
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error?.message || t("bankReconciliation.matchFailed", "Failed to match items"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Unmatch items
  const handleUnmatch = async (matchId?: string) => {
    if (!id) return;
    if (!matchId) {
      toast({
        title: t("common.error", "Error"),
        description: t("bankReconciliation.unmatchMissing", "This matched item is missing its match reference. Refresh and try again."),
        variant: "destructive",
      });
      return;
    }
    setProcessing(true);
    try {
      const response = await bankAccountsApi.unmatchItemsNew(id, { matchId });

      if (response.success) {
        toast({
          title: t("bankReconciliation.unmatched", "Match Removed"),
          description: t("bankReconciliation.unmatchedDesc", "Items are now unmatched"),
        });
        await fetchReconciliationData();
      }
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error?.message || t("bankReconciliation.unmatchFailed", "Failed to unmatch"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Ignore statement line
  const handleIgnore = async (statementLineId: string) => {
    if (!id) return;
    setProcessing(true);
    try {
      const response = await bankAccountsApi.ignoreStatementLineNew(id, { statementLineId });

      if (response.success) {
        toast({
          title: t("bankReconciliation.ignored", "Line Ignored"),
          description: t("bankReconciliation.ignoredDesc", "Statement line marked as ignored"),
        });
        await fetchReconciliationData();
      }
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error?.message || t("bankReconciliation.ignoreFailed", "Failed to ignore line"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Create adjusting entry
  const handleCreateAdjustingEntry = async () => {
    if (!id || !reconciliation || !selectedStatementLineForAdjust) return;
    setProcessing(true);
    try {
      const response = await bankAccountsApi.createAdjustingEntryNew(id, {
        reconciliationId: reconciliation.reconciliationId,
        statementLineId: selectedStatementLineForAdjust.id,
        expenseAccountCode: adjustForm.expenseAccountCode,
        description: adjustForm.description,
      });

      if (response.success) {
        toast({
          title: t("bankReconciliation.adjustingEntryCreated", "Adjusting Entry Created"),
          description: t("bankReconciliation.entryNumber", "Entry #{{number}} created", { number: response.data.entryNumber }),
        });
        setShowAdjustDialog(false);
        setSelectedStatementLineForAdjust(null);
        await fetchReconciliationData();
      }
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error?.message || t("bankReconciliation.adjustFailed", "Failed to create adjusting entry"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Complete reconciliation
  const handleComplete = async (force = false) => {
    if (!id || !reconciliation) return;
    setProcessing(true);
    try {
      const response = await bankAccountsApi.completeReconciliationNew(id, {
        reconciliationId: reconciliation.reconciliationId,
        notes: "",
        force,
      });

      if (response.success) {
        toast({
          title: t("bankReconciliation.completed", "Reconciliation Completed"),
          description: t("bankReconciliation.completedDesc", "Difference: {{difference}} | {{locked}} entries locked", {
            difference: response.data.finalDifference.toFixed(2),
            locked: response.data.lockedEntriesCount,
          }),
        });
        setShowCompleteDialog(false);
        await fetchReconciliationData();
      }
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error?.message || t("bankReconciliation.completeFailed", "Failed to complete reconciliation"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Cancel reconciliation
  const handleCancel = async () => {
    if (!id || !reconciliation) return;
    setProcessing(true);
    try {
      const response = await bankAccountsApi.cancelReconciliationNew(id, {
        reconciliationId: reconciliation.reconciliationId,
      });

      if (response.success) {
        toast({
          title: t("bankReconciliation.cancelled", "Reconciliation Cancelled"),
          description: t("bankReconciliation.cancelledDesc", "Session cancelled successfully"),
        });
        setShowCancelDialog(false);
        setReconciliation(null);
      }
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error?.message || t("bankReconciliation.cancelFailed", "Failed to cancel reconciliation"),
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: account?.currency || "RWF",
    }).format(amount);
  };

  const Frame = ({ children }: { children: ReactNode }) =>
    embedded ? <>{children}</> : <Layout>{children}</Layout>;

  const pageClassName = embedded
    ? "space-y-6"
    : "min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8";

  const contentClassName = embedded
    ? "space-y-6"
    : "mx-auto max-w-[1600px] space-y-6";

  // Filter lines based on tab
  const filteredJournalLines = reconciliation?.journalLines.filter(line => {
    if (activeTab === "unmatched") return !line.reconciled;
    if (activeTab === "matched") return line.reconciled;
    return true;
  }) || [];

  const filteredBankLines = reconciliation?.bankLines.filter(line => {
    if (activeTab === "unmatched") return !line.reconciled && line.status !== "ignored";
    if (activeTab === "matched") return line.reconciled;
    if (activeTab === "ignored") return line.status === "ignored";
    return true;
  }) || [];

  if (loading) {
    return (
      <Frame>
        <div className={pageClassName}>
          <div className={contentClassName}>
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Skeleton className="h-96 w-full rounded-xl" />
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  // No active reconciliation - show start screen
  if (!reconciliation || reconciliation.status !== "in_progress") {
    return (
      <Frame>
        <div className={pageClassName}>
          <div className={embedded ? "space-y-6" : "mx-auto max-w-[900px] space-y-6"}>
            {/* Hero Header */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  {!embedded && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate("/bank-accounts")}
                      className="h-10 w-10 dark:border-slate-700 dark:text-slate-200"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {t("bankReconciliation.title", "Bank Reconciliation")}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{account?.name || "Select an account to reconcile"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Card */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <CircleDot className="h-5 w-5 text-blue-500" />
                  {t("bankReconciliation.startNew", "Start New Reconciliation")}
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  {t("bankReconciliation.startDesc", "Begin a new reconciliation session to match your bank statement with your books")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Calendar className="inline h-3.5 w-3.5 mr-1" />
                      {t("bankReconciliation.statementStart", "Statement Start Date")}
                    </Label>
                    <Input
                      type="date"
                      value={startForm.statementDateStart}
                      onChange={(e) => setStartForm({ ...startForm, statementDateStart: e.target.value })}
                      className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Calendar className="inline h-3.5 w-3.5 mr-1" />
                      {t("bankReconciliation.statementEnd", "Statement End Date")}
                    </Label>
                    <Input
                      type="date"
                      value={startForm.statementDateEnd}
                      onChange={(e) => setStartForm({ ...startForm, statementDateEnd: e.target.value })}
                      className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    <PiggyBank className="inline h-3.5 w-3.5 mr-1" />
                    {t("bankReconciliation.closingBalance", "Statement Closing Balance")}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={startForm.statementClosingBalance}
                    onChange={(e) => setStartForm({ ...startForm, statementClosingBalance: e.target.value })}
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("bankReconciliation.notes", "Notes (Optional)")}
                  </Label>
                  <Input
                    value={startForm.notes}
                    onChange={(e) => setStartForm({ ...startForm, notes: e.target.value })}
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
                <Button
                  onClick={handleStartReconciliation}
                  disabled={
                    processing ||
                    !startForm.statementDateStart ||
                    !startForm.statementDateEnd ||
                    !startForm.statementClosingBalance
                  }
                  className="h-10 w-full gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {t("bankReconciliation.startButton", "Start Reconciliation")}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className={pageClassName}>
        <div className={contentClassName}>
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  {!embedded && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => navigate("/bank-accounts")}
                      className="h-10 w-10 dark:border-slate-700 dark:text-slate-200"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      {t("bankReconciliation.title", "Bank Reconciliation")}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {account?.name} · {reconciliation.period.start} to {reconciliation.period.end}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportDialog(true)}
                  className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200"
                >
                  <Upload className="h-4 w-4" />
                  {t("bankReconciliation.import", "Import Statement")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchReconciliationData()}
                  disabled={loading}
                  className="h-9 gap-2 dark:border-slate-700 dark:text-slate-200"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  {t("common.refresh", "Refresh")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelDialog(true)}
                  className="h-9 gap-2 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Ban className="h-4 w-4" />
                  {t("bankReconciliation.cancel", "Cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowCompleteDialog(true)}
                  disabled={Math.abs(reconciliation.summary.difference) > 0.01}
                  className="h-9 gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700"
                >
                  <Check className="h-4 w-4" />
                  {t("bankReconciliation.complete", "Complete")}
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("bankReconciliation.statementBalance", "Statement Balance")}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                      {formatCurrency(reconciliation.statementClosingBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                    <FileUp className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("bankReconciliation.bookBalance", "Book Balance")}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                      {formatCurrency(reconciliation.bookClosingBalance)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                    <PiggyBank className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("bankReconciliation.difference", "Difference")}
                    </p>
                    <p className={`mt-3 text-2xl font-bold ${Math.abs(reconciliation.summary.difference) > 0.01 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {formatCurrency(reconciliation.summary.difference)}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2.5 ring-1 ${Math.abs(reconciliation.summary.difference) > 0.01 ? "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60" : "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60"}`}>
                    {Math.abs(reconciliation.summary.difference) > 0.01 ? <AlertCircle className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("bankReconciliation.progress", "Progress")}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                      {reconciliation.bankSummary.reconciledCount} / {reconciliation.bankSummary.totalLines}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {Math.round((reconciliation.bankSummary.reconciledCount / reconciliation.bankSummary.totalLines) * 100) || 0}% {t("bankReconciliation.matched", "matched")}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                    <CircleDot className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reconciliation Components */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Journal Lines (Your Books) */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                  {t("bankReconciliation.yourBooks", "Your Books")}
                  <Badge variant="secondary" className="h-6">
                    {reconciliation.journalSummary.unreconciledCount} {t("bankReconciliation.unmatched", "unmatched")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="h-9 bg-slate-100 p-1 dark:bg-slate-900">
                    <TabsTrigger value="unmatched" className="h-7 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:text-slate-300 dark:data-[state=active]:text-white">
                      {t("bankReconciliation.unmatched", "Unmatched")}
                    </TabsTrigger>
                    <TabsTrigger value="matched" className="h-7 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:text-slate-300 dark:data-[state=active]:text-white">
                      {t("bankReconciliation.matched", "Matched")}
                    </TabsTrigger>
                    <TabsTrigger value="all" className="h-7 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-800 dark:text-slate-300 dark:data-[state=active]:text-white">
                      {t("bankReconciliation.all", "All")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="w-10 text-xs font-semibold text-slate-600 dark:text-slate-400"></TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Amount</TableHead>
                        <TableHead className="w-10 text-xs font-semibold text-slate-600 dark:text-slate-400"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJournalLines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-sm text-slate-500 dark:text-slate-400">
                            {t("bankReconciliation.noItems", "No items to display")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredJournalLines.map((line) => (
                          <TableRow
                            key={line.lineId}
                            className={cn(
                              "cursor-pointer dark:border-slate-800",
                              selectedJournalLine === line.lineId && "bg-blue-50 dark:bg-blue-950/20",
                              line.reconciled && "bg-emerald-50/40 dark:bg-emerald-950/10"
                            )}
                            onClick={() => setSelectedJournalLine(line.lineId)}
                          >
                            <TableCell>
                              {line.reconciled ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <CircleDot className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-700 dark:text-slate-300">{new Date(line.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{line.description}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{line.entryNumber}</div>
                            </TableCell>
                            <TableCell className={cn("text-right text-sm font-medium", line.isDebit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                              {line.isDebit ? "+" : "-"}{formatCurrency(line.amount)}
                            </TableCell>
                            <TableCell>
                              {line.isLocked && <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Bank Statement Lines */}
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <Upload className="h-4 w-4 text-blue-500" />
                  {t("bankReconciliation.bankStatement", "Bank Statement")}
                  <Badge variant="secondary" className="h-6">
                    {reconciliation.bankSummary.unreconciledCount} {t("bankReconciliation.unmatched", "unmatched")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.length > 0 && activeTab === "unmatched" && (
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                    <Search className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      {t("bankReconciliation.suggestionsAvailable", "Match Suggestions Available")}
                    </AlertTitle>
                    <AlertDescription className="text-xs text-amber-700 dark:text-amber-400">
                      {t("bankReconciliation.suggestionsDesc", "{{count}} suggested matches found based on amount and date", { count: suggestions.length })}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="w-10 text-xs font-semibold text-slate-600 dark:text-slate-400"></TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-600 dark:text-slate-400">Amount</TableHead>
                        <TableHead className="w-24 text-xs font-semibold text-slate-600 dark:text-slate-400"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBankLines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-sm text-slate-500 dark:text-slate-400">
                            {t("bankReconciliation.noItems", "No items to display")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBankLines.map((line) => (
                          <TableRow
                            key={line.id}
                            className={cn(
                              "cursor-pointer dark:border-slate-800",
                              selectedBankLine === line.id && "bg-blue-50 dark:bg-blue-950/20",
                              line.reconciled && "bg-emerald-50/40 dark:bg-emerald-950/10",
                              line.status === "ignored" && "bg-slate-50 dark:bg-slate-900/30"
                            )}
                            onClick={() => setSelectedBankLine(line.id)}
                          >
                            <TableCell>
                              {line.reconciled ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : line.status === "ignored" ? (
                                <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                              ) : (
                                <CircleDot className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-700 dark:text-slate-300">{new Date(line.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{line.description}</div>
                              {line.reference && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">{line.reference}</div>
                              )}
                            </TableCell>
                            <TableCell className={cn("text-right text-sm font-medium", !line.isDebit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                              {!line.isDebit ? "+" : "-"}{formatCurrency(line.amount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {!line.reconciled && line.status !== "ignored" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (selectedJournalLine) {
                                          handleMatch(selectedJournalLine, line.id);
                                        }
                                      }}
                                      disabled={!selectedJournalLine || processing}
                                    >
                                      <LinkIcon className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedStatementLineForAdjust(line);
                                        setShowAdjustDialog(true);
                                      }}
                                      disabled={processing}
                                    >
                                      <FileEdit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleIgnore(line.id);
                                      }}
                                      disabled={processing}
                                    >
                                      <EyeOff className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {line.reconciled && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 dark:text-slate-300 dark:hover:bg-slate-800"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnmatch(line.matchIds?.[0]);
                                    }}
                                    disabled={processing}
                                  >
                                    <Unlink className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reconciliation Summary */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                <Calculator className="h-4 w-4 text-blue-500" />
                {t("bankReconciliation.reconciliationSummary", "Reconciliation Summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("bankReconciliation.depositsInTransit", "Deposits in Transit")}</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(reconciliation.summary.depositsInTransit)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("bankReconciliation.outstandingChecks", "Outstanding Checks")}</p>
                  <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">-{formatCurrency(reconciliation.summary.outstandingChecks)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("bankReconciliation.bankCreditsNotInBooks", "Bank Credits Not in Books")}</p>
                  <p className="mt-1 text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(reconciliation.summary.bankCreditsNotInBooks)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("bankReconciliation.bankChargesNotInBooks", "Bank Charges Not in Books")}</p>
                  <p className="mt-1 text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(reconciliation.summary.bankChargesNotInBooks)}</p>
                </div>
              </div>
              <Separator className="dark:bg-slate-800" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("bankReconciliation.adjustedBankBalance", "Adjusted Bank Balance")}</p>
                  <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(reconciliation.summary.adjustedBankBalance)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("bankReconciliation.adjustedBookBalance", "Adjusted Book Balance")}</p>
                  <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">{formatCurrency(reconciliation.summary.adjustedBookBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-lg dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t("bankReconciliation.importStatement", "Import Bank Statement")}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t("bankReconciliation.importDesc", "Upload a CSV file with your bank statement data")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">{t("bankReconciliation.csvFile", "CSV File")}</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">{t("bankReconciliation.dateFormat", "Date Format")}</Label>
                  <Select
                    value={importConfig.dateFormat}
                    onValueChange={(v) => setImportConfig({ ...importConfig, dateFormat: v })}
                  >
                    <SelectTrigger className="dark:bg-slate-900 dark:text-white dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-300">{t("bankReconciliation.dateColumn", "Date Column")}</Label>
                  <Input
                    value={importConfig.dateColumn}
                    onChange={(e) => setImportConfig({ ...importConfig, dateColumn: e.target.value })}
                    className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportDialog(false)} className="dark:border-slate-700 dark:text-slate-200">
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleImport} disabled={!importFile || processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {t("bankReconciliation.import", "Import")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjust Dialog */}
        <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t("bankReconciliation.createAdjustingEntry", "Create Adjusting Entry")}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {selectedStatementLineForAdjust && (
                  <>
                    {selectedStatementLineForAdjust.description} - {formatCurrency(selectedStatementLineForAdjust.amount)}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-300">{t("bankReconciliation.expenseAccount", "Expense/Income Account Code")}</Label>
                <Input
                  value={adjustForm.expenseAccountCode}
                  onChange={(e) => setAdjustForm({ ...adjustForm, expenseAccountCode: e.target.value })}
                  placeholder="6200 for bank charges"
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("bankReconciliation.accountCodeHelp", "Use 6200 for bank charges, 4200 for other income, etc.")}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-300">{t("bankReconciliation.description", "Description")}</Label>
                <Input
                  value={adjustForm.description}
                  onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                  className="dark:bg-slate-900 dark:text-white dark:border-slate-700"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdjustDialog(false)} className="dark:border-slate-700 dark:text-slate-200">
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={handleCreateAdjustingEntry} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t("bankReconciliation.createEntry", "Create Entry")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Dialog */}
        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t("bankReconciliation.completeReconciliation", "Complete Reconciliation")}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {Math.abs(reconciliation.summary.difference) > 0.01 ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t("bankReconciliation.differenceExists", "Difference Exists")}</AlertTitle>
                    <AlertDescription>
                      {t("bankReconciliation.differenceDesc", "The difference is {{amount}}. You should resolve all unmatched items before completing.", {
                        amount: formatCurrency(reconciliation.summary.difference),
                      })}
                    </AlertDescription>
                  </Alert>
                ) : (
                  t("bankReconciliation.readyToComplete", "All items are matched. Ready to complete reconciliation.")
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)} className="dark:border-slate-700 dark:text-slate-200">
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={() => handleComplete(Math.abs(reconciliation.summary.difference) > 0.01)}
                disabled={processing}
                variant={Math.abs(reconciliation.summary.difference) > 0.01 ? "destructive" : "default"}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                {Math.abs(reconciliation.summary.difference) > 0.01
                  ? t("bankReconciliation.forceComplete", "Force Complete")
                  : t("bankReconciliation.complete", "Complete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t("bankReconciliation.cancelReconciliation", "Cancel Reconciliation")}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t("bankReconciliation.cancelDesc", "This will cancel the current reconciliation session. All matches will be removed.")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="dark:border-slate-700 dark:text-slate-200">
                {t("common.keep", "Keep Session")}
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
                {t("bankReconciliation.cancel", "Cancel Session")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Frame>
  );
}
