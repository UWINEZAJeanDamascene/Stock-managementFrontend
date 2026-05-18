import { useState } from "react";
import { Layout } from "../../layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { interestApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Calculator, Send, CheckCircle, RotateCcw, TrendingUp } from "lucide-react";

export default function InterestIncomeReportPage() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["interest-summary"],
    queryFn: async () => {
      const res = await interestApi.getSummary();
      return res.data || [];
    },
  });

  const { data: accruals, isLoading: accrualsLoading } = useQuery({
    queryKey: ["interest-accruals", year, month],
    queryFn: async () => {
      const res = await interestApi.getAccruals({ year: String(year), month: String(month) });
      return res.data || [];
    },
  });

  const previewMutation = useMutation({
    mutationFn: ({ id, y, m }: { id: string; y: number; m: number }) => interestApi.preview(id, y, m),
    onSuccess: (res) => toast.success(`Calculated interest: ${Number(res.data.calculatedInterest).toFixed(2)}`),
    onError: (err: any) => toast.error(err.message || "Preview failed"),
  });

  const postMutation = useMutation({
    mutationFn: ({ id, y, m }: { id: string; y: number; m: number }) => interestApi.post(id, y, m),
    onSuccess: () => { toast.success("Interest posted"); queryClient.invalidateQueries({ queryKey: ["interest-accruals"] }); },
    onError: (err: any) => toast.error(err.message || "Post failed"),
  });

  const confirmMutation = useMutation({
    mutationFn: (accrualId: string) => interestApi.confirmReceipt(accrualId),
    onSuccess: () => { toast.success("Receipt confirmed"); queryClient.invalidateQueries({ queryKey: ["interest-accruals"] }); },
    onError: (err: any) => toast.error(err.message || "Confirm failed"),
  });

  const reverseMutation = useMutation({
    mutationFn: (accrualId: string) => interestApi.reverse(accrualId),
    onSuccess: () => { toast.success("Reversed"); queryClient.invalidateQueries({ queryKey: ["interest-accruals"] }); },
    onError: (err: any) => toast.error(err.message || "Reverse failed"),
  });

  const statusColors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    posted: "bg-blue-50 text-blue-700",
    confirmed: "bg-emerald-50 text-emerald-700",
    reversed: "bg-slate-100 text-slate-500",
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Interest Income</h1>
          <p className="text-sm text-slate-500">Calculate, accrue, and post interest income from bank accounts</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-3">
          <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-32" />
          <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-28" />
        </div>

        {/* Interest-bearing Accounts */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Interest-Bearing Accounts</CardTitle></CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : !summary?.length ? (
              <p className="text-slate-400 py-6 text-center">No interest-bearing accounts configured</p>
            ) : (
              <div className="divide-y">
                {summary.map((acc: any) => (
                  <div key={acc._id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{acc.name}</p>
                      <p className="text-xs text-slate-500">Balance: {Number(acc.balance).toLocaleString()} • Rate: {acc.rate}% • Method: {acc.method}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => previewMutation.mutate({ id: acc._id, y: year, m: month })} disabled={previewMutation.isPending}>
                        <Calculator className="mr-1 h-3.5 w-3.5" /> Preview
                      </Button>
                      <Button size="sm" onClick={() => postMutation.mutate({ id: acc._id, y: year, m: month })} disabled={postMutation.isPending}>
                        <Send className="mr-1 h-3.5 w-3.5" /> Post
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accruals / Posted Entries */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Interest Accruals ({month}/{year})</CardTitle></CardHeader>
          <CardContent>
            {accrualsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : !accruals?.length ? (
              <p className="text-slate-400 py-6 text-center">No accruals for this period</p>
            ) : (
              <div className="divide-y">
                {accruals.map((a: any) => (
                  <div key={a._id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{a.bankAccount?.name || "Fixed Deposit"}</p>
                      <p className="text-xs text-slate-500">Principal: {Number(a.principal).toLocaleString()} • Interest: {Number(a.calculatedInterest).toFixed(2)} • {a.method}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[a.status] || "bg-slate-100"}>{a.status}</Badge>
                      {a.status === "pending" && (
                        <Button variant="outline" size="sm" onClick={() => confirmMutation.mutate(a._id)} disabled={confirmMutation.isPending}>
                          <CheckCircle className="mr-1 h-3.5 w-3.5" /> Confirm
                        </Button>
                      )}
                      {a.status !== "reversed" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => reverseMutation.mutate(a._id)} disabled={reverseMutation.isPending}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
