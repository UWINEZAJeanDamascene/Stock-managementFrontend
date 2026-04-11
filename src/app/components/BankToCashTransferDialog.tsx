import { useState } from "react";
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
import { ArrowRightLeft, Wallet, Landmark, Loader2 } from "lucide-react";
import { bankAccountsApi, BankAccount } from "@/lib/api";
import { toast } from "sonner";

interface BankToCashTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccounts: BankAccount[];
  onSuccess?: () => void;
  fromAccountId?: string; // Optional pre-selected source account
}

export function BankToCashTransferDialog({
  open,
  onOpenChange,
  bankAccounts,
  onSuccess,
  fromAccountId,
}: BankToCashTransferDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fromAccount: fromAccountId || "",
    toAccount: "",
    amount: "",
    description: "",
    referenceNumber: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fromAccount || !form.toAccount || !form.amount) {
      toast.error(t("bankAccount.validationError", "Please select both accounts and enter an amount"));
      return;
    }

    if (form.fromAccount === form.toAccount) {
      toast.error(t("bankAccount.sameAccountError", "Source and destination accounts cannot be the same"));
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("bankAccount.invalidAmount", "Please enter a valid amount greater than 0"));
      return;
    }

    setLoading(true);
    try {
      const response = await bankAccountsApi.transferToCash({
        fromAccount: form.fromAccount,
        toAccount: form.toAccount,
        amount,
        description: form.description || t("bankAccount.transferDefault", "Bank transfer"),
        referenceNumber: form.referenceNumber || undefined,
        notes: form.notes || undefined,
      });

      if (response.success) {
        toast.success(
          t("bankAccount.transferSuccess", "Successfully transferred {{amount}}", {
            amount: amount.toLocaleString(),
          })
        );
        setForm({
          fromAccount: fromAccountId || "",
          toAccount: "",
          amount: "",
          description: "",
          referenceNumber: "",
          notes: "",
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(t("bankAccount.transferError", "Transfer failed"));
      }
    } catch (error: any) {
      const message = error?.message || t("common.error", "An error occurred");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const selectedFromAccount = bankAccounts.find((acc) => acc._id === form.fromAccount);
  const selectedToAccount = bankAccounts.find((acc) => acc._id === form.toAccount);

  // Filter out the source account from destination options
  const availableDestinationAccounts = bankAccounts.filter(
    (acc) => acc._id !== form.fromAccount && acc.isActive !== false
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
            {t("bankAccount.transferTitle", "Transfer Between Accounts")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From Bank Account */}
          <div className="space-y-2">
            <Label htmlFor="from-account" className="dark:text-slate-200">
              {t("bankAccount.fromAccount", "From Account")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={form.fromAccount}
              onValueChange={(value) => setForm({ ...form, fromAccount: value, toAccount: "" })}
              disabled={!!fromAccountId}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                <SelectValue placeholder={t("bankAccount.selectSource", "Select source account")} />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                {bankAccounts.filter((acc) => acc.isActive !== false).map((account) => (
                  <SelectItem
                    key={account._id}
                    value={account._id}
                    className="dark:text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-blue-500" />
                      <span>{account.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {account.accountType}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFromAccount && (
              <p className="text-xs text-muted-foreground dark:text-slate-400">
                {t("bankAccount.availableBalance", "Available")}: <span className="font-medium">{(selectedFromAccount.cachedBalance || selectedFromAccount.openingBalance || 0).toLocaleString()}</span>
              </p>
            )}
          </div>

          {/* To Bank Account */}
          <div className="space-y-2">
            <Label htmlFor="to-account" className="dark:text-slate-200">
              {t("bankAccount.toAccount", "To Account")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Select
              value={form.toAccount}
              onValueChange={(value) => setForm({ ...form, toAccount: value })}
              disabled={!form.fromAccount || availableDestinationAccounts.length === 0}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600 dark:text-white">
                <SelectValue placeholder={form.fromAccount ? t("bankAccount.selectDestination", "Select destination") : t("bankAccount.selectSourceFirst", "Select source first")} />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                {availableDestinationAccounts.map((account) => (
                  <SelectItem
                    key={account._id}
                    value={account._id}
                    className="dark:text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-green-500" />
                      <span>{account.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {account.accountType}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedToAccount && (
              <p className="text-xs text-muted-foreground dark:text-slate-400">
                {t("bankAccount.currentBalance", "Current Balance")}: <span className="font-medium">{(selectedToAccount.cachedBalance || selectedToAccount.openingBalance || 0).toLocaleString()}</span>
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="dark:text-slate-200">
              {t("bankAccount.amount", "Amount")}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder={t("bankAccount.enterAmount", "Enter amount")}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="dark:bg-slate-800 dark:text-white dark:border-slate-600"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="dark:text-slate-200">
              {t("bankAccount.description", "Description")}
            </Label>
            <Input
              id="description"
              placeholder={t("bankAccount.transferToCashDescription", "e.g., Cash withdrawal for operations")}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="dark:bg-slate-800 dark:text-white dark:border-slate-600"
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference" className="dark:text-slate-200">
              {t("bankAccount.referenceNumber", "Reference Number")}
            </Label>
            <Input
              id="reference"
              placeholder={t("bankAccount.enterReference", "e.g., WD-001")}
              value={form.referenceNumber}
              onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
              className="dark:bg-slate-800 dark:text-white dark:border-slate-600"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="dark:text-slate-200">
              {t("bankAccount.notes", "Notes")}
            </Label>
            <Input
              id="notes"
              placeholder={t("bankAccount.enterNotes", "Additional notes...")}
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
              disabled={loading || !form.fromAccount || !form.toAccount || !form.amount}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.processing", "Processing...")}
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  {t("bankAccount.transfer", "Transfer")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
