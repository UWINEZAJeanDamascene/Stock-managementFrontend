import { useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { interestApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Landmark, CalendarDays, TrendingUp, CheckCircle } from "lucide-react";

export default function FixedDepositsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["fixed-deposits"],
    queryFn: async () => {
      const res = await interestApi.getFixedDeposits();
      return res.data || [];
    },
  });

  const placeMutation = useMutation({
    mutationFn: (id: string) => interestApi.placeFixedDeposit(id),
    onSuccess: () => { toast.success("Placement posted"); queryClient.invalidateQueries({ queryKey: ["fixed-deposits"] }); },
    onError: (err: any) => toast.error(err.message || "Placement failed"),
  });

  const matureMutation = useMutation({
    mutationFn: (id: string) => interestApi.matureFixedDeposit(id),
    onSuccess: () => { toast.success("Maturity posted"); queryClient.invalidateQueries({ queryKey: ["fixed-deposits"] }); },
    onError: (err: any) => toast.error(err.message || "Maturity failed"),
  });

  const fds = (data || []).filter((f: any) =>
    f.depositReference?.toLowerCase().includes(search.toLowerCase()) ||
    f.bankName?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    active: "bg-blue-50 text-blue-700",
    matured: "bg-emerald-50 text-emerald-700",
    closed: "bg-slate-100 text-slate-700",
    rolled_over: "bg-amber-50 text-amber-700",
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Fixed Deposits</h1>
            <p className="text-sm text-slate-500">Manage term deposits and interest-bearing placements</p>
          </div>
          <Button onClick={() => navigate("/fixed-deposits/new")}><Plus className="mr-2 h-4 w-4" /> New Fixed Deposit</Button>
        </div>

        <Input placeholder="Search deposits..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">All Fixed Deposits</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : fds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Landmark className="h-10 w-10 mb-2" />
                <p>No fixed deposits found</p>
              </div>
            ) : (
              <div className="divide-y">
                {fds.map((f: any) => (
                  <div key={f._id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">{f.depositReference}</p>
                      <p className="text-xs text-slate-500">{f.bankName} • Principal: {Number(f.principalAmount).toLocaleString()} • Rate: {f.interestRate}%</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(f.startDate).toLocaleDateString()} → {new Date(f.maturityDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[f.status] || "bg-slate-100"}>{f.status}</Badge>
                      {f.status === "active" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => placeMutation.mutate(f._id)} disabled={placeMutation.isPending}>
                            <TrendingUp className="mr-1 h-3.5 w-3.5" /> Place
                          </Button>
                          <Button size="sm" onClick={() => matureMutation.mutate(f._id)} disabled={matureMutation.isPending}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" /> Mature
                          </Button>
                        </>
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
