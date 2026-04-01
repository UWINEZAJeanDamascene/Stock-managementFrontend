import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { journalEntriesApi, JournalEntry } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Search,
  Loader2,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

const SOURCE_TYPES = [
  { value: 'all', label: 'All Sources' },
  { value: 'manual', label: 'Manual' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'purchase_order', label: 'Purchase Order' },
  { value: 'expense', label: 'Expense' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'payroll_run', label: 'Payroll Run' },
  { value: 'payroll_salary', label: 'Payroll Salary' },
  { value: 'credit_note', label: 'Credit Note' },
  { value: 'purchase_return', label: 'Purchase Return' },
  { value: 'tax_settlement', label: 'Tax Settlement' },
  { value: 'vat_settlement', label: 'VAT Settlement' },
  { value: 'paye_settlement', label: 'PAYE Settlement' },
  { value: 'rssb_settlement', label: 'RSSB Settlement' },
  { value: 'reversal', label: 'Reversal' },
  { value: 'petty_cash_expense', label: 'Petty Cash' },
  { value: 'cogs', label: 'COGS' },
  { value: 'payment', label: 'Payment' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
  { value: 'voided', label: 'Voided' },
  { value: 'reversed', label: 'Reversed' },
];

export default function JournalEntriesPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Void dialog
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidingEntry, setVoidingEntry] = useState<JournalEntry | null>(null);
  const [voiding, setVoiding] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (searchQuery) params.search = searchQuery;
      if (sourceTypeFilter !== 'all') params.sourceType = sourceTypeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await journalEntriesApi.getAll(params);
      if (response.success) {
        setEntries(response.data || []);
        setTotalPages(response.pages || 1);
        setTotal(response.total || 0);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, sourceTypeFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEntries();
  };

  const handleVoid = async () => {
    if (!voidingEntry) return;
    setVoiding(true);
    try {
      await journalEntriesApi.void(voidingEntry._id);
      toast.success('Journal entry voided');
      setVoidDialogOpen(false);
      setVoidingEntry(null);
      fetchEntries();
    } catch (error: any) {
      toast.error(error.message || 'Failed to void entry');
    } finally {
      setVoiding(false);
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (sourceTypeFilter !== 'all') params.append('sourceType', sourceTypeFilter);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    const url = `/api/journal-entries/export?${params.toString()}`;
    window.open(url, '_blank');
    toast.success('Export started');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge className="bg-green-100 text-green-700">Posted</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-700">Draft</Badge>;
      case 'voided':
        return <Badge className="bg-red-100 text-red-700">Voided</Badge>;
      case 'reversed':
        return <Badge className="bg-gray-100 text-gray-700">Reversed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Journal Entries
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage all journal entries
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/journal/trial-balance')}>
              Trial Balance
            </Button>
            <Button variant="outline" onClick={() => navigate('/journal/general-ledger')}>
              General Ledger
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => navigate('/journal/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="grid grid-cols-6 gap-4">
              <div className="col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by entry #, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map(st => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="Start date" />
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End date" />
            </form>
          </CardContent>
        </Card>

        {/* Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Entries ({total})</span>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && entries.length === 0 ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No journal entries found</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry._id}>
                        <TableCell className="font-mono font-medium">
                          {entry.entryNumber}
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{(entry as any).sourceType || 'manual'}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(entry.totalDebit)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(entry.totalCredit)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(entry.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/journal/${entry._id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {entry.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/journal/${entry._id}`)}
                                title="Post entry"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {entry.status === 'posted' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setVoidingEntry(entry);
                                  setVoidDialogOpen(true);
                                }}
                                title="Void entry"
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-slate-500">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">Page {page} of {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Void Dialog */}
        <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void Journal Entry</DialogTitle>
              <DialogDescription>
                Are you sure you want to void entry {voidingEntry?.entryNumber}?
                This will reverse all account balance adjustments.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleVoid} disabled={voiding}>
                {voiding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Void Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
