import React, { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { fixedAssetsApi, productsApi, companyApi, invoicesApi, purchasesApi, journalEntriesApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Building, Plus, Pencil, Trash2, TrendingDown, Package, Wallet, Save, Eye, Wrench, XCircle, Play } from 'lucide-react';

// ── Depreciation Schedule Helpers ────────────────────────────────────────────

function computeSLSchedule(cost: number, salvage: number, years: number) {
  const depreciable = cost - salvage;
  const annual      = depreciable / years;
  const rate        = (1 / years) * 100;
  let accumulated   = 0;
  const rows = Array.from({ length: years }, (_, i) => {
    accumulated += annual;
    return { year: i + 1, depreciation: annual, accumulated, bookValue: cost - accumulated };
  });
  return { rows, annual, rate, depreciable };
}

function computeSYDSchedule(cost: number, salvage: number, years: number) {
  const depreciable = cost - salvage;
  const syd         = (years * (years + 1)) / 2;
  let   accumulated = 0;
  const rows = Array.from({ length: years }, (_, i) => {
    const remainingLife = years - i;
    const dep           = (depreciable * remainingLife) / syd;
    accumulated        += dep;
    return { year: i + 1, remainingLife, fraction: remainingLife / syd, depreciation: dep, accumulated, bookValue: cost - accumulated };
  });
  return { rows, syd, depreciable, total: accumulated };
}

function computeDBSchedule(cost: number, salvage: number, years: number) {
  // Rate = 1 − (Salvage / Cost) ^ (1 / UsefulLife)
  const rate = (salvage > 0 && cost > 0)
    ? 1 - Math.pow(salvage / cost, 1 / years)
    : 2 / years; // double-declining fallback when salvage = 0
  let bookValue   = cost;
  let accumulated = 0;
  const rows: Array<{ year: number; openingBV: number; depreciation: number; accumulated: number; closingBV: number }> = [];
  for (let year = 1; year <= years; year++) {
    const dep         = year === years
      ? Math.max(0, bookValue - salvage)                        // final year: exact remainder
      : Math.min(bookValue * rate, Math.max(0, bookValue - salvage));
    accumulated      += dep;
    const closingBV   = bookValue - dep;
    rows.push({ year, openingBV: bookValue, depreciation: dep, accumulated, closingBV });
    bookValue = closingBV;
    if (bookValue <= salvage + 0.01) break;
  }
  return { rows, ratePercent: rate * 100, depreciable: cost - salvage, total: accumulated };
}

function getSampleYears(n: number): number[] {
  if (n <= 8) return Array.from({ length: n }, (_, i) => i + 1);
  const mid = [Math.floor(n * 0.5), Math.floor(n * 0.75)].filter((v, i, a) => v > 5 && v < n - 1 && a.indexOf(v) === i);
  return [1, 2, 3, 4, 5, ...mid, n - 1, n];
}

interface FixedAsset {
  _id: string;
  name: string;
  assetCode?: string;
  category: string;
  description?: string;
  purchaseDate: string;
  purchaseCost: number;
  usefulLifeYears: number;
  depreciationMethod: string;
  salvageValue: number;
  status: string;
  location?: string;
  serialNumber?: string;
  accumulatedDepreciation: number;
  netBookValue: number;
  depreciationStartDate?: string;
  depreciationEndDate?: string;
  disposalDate?: string;
  disposalAmount?: number;
  disposalMethod?: string;
  disposalNotes?: string;
  maintenanceHistory?: Array<{
    date: string;
    type: string;
    description: string;
    cost: number;
    vendor: string;
    nextMaintenanceDate?: string;
  }>;
}

interface InventoryItem {
  _id: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  totalValue: number;
}

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'non-current'>('current');

  // Schedule dialog
  const [scheduleDialogOpen, setScheduleDialogOpen]   = useState(false);
  const [scheduleAsset,      setScheduleAsset]         = useState<FixedAsset | null>(null);

  // Disposal dialog
  const [disposalDialogOpen, setDisposalDialogOpen] = useState(false);
  const [disposalAsset, setDisposalAsset] = useState<FixedAsset | null>(null);
  const [disposalFormData, setDisposalFormData] = useState({
    disposalDate: new Date().toISOString().split('T')[0],
    disposalAmount: 0,
    disposalMethod: 'sold',
    disposalNotes: ''
  });

  // Maintenance dialog
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [maintenanceAsset, setMaintenanceAsset] = useState<FixedAsset | null>(null);
  const [maintenanceFormData, setMaintenanceFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'preventive',
    description: '',
    cost: 0,
    vendor: '',
    nextMaintenanceDate: ''
  });

  // Depreciation dialog
  const [depreciationDialogOpen, setDepreciationDialogOpen] = useState(false);
  const [depreciationPeriod, setDepreciationPeriod] = useState('');
  const [depreciationLoading, setDepreciationLoading] = useState(false);
  const [depreciationResult, setDepreciationResult] = useState<any>(null);

  const formatNum = (n: number) => Math.round(n).toLocaleString('en-US');
  
  // Current Assets - Manual Entries
  const [prepaidExpenses, setPrepaidExpenses] = useState(0);
  const [prepaidExpensesFormData, setPrepaidExpensesFormData] = useState(0);
  const [isPrepaidDialogOpen, setIsPrepaidDialogOpen] = useState(false);
  const [accountsReceivable, setAccountsReceivable] = useState(0);
  const [cashAndBank, setCashAndBank] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    category: 'equipment',
    description: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: 0,
    usefulLifeYears: 5,
    depreciationMethod: 'straight-line',
    salvageValue: 0,
    location: '',
    serialNumber: '',
    paymentMethod: 'cash'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch fixed assets
      const assetsRes = await fixedAssetsApi.getAll();
      setAssets(assetsRes.data as FixedAsset[]);
      setSummary(assetsRes.summary);
      
      // Fetch inventory/stock
      const stockRes = await productsApi.getAll({ limit: 1000 });
      const productsData = stockRes.data as any;
      const productsArray = productsData?.data || productsData || [];
      const inventoryData = (Array.isArray(productsArray) ? productsArray : []).map((item: any) => ({
        _id: item._id,
        name: item.name,
        quantity: item.currentStock || 0,
        purchasePrice: item.averageCost || 0,
        totalValue: (item.currentStock || 0) * (item.averageCost || 0)
      }));
      setInventory(inventoryData);

      // Fetch company data for Prepaid Expenses
      try {
        const companyRes = await companyApi.getMe();
        const company = companyRes.data as any;
        setPrepaidExpenses(company?.assets?.prepaidExpenses || 0);
        setPrepaidExpensesFormData(company?.assets?.prepaidExpenses || 0);
      } catch (companyErr) {
        console.error('Failed to fetch company data:', companyErr);
      }
      
      // Fetch Accounts Receivable (unpaid invoices)
      try {
        const invoicesRes = await invoicesApi.getAll();
        const invoicesData = invoicesRes.data as any;
        const invoicesArray = invoicesData?.data || invoicesData || [];
        const unpaidInvoices = Array.isArray(invoicesArray) 
          ? invoicesArray.filter((inv: any) => inv.status === 'confirmed' || inv.status === 'partial' || inv.status === 'draft')
          : [];
        const totalAR = unpaidInvoices.reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0);
        setAccountsReceivable(totalAR);
      } catch (arErr) {
        console.error('Failed to fetch accounts receivable:', arErr);
      }

      // Fetch Cash & Bank (payments received from invoices)
      try {
        const invoicesRes = await invoicesApi.getAll();
        const invoicesData = invoicesRes.data as any;
        const invoicesArray = invoicesData?.data || invoicesData || [];
        const paidInvoices = Array.isArray(invoicesArray)
          ? invoicesArray.filter((inv: any) => inv.status === 'paid')
          : [];
        const totalCash = paidInvoices.reduce((sum: number, inv: any) => sum + (inv.amountPaid || 0), 0);
        setCashAndBank(totalCash);
      } catch (cashErr) {
        console.error('Failed to fetch cash & bank:', cashErr);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAsset) {
        await fixedAssetsApi.update(editingAsset._id, formData);
      } else {
        await fixedAssetsApi.create(formData);
      }
      setIsDialogOpen(false);
      setEditingAsset(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to save fixed asset');
    }
  };

  const handleEdit = (asset: FixedAsset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      category: asset.category,
      description: asset.description || '',
      purchaseDate: new Date(asset.purchaseDate).toISOString().split('T')[0],
      purchaseCost: asset.purchaseCost,
      usefulLifeYears: asset.usefulLifeYears,
      depreciationMethod: asset.depreciationMethod,
      salvageValue: asset.salvageValue,
      location: asset.location || '',
      serialNumber: asset.serialNumber || '',
      paymentMethod: (asset as any).paymentMethod || 'cash'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fixed asset?')) return;
    try {
      await fixedAssetsApi.delete(id);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete fixed asset');
    }
  };

  // Open disposal dialog
  const handleDispose = (asset: FixedAsset) => {
    setDisposalAsset(asset);
    setDisposalFormData({
      disposalDate: new Date().toISOString().split('T')[0],
      disposalAmount: asset.netBookValue || 0,
      disposalMethod: 'sold',
      disposalNotes: ''
    });
    setDisposalDialogOpen(true);
  };

  // Submit disposal
  const handleDisposalSubmit = async () => {
    if (!disposalAsset) return;
    try {
      await fixedAssetsApi.update(disposalAsset._id, {
        status: 'disposed',
        ...disposalFormData
      });
      setDisposalDialogOpen(false);
      setDisposalAsset(null);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to record disposal');
    }
  };

  // Open maintenance dialog
  const handleMaintenance = (asset: FixedAsset) => {
    setMaintenanceAsset(asset);
    setMaintenanceFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'preventive',
      description: '',
      cost: 0,
      vendor: '',
      nextMaintenanceDate: ''
    });
    setMaintenanceDialogOpen(true);
  };

  // Submit maintenance record
  const handleMaintenanceSubmit = async () => {
    if (!maintenanceAsset) return;
    try {
      const currentHistory = maintenanceAsset.maintenanceHistory || [];
      await fixedAssetsApi.update(maintenanceAsset._id, {
        maintenanceHistory: [...currentHistory, maintenanceFormData]
      });
      setMaintenanceDialogOpen(false);
      setMaintenanceAsset(null);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to add maintenance record');
    }
  };

  // Run monthly depreciation
  const handleRunDepreciation = async () => {
    try {
      setDepreciationLoading(true);
      const result = await journalEntriesApi.runDepreciation(depreciationPeriod || undefined);
      setDepreciationResult(result.data);
      if (result.data.processed > 0) {
        fetchData(); // Refresh assets to show updated accumulated depreciation
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to run depreciation');
    } finally {
      setDepreciationLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'equipment',
      description: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: 0,
      usefulLifeYears: 5,
      depreciationMethod: 'straight-line',
      salvageValue: 0,
      location: '',
      serialNumber: '',
      paymentMethod: 'cash'
    });
  };

  const openNewDialog = () => {
    setEditingAsset(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openScheduleDialog = (asset: FixedAsset) => {
    setScheduleAsset(asset);
    setScheduleDialogOpen(true);
  };

  // ── Depreciation schedule renderer ─────────────────────────────────────────
  const renderDepreciationSchedule = () => {
    if (!scheduleAsset) return null;
    const cost     = scheduleAsset.purchaseCost;
    const salvage  = scheduleAsset.salvageValue || 0;
    const years    = scheduleAsset.usefulLifeYears;
    const depreciable = cost - salvage;

    const sl  = computeSLSchedule(cost, salvage, years);
    const syd = computeSYDSchedule(cost, salvage, years);
    const db  = computeDBSchedule(cost, salvage, years);
    const sampleYears = getSampleYears(years);

    return (
      <div className="space-y-6">

        {/* ① Straight Line */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-500 text-white text-xs font-bold">1</span>
            <h3 className="font-bold text-base">Straight Line (SL)</h3>
            {scheduleAsset.depreciationMethod === 'straight-line' && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Active Method</span>
            )}
          </div>
          {/* Formula box */}
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-300 mb-3">
            <div className="text-green-400 mb-2">Annual Depreciation = (Cost - Salvage Value)</div>
            <div className="text-green-400 pl-24">─────────────────────────────</div>
            <div className="text-green-400 pl-36 mb-2">Useful Life</div>
            <div className="text-green-300">Rate = 1 / Useful Life × 100</div>
          </div>
          {/* Example */}
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="text-green-400 space-y-0.5">
              <div>Cost:         RF {formatNum(cost)}</div>
              <div>Salvage:      RF {formatNum(salvage)}</div>
              <div>Useful Life:  {years} years</div>
            </div>
            <div className="text-yellow-300 mt-2">
              Annual Dep = ({formatNum(cost)} - {formatNum(salvage)}) / {years}
            </div>
            <div className="text-green-300 pl-10">= {formatNum(depreciable)} / {years}</div>
            <div className="text-white font-bold pl-10">
              = RF {formatNum(sl.annual)} per year ← SAME every year
            </div>
            <div className="text-green-300 mt-1">
              Rate = 1/{years} × 100 = {sl.rate.toFixed(2)}% per year
            </div>
          </div>
        </div>

        {/* ② Sum of Years Digits */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-purple-500 text-white text-xs font-bold">2</span>
            <h3 className="font-bold text-base">Sum of Years Digits (SYD)</h3>
            {scheduleAsset.depreciationMethod === 'sum-of-years' && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">Active Method</span>
            )}
          </div>
          {/* Formula box */}
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-300 space-y-1 mb-3">
            <div className="text-green-400">Step 1 — Calculate Sum of Years:</div>
            <div>SYD = n(n+1) / 2</div>
            <div className="pl-6 text-muted-foreground text-green-600">where n = useful life</div>
            <div className="text-green-400 mt-2">Step 2 — Each Year's Fraction:</div>
            <div>Fraction = Remaining Life / SYD</div>
            <div className="text-green-400 mt-2">Step 3 — Annual Depreciation:</div>
            <div>Dep = (Cost - Salvage Value) × Fraction</div>
          </div>
          {/* Example */}
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="text-green-400 space-y-0.5">
              <div>Cost:         RF {formatNum(cost)}</div>
              <div>Salvage:      RF {formatNum(salvage)}</div>
              <div>Useful Life:  {years} years</div>
              <div>Depreciable:  RF {formatNum(depreciable)}</div>
            </div>
            <div className="text-yellow-300 mt-2">
              SYD = {years}({years}+1) / 2
            </div>
            <div className="text-green-300 pl-6">= {years} × {years + 1} / 2</div>
            <div className="text-green-300 pl-6">= {years * (years + 1)} / 2</div>
            <div className="text-white font-bold pl-6">= {syd.syd}</div>
            <div className="space-y-0.5 text-green-300 mt-2 max-h-48 overflow-y-auto pr-1">
              {syd.rows.map(r => (
                <div key={r.year}>
                  Year {String(r.year).padStart(2, ' ')}: Dep = {formatNum(depreciable)} × {r.remainingLife}/{syd.syd} = RF {formatNum(r.depreciation)}
                </div>
              ))}
            </div>
            <div className="border-t border-slate-600 pt-2 flex justify-between text-green-200 font-bold">
              <span>Total:</span>
              <span>RF {formatNum(syd.total)} {Math.abs(syd.total - depreciable) < 1 ? '✅' : ''}</span>
            </div>
          </div>
        </div>

        {/* ③ Declining Balance */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-orange-500 text-white text-xs font-bold">3</span>
            <h3 className="font-bold text-base">Declining Balance (DB)</h3>
            {scheduleAsset.depreciationMethod === 'declining-balance' && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">Active Method</span>
            )}
          </div>
          {/* Formula box */}
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-300 space-y-1 mb-3">
            <div className="text-green-400">Step 1 — Calculate Rate:</div>
            <div>Rate = 1 - (Salvage Value / Cost) ^ (1 / Useful Life)</div>
            <div className="text-green-400 mt-2">Step 2 — Each Year:</div>
            <div>Dep = Opening Book Value × Rate</div>
            <div className="text-green-400 mt-2">Step 3 — Book Value:</div>
            <div>Closing = Opening - Depreciation</div>
          </div>
          {/* Example */}
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="text-green-400 space-y-0.5">
              <div>Cost:        RF {formatNum(cost)}</div>
              <div>Salvage:     RF {formatNum(salvage)}</div>
              <div>Useful Life: {years} years</div>
            </div>
            {salvage > 0 ? (
              <div className="text-yellow-300 mt-2 space-y-0.5">
                <div>Rate = 1 - ({formatNum(salvage)}/{formatNum(cost)})^(1/{years})</div>
                <div className="pl-6">= 1 - ({(salvage / cost).toFixed(4)})^({(1 / years).toFixed(4)})</div>
                <div className="pl-6">= 1 - {(Math.pow(salvage / cost, 1 / years)).toFixed(4)}</div>
                <div className="pl-6 text-white font-bold">= {db.ratePercent.toFixed(2)}%</div>
              </div>
            ) : (
              <div className="text-yellow-300 mt-2">
                Rate (double-declining fallback) = 2/{years} = {db.ratePercent.toFixed(2)}%
              </div>
            )}
            <div className="space-y-0.5 text-green-300 mt-2 max-h-48 overflow-y-auto pr-1">
              {db.rows.map(r => (
                <div key={r.year}>
                  Year {String(r.year).padStart(2, ' ')}: {formatNum(r.openingBV)} × {db.ratePercent.toFixed(2)}% = RF {formatNum(r.depreciation)}
                </div>
              ))}
            </div>
            <div className="border-t border-slate-600 pt-2 flex justify-between text-green-200 font-bold">
              <span>Total:</span>
              <span>RF {formatNum(db.total)} {Math.abs(db.total - depreciable) < 2 ? '✅' : ''}</span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-600 text-white text-xs font-bold">≡</span>
            <h3 className="font-bold text-base">Side by Side Comparison</h3>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <table className="w-full text-right text-xs text-green-300">
              <thead>
                <tr className="text-green-400 border-b border-slate-600">
                  <th className="text-left py-2 pr-6 font-semibold">Year</th>
                  <th className="py-2 px-4 font-semibold">Straight Line</th>
                  <th className="py-2 px-4 font-semibold">Sum of Years</th>
                  <th className="py-2 px-4 font-semibold">Declining Balance</th>
                </tr>
              </thead>
              <tbody>
                {sampleYears.map((yr, idx) => {
                  const prevYr = idx > 0 ? sampleYears[idx - 1] : 0;
                  const showEllipsis = yr - prevYr > 1;
                  const slRow  = sl.rows[yr - 1];
                  const sydRow = syd.rows[yr - 1];
                  const dbRow  = db.rows.find(r => r.year === yr);
                  return (
                    <React.Fragment key={yr}>
                      {showEllipsis && (
                        <tr><td colSpan={4} className="py-0.5 text-center text-slate-500">...</td></tr>
                      )}
                      <tr className="border-b border-slate-800">
                        <td className="text-left py-1 pr-6">{yr}</td>
                        <td className="py-1 px-4">{slRow  ? `RF ${formatNum(slRow.depreciation)}`  : '—'}</td>
                        <td className="py-1 px-4">{sydRow ? `RF ${formatNum(sydRow.depreciation)}` : '—'}</td>
                        <td className="py-1 px-4">{dbRow  ? `RF ${formatNum(dbRow.depreciation)}`  : '—'}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="text-green-200 font-bold border-t border-slate-600">
                  <td className="text-left py-2 pr-6">Tot</td>
                  <td className="py-2 px-4">RF {formatNum(sl.rows.reduce((s, r) => s + r.depreciation, 0))} ✅</td>
                  <td className="py-2 px-4">RF {formatNum(syd.total)} {Math.abs(syd.total - depreciable) < 1 ? '✅' : ''}</td>
                  <td className="py-2 px-4">RF {formatNum(db.total)} {Math.abs(db.total - depreciable) < 2 ? '✅' : ''}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    );
  };

  const handleUpdatePrepaidExpenses = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await companyApi.update({
        assets: {
          prepaidExpenses: prepaidExpensesFormData
        }
      });
      setIsPrepaidDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update prepaid expenses');
    }
  };

  // Calculate totals by category for Balance Sheet breakdown
  const assetsByCategory = {
    equipment: assets.filter(a => a.category === 'equipment').reduce((sum, a) => sum + a.netBookValue, 0),
    furniture: assets.filter(a => a.category === 'furniture').reduce((sum, a) => sum + a.netBookValue, 0),
    vehicles: assets.filter(a => a.category === 'vehicles').reduce((sum, a) => sum + a.netBookValue, 0),
    computers: assets.filter(a => a.category === 'computers').reduce((sum, a) => sum + a.netBookValue, 0),
    buildings: assets.filter(a => a.category === 'buildings').reduce((sum, a) => sum + a.netBookValue, 0),
    machinery: assets.filter(a => a.category === 'machinery').reduce((sum, a) => sum + a.netBookValue, 0),
    other: assets.filter(a => a.category === 'other').reduce((sum, a) => sum + a.netBookValue, 0),
  };

  // Calculate totals
  const inventoryTotal = inventory.reduce((sum, item) => sum + item.totalValue, 0);
  const nonCurrentAssetsTotal = assets.reduce((sum, asset) => sum + asset.netBookValue, 0);
  const totalDepreciation = assets.reduce((sum, asset) => sum + asset.accumulatedDepreciation, 0);

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Building className="h-6 w-6" />
            Assets
          </h1>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>

        {error && <div className="text-red-600 dark:text-red-400">{error}</div>}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 flex items-center gap-2 ${
              activeTab === 'current' 
                ? 'border-b-2 border-primary font-semibold' 
                : 'text-muted-foreground'
            }`}
          >
            <Wallet className="h-4 w-4" />
            Current Assets
          </button>
          <button
            onClick={() => setActiveTab('non-current')}
            className={`px-4 py-2 flex items-center gap-2 ${
              activeTab === 'non-current' 
                ? 'border-b-2 border-primary font-semibold' 
                : 'text-muted-foreground'
            }`}
          >
            <Building className="h-4 w-4" />
            Non-Current Assets
          </button>
        </div>

        {/* CURRENT ASSETS SECTION */}
        {activeTab === 'current' && (
          <div className="space-y-4">
            {/* Summary Cards for Current Assets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Inventory (Stock Value)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(inventoryTotal)}</div>
                  <p className="text-xs text-muted-foreground">{inventory.length} products in stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Accounts Receivable</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(accountsReceivable)}</div>
                  <p className="text-xs text-muted-foreground">Unpaid invoices</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Cash & Bank</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(cashAndBank)}</div>
                  <p className="text-xs text-muted-foreground">Payments received</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 dark:bg-amber-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Prepaid Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{formatCurrency(prepaidExpenses)}</div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-1 h-6 text-xs"
                    onClick={() => {
                      setPrepaidExpensesFormData(prepaidExpenses);
                      setIsPrepaidDialogOpen(true);
                    }}
                  >
                    <Save className="h-3 w-3 mr-1" /> Edit
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Current Assets Total */}
            <Card className="bg-green-50 dark:bg-green-950">
              <CardContent className="py-4">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-lg">TOTAL CURRENT ASSETS</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(inventoryTotal + accountsReceivable + cashAndBank + prepaidExpenses)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Inventory + Accounts Receivable + Cash & Bank + Prepaid Expenses
                </p>
              </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Details</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : inventory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No inventory items found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventory.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.purchasePrice)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(item.totalValue)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* NON-CURRENT ASSETS SECTION */}
        {activeTab === 'non-current' && (
          <div className="space-y-4">
            {/* Summary Cards for Non-Current Assets */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary?.totalCost || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Accumulated Depreciation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(summary?.totalDepreciation || 0)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Net Book Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalNetValue || 0)}</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 dark:bg-blue-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Depreciation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      const now = new Date();
                      setDepreciationPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                      setDepreciationResult(null);
                      setDepreciationDialogOpen(true);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Monthly Depreciation
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Creates journal entries for depreciation expense
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Balance Sheet Breakdown - shows category breakdown */}
            <Card className="bg-blue-50 dark:bg-blue-950">
              <CardHeader>
                <CardTitle className="text-lg">Balance Sheet Breakdown</CardTitle>
                <p className="text-sm text-muted-foreground">Non-current assets by category (as appears in Balance Sheet)</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">Equipment</p>
                    <p className="text-lg font-bold">{formatCurrency(assetsByCategory.equipment)}</p>
                    <p className="text-xs text-muted-foreground">{assets.filter(a => a.category === 'equipment').length} items</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">Furniture</p>
                    <p className="text-lg font-bold">{formatCurrency(assetsByCategory.furniture)}</p>
                    <p className="text-xs text-muted-foreground">{assets.filter(a => a.category === 'furniture').length} items</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">Vehicles</p>
                    <p className="text-lg font-bold">{formatCurrency(assetsByCategory.vehicles)}</p>
                    <p className="text-xs text-muted-foreground">{assets.filter(a => a.category === 'vehicles').length} items</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">Computers</p>
                    <p className="text-lg font-bold">{formatCurrency(assetsByCategory.computers)}</p>
                    <p className="text-xs text-muted-foreground">{assets.filter(a => a.category === 'computers').length} items</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">Buildings</p>
                    <p className="text-lg font-bold">{formatCurrency(assetsByCategory.buildings)}</p>
                    <p className="text-xs text-muted-foreground">{assets.filter(a => a.category === 'buildings').length} items</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">Machinery</p>
                    <p className="text-lg font-bold">{formatCurrency(assetsByCategory.machinery)}</p>
                    <p className="text-xs text-muted-foreground">{assets.filter(a => a.category === 'machinery').length} items</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                    <p className="text-sm text-muted-foreground">Other</p>
                    <p className="text-lg font-bold">{formatCurrency(assetsByCategory.other)}</p>
                    <p className="text-xs text-muted-foreground">{assets.filter(a => a.category === 'other').length} items</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border-2 border-red-200">
                    <p className="text-sm text-muted-foreground">Less: Accum. Depreciation</p>
                    <p className="text-lg font-bold text-red-600">-{formatCurrency(totalDepreciation)}</p>
                    <p className="text-xs text-muted-foreground">Total depreciation</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">TOTAL NON-CURRENT ASSETS</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(nonCurrentAssetsTotal)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">This amount appears in the Balance Sheet under Non-Current Assets</p>
                </div>
              </CardContent>
            </Card>

            {/* Fixed Assets Table */}
            <Card>
              <CardHeader>
                <CardTitle>Fixed Assets (Equipment, Furniture, Vehicles)</CardTitle>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                    ① <strong>Dep. Start</strong> = always 1st of purchase month
                  </span>
                  <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                    ↑daily <strong>Accum. Dep.</strong> accrues every day (Balance Sheet)
                  </span>
                  <span className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                    P&amp;L updates on the 1st of each month
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : assets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No fixed assets found. Click "Add Asset" to create one.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                      <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Purchase Date</TableHead>
                          <TableHead title="Depreciation always starts from the 1st of the purchase month">Dep. Start ①</TableHead>
                          <TableHead title="Depreciation ends on this date (start + useful life)">Dep. End</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead title="Accrues daily from Dep. Start to today (Balance Sheet)">Accum. Dep. ↑daily</TableHead>
                          <TableHead>Net Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Maintenance</TableHead>
                          <TableHead>Disposal</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assets.map((asset) => (
                          <TableRow key={asset._id}>
                            <TableCell className="font-medium">{asset.name}</TableCell>
                            <TableCell className="capitalize">{asset.category}</TableCell>
                            <TableCell>{new Date(asset.purchaseDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-blue-600 dark:text-blue-400 font-medium text-xs whitespace-nowrap">
                              {asset.depreciationStartDate
                                ? new Date(asset.depreciationStartDate).toLocaleDateString()
                                : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {asset.depreciationEndDate
                                ? new Date(asset.depreciationEndDate).toLocaleDateString()
                                : '—'}
                            </TableCell>
                            <TableCell>{formatCurrency(asset.purchaseCost)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                asset.depreciationMethod === 'straight-line'    ? 'bg-blue-100 text-blue-800'   :
                                asset.depreciationMethod === 'sum-of-years'     ? 'bg-purple-100 text-purple-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {asset.depreciationMethod === 'straight-line' ? 'SL' :
                                 asset.depreciationMethod === 'sum-of-years'  ? 'SYD' : 'DB'}
                              </span>
                            </TableCell>
                            <TableCell className="text-red-600">{formatCurrency(asset.accumulatedDepreciation)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(asset.netBookValue)}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                asset.status === 'active' ? 'bg-green-100 text-green-800' : 
                                asset.status === 'fully-depreciated' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {asset.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {((asset as any).maintenanceHistory?.length || 0) > 0 ? (
                                <div className="text-xs">
                                  <div className="font-medium">{(asset as any).maintenanceHistory?.length} record(s)</div>
                                  <div className="text-muted-foreground">
                                    Last: {(asset as any).maintenanceHistory?.[(asset as any).maintenanceHistory.length - 1]?.date 
                                      ? new Date((asset as any).maintenanceHistory[(asset as any).maintenanceHistory.length - 1].date).toLocaleDateString()
                                      : 'N/A'}
                                  </div>
                                  <div className="text-muted-foreground">
                                    Total Cost: ${((asset as any).maintenanceHistory?.reduce((sum: number, m: any) => sum + (m.cost || 0), 0) || 0).toFixed(2)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {asset.status === 'disposed' ? (
                                <div className="text-xs">
                                  <div>Date: {(asset as any).disposalDate ? new Date((asset as any).disposalDate).toLocaleDateString() : 'N/A'}</div>
                                  <div>Proceeds: ${((asset as any).disposalAmount || 0).toFixed(2)}</div>
                                  <div>NBV: ${asset.netBookValue.toFixed(2)}</div>
                                  <div className={`font-medium ${((asset as any).disposalAmount - asset.netBookValue) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Gain/Loss: ${((asset as any).disposalAmount - asset.netBookValue).toFixed(2)}
                                  </div>
                                  <div className="capitalize">Method: {(asset as any).disposalMethod || 'N/A'}</div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openScheduleDialog(asset)} title="View Depreciation Schedule">
                                  <Eye className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleMaintenance(asset)} title="Add Maintenance Record">
                                  <Wrench className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDispose(asset)} title="Dispose Asset">
                                  <XCircle className="h-4 w-4 text-orange-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(asset)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(asset._id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingAsset ? 'Edit Fixed Asset' : 'Add Fixed Asset'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Asset Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                      <SelectItem value="computers">Computers</SelectItem>
                      <SelectItem value="machinery">Machinery</SelectItem>
                      <SelectItem value="buildings">Buildings</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date *</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchaseCost">Purchase Cost *</Label>
                    <Input
                      id="purchaseCost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.purchaseCost}
                      onChange={(e) => setFormData({ ...formData, purchaseCost: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="usefulLifeYears">Useful Life (Years) *</Label>
                    <Input
                      id="usefulLifeYears"
                      type="number"
                      min="1"
                      value={formData.usefulLifeYears}
                      onChange={(e) => setFormData({ ...formData, usefulLifeYears: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salvageValue">Salvage Value</Label>
                    <Input
                      id="salvageValue"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.salvageValue}
                      onChange={(e) => setFormData({ ...formData, salvageValue: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depreciationMethod">Depreciation Method</Label>
                  <Select
                    value={formData.depreciationMethod}
                    onValueChange={(value) => setFormData({ ...formData, depreciationMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight-line">Straight Line</SelectItem>
                      <SelectItem value="declining-balance">Declining Balance</SelectItem>
                      <SelectItem value="sum-of-years">Sum of Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash (Cash in Hand)</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer (Cash at Bank)</SelectItem>
                      <SelectItem value="cheque">Cheque (Cash at Bank)</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money (MTN MoMo)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This will determine which account is credited in the journal entry
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAsset ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Depreciation Schedule Dialog ─────────────────────────────────── */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                📊 Depreciation Schedule — {scheduleAsset?.name}
              </DialogTitle>
              {scheduleAsset && (
                <p className="text-sm text-muted-foreground mt-1">
                  Cost: RF {(scheduleAsset.purchaseCost || 0).toLocaleString('en-US')}
                  &nbsp;·&nbsp; Salvage: RF {(scheduleAsset.salvageValue || 0).toLocaleString('en-US')}
                  &nbsp;·&nbsp; Useful Life: {scheduleAsset.usefulLifeYears} years
                  &nbsp;·&nbsp; Active Method: <strong>
                    {scheduleAsset.depreciationMethod === 'straight-line' ? 'Straight Line' :
                     scheduleAsset.depreciationMethod === 'sum-of-years'  ? 'Sum of Years Digits' :
                     'Declining Balance'}
                  </strong>
                </p>
              )}
            </DialogHeader>
            <div className="mt-2">
              {renderDepreciationSchedule()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Prepaid Expenses Dialog */}
        <Dialog open={isPrepaidDialogOpen} onOpenChange={setIsPrepaidDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Prepaid Expenses</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdatePrepaidExpenses}>
              <div className="space-y-4 py-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Prepaid expenses are expenses that have been paid in advance but not yet incurred.
                    Examples: Prepaid rent, Prepaid insurance, Prepaid subscriptions.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prepaidExpenses">Prepaid Expenses Amount</Label>
                  <Input
                    id="prepaidExpenses"
                    type="number"
                    min="0"
                    step="0.01"
                    value={prepaidExpensesFormData}
                    onChange={(e) => setPrepaidExpensesFormData(parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This amount appears in the Balance Sheet under Current Assets
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPrepaidDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Asset Disposal Dialog ─────────────────────────────────── */}
        <Dialog open={disposalDialogOpen} onOpenChange={setDisposalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dispose Asset</DialogTitle>
            </DialogHeader>
            {disposalAsset && (
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium">{disposalAsset.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Net Book Value: ${(disposalAsset.netBookValue || 0).toFixed(2)}
                  </p>
                </div>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="disposalDate">Disposal Date</Label>
                    <Input
                      id="disposalDate"
                      type="date"
                      value={disposalFormData.disposalDate}
                      onChange={(e) => setDisposalFormData({ ...disposalFormData, disposalDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="disposalAmount">Disposal Amount</Label>
                    <Input
                      id="disposalAmount"
                      type="number"
                      value={disposalFormData.disposalAmount}
                      onChange={(e) => setDisposalFormData({ ...disposalFormData, disposalAmount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="disposalMethod">Disposal Method</Label>
                    <Select
                      value={disposalFormData.disposalMethod}
                      onValueChange={(value) => setDisposalFormData({ ...disposalFormData, disposalMethod: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="scrapped">Scrapped</SelectItem>
                        <SelectItem value="donated">Donated</SelectItem>
                        <SelectItem value="trade-in">Trade-in</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="disposalNotes">Notes</Label>
                    <Input
                      id="disposalNotes"
                      value={disposalFormData.disposalNotes}
                      onChange={(e) => setDisposalFormData({ ...disposalFormData, disposalNotes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDisposalDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleDisposalSubmit}>
                    Record Disposal
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Asset Maintenance Dialog ─────────────────────────────────── */}
        <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Maintenance Record</DialogTitle>
            </DialogHeader>
            {maintenanceAsset && (
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium">{maintenanceAsset.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Current Net Book Value: ${(maintenanceAsset.netBookValue || 0).toFixed(2)}
                  </p>
                </div>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="maintDate">Maintenance Date</Label>
                    <Input
                      id="maintDate"
                      type="date"
                      value={maintenanceFormData.date}
                      onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maintType">Maintenance Type</Label>
                    <Select
                      value={maintenanceFormData.type}
                      onValueChange={(value) => setMaintenanceFormData({ ...maintenanceFormData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preventive">Preventive</SelectItem>
                        <SelectItem value="corrective">Corrective</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="upgrade">Upgrade</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="maintCost">Cost</Label>
                    <Input
                      id="maintCost"
                      type="number"
                      value={maintenanceFormData.cost}
                      onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maintVendor">Vendor</Label>
                    <Input
                      id="maintVendor"
                      value={maintenanceFormData.vendor}
                      onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, vendor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maintDescription">Description</Label>
                    <Input
                      id="maintDescription"
                      value={maintenanceFormData.description}
                      onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nextMaintDate">Next Maintenance Date (Optional)</Label>
                    <Input
                      id="nextMaintDate"
                      type="date"
                      value={maintenanceFormData.nextMaintenanceDate}
                      onChange={(e) => setMaintenanceFormData({ ...maintenanceFormData, nextMaintenanceDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleMaintenanceSubmit}>
                    Add Record
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Depreciation Run Dialog ─────────────────────────────────── */}
        <Dialog open={depreciationDialogOpen} onOpenChange={setDepreciationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Run Monthly Depreciation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This will create journal entries for monthly depreciation expense. 
                  For each active asset, it will calculate the monthly depreciation and record it in the journal.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="depreciationPeriod">Period (Month)</Label>
                <Input
                  id="depreciationPeriod"
                  type="month"
                  value={depreciationPeriod}
                  onChange={(e) => setDepreciationPeriod(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use current month, or select a specific month
                </p>
              </div>

              {depreciationResult && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Depreciation completed!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                    Processed: {depreciationResult.processed} assets
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Skipped: {depreciationResult.skipped} assets
                  </p>
                  {depreciationResult.journalEntries?.length > 0 && (
                    <div className="mt-2 text-xs">
                      <p className="font-medium">Journal Entries Created:</p>
                      {depreciationResult.journalEntries.map((je: any, idx: number) => (
                        <p key={idx} className="text-green-600 dark:text-green-400">
                          • {je.assetName}: {formatCurrency(je.amount)} (Entry: {je.entryNumber})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setDepreciationDialogOpen(false);
                    setError(null);
                    setDepreciationResult(null);
                  }}
                >
                  Close
                </Button>
                <Button 
                  type="button" 
                  onClick={handleRunDepreciation}
                  disabled={depreciationLoading}
                >
                  {depreciationLoading ? 'Processing...' : 'Run Depreciation'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
