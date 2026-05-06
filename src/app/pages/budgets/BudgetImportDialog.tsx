import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { budgetsApi } from "@/lib/api";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FileCheck,
  Table,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react";

interface BudgetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ImportStep = "upload" | "preview" | "validate" | "import" | "complete";

interface ParsedData {
  budgets: any[];
  lines: any[];
  errors: any[];
  warnings: any[];
}

interface ValidationData {
  isValid: boolean;
  budgets: any[];
  lines: any[];
  errors: any[];
  warnings: any[];
  suggestions: {
    accounts: Array<{ id: string; code: string; name: string }>;
    departments: Array<{ id: string; name: string }>;
  };
}

interface ImportResult {
  budgetsCreated: number;
  budgetsUpdated: number;
  linesCreated: number;
  linesUpdated: number;
  errors: any[];
  budgets: any[];
}

export function BudgetImportDialog({ open, onOpenChange, onSuccess }: BudgetImportDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({
    updateExisting: false,
    skipErrors: false,
  });
  const [expandedBudgets, setExpandedBudgets] = useState<Set<number>>(new Set());
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());

  const resetState = () => {
    setStep("upload");
    setFile(null);
    setParsedData(null);
    setValidationData(null);
    setImportResult(null);
    setOptions({ updateExisting: false, skipErrors: false });
    setExpandedBudgets(new Set());
    setExpandedLines(new Set());
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleDownloadTemplate = async (format: "excel" | "csv") => {
    try {
      const response = await budgetsApi.downloadImportTemplate(format);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budget_import_template.${format === "excel" ? "xlsx" : "csv"}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(t("budgets.import.templateDownloaded", "Template downloaded"));
    } catch (error) {
      toast.error(t("budgets.import.templateDownloadFailed", "Failed to download template"));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
        "application/csv",
      ];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".csv") && !selectedFile.name.endsWith(".xls")) {
        toast.error(t("budgets.import.invalidFile", "Please select an Excel or CSV file"));
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await budgetsApi.parseImport(file);
      if (result.success) {
        setParsedData(result.data);
        setStep("preview");
        toast.success(t("budgets.import.fileParsed", "File parsed successfully"));
      } else {
        toast.error(result.error || t("budgets.import.parseFailed", "Failed to parse file"));
      }
    } catch (error: any) {
      toast.error(error.message || t("budgets.import.parseFailed", "Failed to parse file"));
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!parsedData) return;
    setLoading(true);
    try {
      const result = await budgetsApi.validateImport(parsedData);
      if (result.success) {
        setValidationData(result.data);
        setStep("validate");
        if (result.data.isValid) {
          toast.success(t("budgets.import.validationPassed", "Validation passed"));
        } else {
          toast.warning(t("budgets.import.validationIssues", "Validation found issues"));
        }
      } else {
        toast.error(result.error || t("budgets.import.validationFailed", "Validation failed"));
      }
    } catch (error: any) {
      toast.error(error.message || t("budgets.import.validationFailed", "Validation failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!validationData) return;
    setLoading(true);
    try {
      const result = await budgetsApi.executeImport(validationData, options);
      if (result.success) {
        setImportResult(result.data);
        setStep("complete");
        toast.success(t("budgets.import.success", "Import completed successfully"));
        onSuccess?.();
      } else {
        toast.error(result.error || t("budgets.import.failed", "Import failed"));
      }
    } catch (error: any) {
      toast.error(error.message || t("budgets.import.failed", "Import failed"));
    } finally {
      setLoading(false);
    }
  };

  const toggleBudgetExpand = (index: number) => {
    const newSet = new Set(expandedBudgets);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedBudgets(newSet);
  };

  const toggleLineExpand = (index: number) => {
    const newSet = new Set(expandedLines);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedLines(newSet);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleDownloadTemplate("excel")}>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <FileSpreadsheet className="h-10 w-10 text-green-600 mb-3" />
            <h4 className="font-semibold">{t("budgets.import.excelTemplate", "Excel Template")}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {t("budgets.import.excelDesc", "Download Excel template with instructions")}
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              <Download className="h-4 w-4 mr-2" />
              {t("common.download", "Download")}
            </Button>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleDownloadTemplate("csv")}>
          <CardContent className="p-6 flex flex-col items-center text-center">
            <Table className="h-10 w-10 text-blue-600 mb-3" />
            <h4 className="font-semibold">{t("budgets.import.csvTemplate", "CSV Template")}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {t("budgets.import.csvDesc", "Download simple CSV template")}
            </p>
            <Button variant="outline" size="sm" className="mt-3">
              <Download className="h-4 w-4 mr-2" />
              {t("common.download", "Download")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-base font-semibold">{t("budgets.import.uploadFile", "Upload Budget File")}</Label>
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="budget-file-upload"
          />
          <label htmlFor="budget-file-upload" className="cursor-pointer flex flex-col items-center">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">
              {file ? file.name : t("budgets.import.dragDrop", "Click to select or drag and drop file")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("budgets.import.supportedFormats", "Supports Excel (.xlsx, .xls) and CSV files")}
            </p>
          </label>
        </div>
      </div>

      {file && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <FileCheck className="h-5 w-5 text-green-600" />
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          {t("common.cancel", "Cancel")}
        </Button>
        <Button onClick={handleParse} disabled={!file || loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ChevronRight className="h-4 w-4 mr-2" />}
          {t("budgets.import.parseFile", "Parse File")}
        </Button>
      </DialogFooter>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">
          {t("budgets.import.previewData", "Preview Data")}
        </h4>
        <Badge variant="outline">
          {parsedData?.budgets.length || 0} {t("budgets.budgets", "budgets")}, {parsedData?.lines.length || 0} {t("budgets.lines", "lines")}
        </Badge>
      </div>

      {parsedData?.budgets && parsedData.budgets.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground">{t("budgets.budgets", "Budgets")}</h5>
          {parsedData.budgets.map((budget, idx) => (
            <Card key={idx} className="overflow-hidden">
              <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                onClick={() => toggleBudgetExpand(idx)}
              >
                <div className="flex items-center gap-2">
                  {expandedBudgets.has(idx) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-medium">{budget.name || t("budgets.import.unnamed", "Unnamed")}</span>
                </div>
                <Badge variant="outline">{budget.fiscal_year}</Badge>
              </div>
              {expandedBudgets.has(idx) && (
                <div className="px-4 pb-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">{t("budgets.type", "Type")}:</span> {budget.type}</div>
                    <div><span className="text-muted-foreground">{t("budgets.amount", "Amount")}:</span> {budget.amount}</div>
                    {budget.department && <div><span className="text-muted-foreground">{t("budgets.department", "Department")}:</span> {budget.department}</div>}
                    {budget.description && <div className="col-span-2"><span className="text-muted-foreground">{t("budgets.description", "Description")}:</span> {budget.description}</div>}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {parsedData?.lines && parsedData.lines.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground">{t("budgets.lines", "Budget Lines")}</h5>
          {parsedData.lines.map((line, idx) => (
            <Card key={idx} className="overflow-hidden">
              <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                onClick={() => toggleLineExpand(idx)}
              >
                <div className="flex items-center gap-2">
                  {expandedLines.has(idx) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-medium">{line.account_code || line.account_name || t("budgets.import.noAccount", "No Account")}</span>
                </div>
                <Badge variant="outline">{line.period_month}/{line.period_year}</Badge>
              </div>
              {expandedLines.has(idx) && (
                <div className="px-4 pb-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">{t("budgets.budgetedAmount", "Amount")}:</span> {line.budgeted_amount}</div>
                    {line.category && <div><span className="text-muted-foreground">{t("budgets.category", "Category")}:</span> {line.category}</div>}
                    {line.notes && <div className="col-span-2"><span className="text-muted-foreground">{t("budgets.notes", "Notes")}:</span> {line.notes}</div>}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => setStep("upload")}>
          {t("common.back", "Back")}
        </Button>
        <Button onClick={handleValidate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          {t("budgets.import.validate", "Validate")}
        </Button>
      </DialogFooter>
    </div>
  );

  const renderValidateStep = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{t("budgets.import.validationResults", "Validation Results")}</h4>
        <Badge variant={validationData?.isValid ? "default" : "destructive"}>
          {validationData?.isValid ? t("budgets.import.valid", "Valid") : t("budgets.import.hasErrors", "Has Issues")}
        </Badge>
      </div>

      {validationData?.errors && validationData.errors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              {t("budgets.import.errors", "Errors")} ({validationData.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 space-y-2">
            {validationData.errors.slice(0, 5).map((error, idx) => (
              <div key={idx} className="text-sm p-2 bg-red-50 rounded">
                <span className="font-medium">Row {error.row}:</span> {error.message}
              </div>
            ))}
            {validationData.errors.length > 5 && (
              <p className="text-sm text-muted-foreground">
                +{validationData.errors.length - 5} {t("budgets.import.moreErrors", "more errors")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {validationData?.warnings && validationData.warnings.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              {t("budgets.import.warnings", "Warnings")} ({validationData.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 space-y-2">
            {validationData.warnings.slice(0, 3).map((warning, idx) => (
              <div key={idx} className="text-sm p-2 bg-yellow-50 rounded">
                <span className="font-medium">Row {warning.row}:</span> {warning.message}
              </div>
            ))}
            {validationData.warnings.length > 3 && (
              <p className="text-sm text-muted-foreground">
                +{validationData.warnings.length - 3} {t("budgets.import.moreWarnings", "more warnings")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">{t("budgets.import.importOptions", "Import Options")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="updateExisting"
              checked={options.updateExisting}
              onCheckedChange={(checked) => setOptions({ ...options, updateExisting: checked as boolean })}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="updateExisting" className="text-sm font-medium">
                {t("budgets.import.updateExisting", "Update existing budgets")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("budgets.import.updateExistingDesc", "If a budget with the same name and year exists, update it instead of skipping")}
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="skipErrors"
              checked={options.skipErrors}
              onCheckedChange={(checked) => setOptions({ ...options, skipErrors: checked as boolean })}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="skipErrors" className="text-sm font-medium">
                {t("budgets.import.skipErrors", "Skip errors and continue")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("budgets.import.skipErrorsDesc", "Import valid records even if some have errors")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DialogFooter>
        <Button variant="outline" onClick={() => setStep("preview")}>
          {t("common.back", "Back")}
        </Button>
        <Button
          onClick={handleImport}
          disabled={loading || (!validationData?.isValid && !options.skipErrors)}
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {t("budgets.import.import", "Import")}
        </Button>
      </DialogFooter>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h4 className="text-lg font-semibold">{t("budgets.import.complete", "Import Complete")}</h4>
        <p className="text-muted-foreground">
          {t("budgets.import.completeDesc", "Your budgets have been imported successfully")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{importResult?.budgetsCreated || 0}</div>
            <div className="text-sm text-muted-foreground">{t("budgets.import.budgetsCreated", "Budgets Created")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{importResult?.budgetsUpdated || 0}</div>
            <div className="text-sm text-muted-foreground">{t("budgets.import.budgetsUpdated", "Budgets Updated")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{importResult?.linesCreated || 0}</div>
            <div className="text-sm text-muted-foreground">{t("budgets.import.linesCreated", "Lines Created")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{importResult?.linesUpdated || 0}</div>
            <div className="text-sm text-muted-foreground">{t("budgets.import.linesUpdated", "Lines Updated")}</div>
          </CardContent>
        </Card>
      </div>

      {importResult?.errors && importResult.errors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm text-red-600">
              {t("budgets.import.importErrors", "Import Errors")} ({importResult.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <div className="max-h-32 overflow-y-auto space-y-1">
              {importResult.errors.map((error, idx) => (
                <div key={idx} className="text-sm text-red-600">{error.message}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => { resetState(); setStep("upload"); }}>
          {t("budgets.import.importMore", "Import More")}
        </Button>
        <Button onClick={handleClose}>
          {t("common.done", "Done")}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("budgets.import.title", "Import Budgets")}</DialogTitle>
          <DialogDescription>
            {step === "upload" && t("budgets.import.uploadDesc", "Upload an Excel or CSV file to import budgets")}
            {step === "preview" && t("budgets.import.previewDesc", "Review the data before validation")}
            {step === "validate" && t("budgets.import.validateDesc", "Review validation results and import options")}
            {step === "complete" && t("budgets.import.completeDesc", "Import completed successfully")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          {["upload", "preview", "validate", "import", "complete"].map((s, i) => {
            const steps: ImportStep[] = ["upload", "preview", "validate", "import", "complete"];
            const currentIdx = steps.indexOf(step);
            const isActive = s === step;
            const isCompleted = currentIdx > i;
            return (
              <div key={s} className="flex items-center">
                <Badge
                  variant={isActive ? "default" : isCompleted ? "secondary" : "outline"}
                  className={isCompleted ? "bg-green-100 text-green-800" : ""}
                >
                  {isCompleted ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
                  {i + 1}
                </Badge>
                {i < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
              </div>
            );
          })}
        </div>

        {step === "upload" && renderUploadStep()}
        {step === "preview" && renderPreviewStep()}
        {step === "validate" && renderValidateStep()}
        {step === "complete" && renderCompleteStep()}
      </DialogContent>
    </Dialog>
  );
}
