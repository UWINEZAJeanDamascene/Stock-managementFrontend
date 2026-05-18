import { useState } from "react";
import { Layout } from "../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Input } from "@/app/components/ui/input";
import { reportsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users, Building2, DollarSign } from "lucide-react";

const VIEW_OPTIONS = [
  { value: "employee", label: "By Employee" },
  { value: "department", label: "By Department" },
  { value: "account", label: "By Account" },
  { value: "trend", label: "Trend Over Time" },
];

export default function LaborCostAnalysisPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("");
  const [viewBy, setViewBy] = useState("employee");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["labor-cost-analysis", year, month, viewBy],
    queryFn: async () => {
      const res = await reportsApi.getLaborCostAnalysis({
        year: year || undefined,
        month: month || undefined,
        viewBy,
      });
      return res.data as any;
    },
  });

  const renderContent = () => {
    if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
    if (!data || (Array.isArray(data) && data.length === 0)) return <p className="text-center text-slate-400 py-10">No data found</p>;

    if (viewBy === "trend") {
      return (
        <div className="space-y-2">
          {data.map((row: any, i: number) => (
            <div key={i} className="flex items-center justify-between border-b py-2">
              <span className="font-medium">{row.period}</span>
              <div className="flex gap-6 text-sm">
                <span className="text-emerald-600">Direct: RWF {(row.direct || 0).toLocaleString()}</span>
                <span className="text-blue-600">Indirect: RWF {(row.indirect || 0).toLocaleString()}</span>
                <span className="text-slate-500">Gross: RWF {(row.total_gross || 0).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (viewBy === "account") {
      return (
        <div className="space-y-2">
          {data.accounts?.map((row: any) => (
            <div key={row.accountCode} className="flex items-center justify-between border-b py-2">
              <span className="font-medium">{row.accountCode} — {row.accountName}</span>
              <span className="font-semibold">RWF {(row.amount || 0).toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 font-bold text-slate-900 dark:text-white">
            <span>Total</span>
            <span>RWF {(data.total || 0).toLocaleString()}</span>
          </div>
        </div>
      );
    }

    if (viewBy === "department") {
      return (
        <div className="space-y-2">
          {data.map((row: any, i: number) => (
            <div key={i} className="flex items-center justify-between border-b py-2">
              <span className="font-medium">{row.department}</span>
              <div className="flex gap-6 text-sm">
                <span className="text-emerald-600">Direct: RWF {(row.direct || 0).toLocaleString()}</span>
                <span className="text-blue-600">Indirect: RWF {(row.indirect || 0).toLocaleString()}</span>
                <span className="text-slate-500">{row.count} employees</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // employee view
    return (
      <div className="space-y-2">
        {data.map((row: any, i: number) => (
          <div key={i} className="flex items-center justify-between border-b py-2">
            <div>
              <span className="font-medium">{row.employee_name}</span>
              <span className="ml-2 text-xs text-slate-400 capitalize">({row.labor_type || "—"})</span>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-emerald-600">Direct: RWF {(row.direct || 0).toLocaleString()}</span>
              <span className="text-blue-600">Indirect: RWF {(row.indirect || 0).toLocaleString()}</span>
              <span className="text-slate-500">Gross: RWF {(row.gross || 0).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Labor Cost Analysis</h1>
          <p className="text-sm text-slate-500">Direct vs indirect labor allocation report</p>
        </div>

        <Card>
          <CardContent className="flex flex-wrap gap-3 pt-6">
            <Input type="number" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} className="w-32" />
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All months" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{new Date(0, i).toLocaleString("en", { month: "long" })}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={viewBy} onValueChange={setViewBy}>
              <SelectTrigger className="w-48"><SelectValue placeholder="View by" /></SelectTrigger>
              <SelectContent>
                {VIEW_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Total Direct Labor</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-emerald-600">RWF {Array.isArray(data) ? data.reduce((s: number, r: any) => s + (r.direct || 0), 0).toLocaleString() : (data?.accounts?.find((a: any) => a.accountCode === '5300')?.amount || 0).toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2"><Building2 className="h-4 w-4" /> Total Indirect Labor</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-blue-600">RWF {Array.isArray(data) ? data.reduce((s: number, r: any) => s + (r.indirect || 0), 0).toLocaleString() : (data?.accounts?.find((a: any) => a.accountCode === '5400')?.amount || 0).toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2"><Users className="h-4 w-4" /> Records</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-slate-900 dark:text-white">{Array.isArray(data) ? data.length : (data?.accounts?.length || 0)}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Report Data</CardTitle></CardHeader>
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </div>
    </Layout>
  );
}
