import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
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

export default function BankReconciliationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  // State
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<{ _id: string; name: string; ledgerAccountId?: string } | null>(null);
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
  }, [id, toast, t]);

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
  const handleUnmatch = async (matchId: string) => {
    if (!id) return;
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
      currency: "USD",
    }).format(amount);
  };

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
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  // No active reconciliation - show start screen
  if (!reconciliation || reconciliation.status !== "in_progress") {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/bank-accounts")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t("bankReconciliation.title", "Bank Reconciliation")}</h1>
              <p className="text-muted-foreground">{account?.name}</p>
            </div>
          </div>

          {/* Start Card */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                {t("bankReconciliation.startNew", "Start New Reconciliation")}
              </CardTitle>
              <CardDescription>
                {t("bankReconciliation.startDesc", "Begin a new reconciliation session to match your bank statement with your books")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("bankReconciliation.statementStart", "Statement Start Date")}</Label>
                  <Input
                    type="date"
                    value={startForm.statementDateStart}
                    onChange={(e) => setStartForm({ ...startForm, statementDateStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("bankReconciliation.statementEnd", "Statement End Date")}</Label>
                  <Input
                    type="date"
                    value={startForm.statementDateEnd}
                    onChange={(e) => setStartForm({ ...startForm, statementDateEnd: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("bankReconciliation.closingBalance", "Statement Closing Balance")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={startForm.statementClosingBalance}
                  onChange={(e) => setStartForm({ ...startForm, statementClosingBalance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("bankReconciliation.notes", "Notes (Optional)")}</Label>
                <Input
                  value={startForm.notes}
                  onChange={(e) => setStartForm({ ...startForm, notes: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleStartReconciliation}
                disabled={
                  processing ||
                  !startForm.statementDateStart ||
                  !startForm.statementDateEnd ||
                  !startForm.statementClosingBalance
                }
                className="w-full"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                {t("bankReconciliation.startButton", "Start Reconciliation")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/bank-accounts")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t("bankReconciliation.title", "Bank Reconciliation")}</h1>
              <p className="text-muted-foreground">{account?.name} | {reconciliation.period.start} to {reconciliation.period.end}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {t("bankReconciliation.import", "Import Statement")}
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchReconciliationData()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              {t("common.refresh", "Refresh")}
            </Button>
            <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
              <Ban className="h-4 w-4 mr-2" />
              {t("bankReconciliation.cancel", "Cancel")}
            </Button>
            <Button
              onClick={() => setShowCompleteDialog(true)}
              disabled={Math.abs(reconciliation.summary.difference) > 0.01}
            >
              <Check className="h-4 w-4 mr-2" />
              {t("bankReconciliation.complete", "Complete")}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("bankReconciliation.statementBalance", "Statement Balance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reconciliation.statementClosingBalance)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("bankReconciliation.bookBalance", "Book Balance")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reconciliation.bookClosingBalance)}</div>
            </CardContent>
          </Card>
          <Card className={cn(Math.abs(reconciliation.summary.difference) > 0.01 ? "border-red-500" : "border-green-500")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("bankReconciliation.difference", "Difference")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", Math.abs(reconciliation.summary.difference) > 0.01 ? "text-red-600" : "text-green-600")}>
                {formatCurrency(reconciliation.summary.difference)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t("bankReconciliation.progress", "Progress")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reconciliation.bankSummary.reconciledCount} / {reconciliation.bankSummary.totalLines}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round((reconciliation.bankSummary.reconciledCount / reconciliation.bankSummary.totalLines) * 100) || 0}% {t("bankReconciliation.matched", "matched")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reconciliation Components */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Journal Lines (Your Books) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                {t("bankReconciliation.yourBooks", "Your Books")}
                <Badge variant="secondary">
                  {reconciliation.journalSummary.unreconciledCount} {t("bankReconciliation.unmatched", "unmatched")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                <TabsList>
                  <TabsTrigger value="unmatched">{t("bankReconciliation.unmatched", "Unmatched")}</TabsTrigger>
                  <TabsTrigger value="matched">{t("bankReconciliation.matched", "Matched")}</TabsTrigger>
                  <TabsTrigger value="all">{t("bankReconciliation.all", "All")}</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>{t("bankReconciliation.date", "Date")}</TableHead>
                      <TableHead>{t("bankReconciliation.description", "Description")}</TableHead>
                      <TableHead className="text-right">{t("bankReconciliation.amount", "Amount")}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJournalLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {t("bankReconciliation.noItems", "No items to display")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredJournalLines.map((line) => (
                        <TableRow
                          key={line.lineId}
                          className={cn(
                            selectedJournalLine === line.lineId && "bg-blue-50",
                            line.reconciled && "bg-green-50"
                          )}
                          onClick={() => setSelectedJournalLine(line.lineId)}
                        >
                          <TableCell>
                            {line.reconciled ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                            )}
                          </TableCell>
                          <TableCell>{new Date(line.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="font-medium">{line.description}</div>
                            <div className="text-xs text-muted-foreground">{line.entryNumber}</div>
                          </TableCell>
                          <TableCell className={cn("text-right font-medium", line.isDebit ? "text-green-600" : "text-red-600")}>
                            {line.isDebit ? "+" : "-"}{formatCurrency(line.amount)}
                          </TableCell>
                          <TableCell>
                            {line.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {t("bankReconciliation.bankStatement", "Bank Statement")}
                <Badge variant="secondary">
                  {reconciliation.bankSummary.unreconciledCount} {t("bankReconciliation.unmatched", "unmatched")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                {suggestions.length > 0 && activeTab === "unmatched" && (
                  <Alert className="mb-4">
                    <Search className="h-4 w-4" />
                    <AlertTitle>{t("bankReconciliation.suggestionsAvailable", "Match Suggestions Available")}</AlertTitle>
                    <AlertDescription>
                      {t("bankReconciliation.suggestionsDesc", "{{count}} suggested matches found based on amount and date", { count: suggestions.length })}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>{t("bankReconciliation.date", "Date")}</TableHead>
                      <TableHead>{t("bankReconciliation.description", "Description")}</TableHead>
                      <TableHead className="text-right">{t("bankReconciliation.amount", "Amount")}</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBankLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {t("bankReconciliation.noItems", "No items to display")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBankLines.map((line) => (
                        <TableRow
                          key={line.id}
                          className={cn(
                            selectedBankLine === line.id && "bg-blue-50",
                            line.reconciled && "bg-green-50",
                            line.status === "ignored" && "bg-gray-50"
                          )}
                          onClick={() => setSelectedBankLine(line.id)}
                        >
                          <TableCell>
                            {line.reconciled ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : line.status === "ignored" ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                            )}
                          </TableCell>
                          <TableCell>{new Date(line.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="font-medium">{line.description}</div>
                            {line.reference && (
                              <div className="text-xs text-muted-foreground">{line.reference}</div>
                            )}
                          </TableCell>
                          <TableCell className={cn("text-right font-medium", !line.isDebit ? "text-green-600" : "text-red-600")}>
                            {!line.isDebit ? "+" : "-"}{formatCurrency(line.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!line.reconciled && line.status !== "ignored" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (selectedJournalLine) {
                                        handleMatch(selectedJournalLine, line.id);
                                      }
                                    }}
                                    disabled={!selectedJournalLine || processing}
                                  >
                                    <LinkIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStatementLineForAdjust(line);
                                      setShowAdjustDialog(true);
                                    }}
                                    disabled={processing}
                                  >
                                    <FileEdit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleIgnore(line.id);
                                    }}
                                    disabled={processing}
                                  >
                                    <EyeOff className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {line.reconciled && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Find match ID and unmatch
                                    const suggestion = suggestions.find(s => s.statementLineId === line.id);
                                    if (suggestion) {
                                      handleUnmatch(suggestion.journalLineId);
                                    }
                                  }}
                                  disabled={processing}
                                >
                                  <Unlink className="h-4 w-4" />
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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t("bankReconciliation.reconciliationSummary", "Reconciliation Summary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{t("bankReconciliation.depositsInTransit", "Deposits in Transit")}</div>
                <div className="text-lg font-medium text-green-600">+{formatCurrency(reconciliation.summary.depositsInTransit)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("bankReconciliation.outstandingChecks", "Outstanding Checks")}</div>
                <div className="text-lg font-medium text-red-600">-{formatCurrency(reconciliation.summary.outstandingChecks)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("bankReconciliation.bankCreditsNotInBooks", "Bank Credits Not in Books")}</div>
                <div className="text-lg font-medium">{formatCurrency(reconciliation.summary.bankCreditsNotInBooks)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("bankReconciliation.bankChargesNotInBooks", "Bank Charges Not in Books")}</div>
                <div className="text-lg font-medium">{formatCurrency(reconciliation.summary.bankChargesNotInBooks)}</div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">{t("bankReconciliation.adjustedBankBalance", "Adjusted Bank Balance")}</div>
                <div className="text-xl font-bold">{formatCurrency(reconciliation.summary.adjustedBankBalance)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("bankReconciliation.adjustedBookBalance", "Adjusted Book Balance")}</div>
                <div className="text-xl font-bold">{formatCurrency(reconciliation.summary.adjustedBookBalance)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("bankReconciliation.importStatement", "Import Bank Statement")}</DialogTitle>
              <DialogDescription>
                {t("bankReconciliation.importDesc", "Upload a CSV file with your bank statement data")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("bankReconciliation.csvFile", "CSV File")}</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("bankReconciliation.dateFormat", "Date Format")}</Label>
                  <Select
                    value={importConfig.dateFormat}
                    onValueChange={(v) => setImportConfig({ ...importConfig, dateFormat: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("bankReconciliation.dateColumn", "Date Column")}</Label>
                  <Input
                    value={importConfig.dateColumn}
                    onChange={(e) => setImportConfig({ ...importConfig, dateColumn: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("bankReconciliation.createAdjustingEntry", "Create Adjusting Entry")}</DialogTitle>
              <DialogDescription>
                {selectedStatementLineForAdjust && (
                  <>
                    {selectedStatementLineForAdjust.description} - {formatCurrency(selectedStatementLineForAdjust.amount)}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("bankReconciliation.expenseAccount", "Expense/Income Account Code")}</Label>
                <Input
                  value={adjustForm.expenseAccountCode}
                  onChange={(e) => setAdjustForm({ ...adjustForm, expenseAccountCode: e.target.value })}
                  placeholder="6200 for bank charges"
                />
                <p className="text-xs text-muted-foreground">
                  {t("bankReconciliation.accountCodeHelp", "Use 6200 for bank charges, 4200 for other income, etc.")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t("bankReconciliation.description", "Description")}</Label>
                <Input
                  value={adjustForm.description}
                  onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("bankReconciliation.completeReconciliation", "Complete Reconciliation")}</DialogTitle>
              <DialogDescription>
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
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("bankReconciliation.cancelReconciliation", "Cancel Reconciliation")}</DialogTitle>
              <DialogDescription>
                {t("bankReconciliation.cancelDesc", "This will cancel the current reconciliation session. All matches will be removed.")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                {t("common.keep", "Keep Session")}
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
                {t("bankReconciliation.cancel", "Cancel Session")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
