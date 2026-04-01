import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { journalEntriesApi, JournalEntry } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function JournalEntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');

  useEffect(() => {
    if (id) fetchEntry();
  }, [id]);

  const fetchEntry = async () => {
    setLoading(true);
    try {
      const response = await journalEntriesApi.getById(id!);
      if (response.success) setEntry(response.data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load entry');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!entry) return;
    setActionLoading(true);
    try {
      await journalEntriesApi.post(entry._id);
      toast.success('Entry posted successfully');
      setPostDialogOpen(false);
      fetchEntry();
    } catch (error: any) {
      toast.error(error.message || 'Failed to post entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!entry) return;
    setActionLoading(true);
    try {
      await journalEntriesApi.void(entry._id);
      toast.success('Entry voided');
      setVoidDialogOpen(false);
      fetchEntry();
    } catch (error: any) {
      toast.error(error.message || 'Failed to void entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!entry) return;
    setActionLoading(true);
    try {
      const response = await journalEntriesApi.reverse(entry._id, reverseReason);
      toast.success('Reversal entry created');
      setReverseDialogOpen(false);
      if (response.data?._id) {
        navigate(`/journal/${response.data._id}`);
      } else {
        fetchEntry();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reverse entry');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted': return <Badge className="bg-green-100 text-green-700">Posted</Badge>;
      case 'draft': return <Badge className="bg-yellow-100 text-yellow-700">Draft</Badge>;
      case 'voided': return <Badge className="bg-red-100 text-red-700">Voided</Badge>;
      case 'reversed': return <Badge className="bg-gray-100 text-gray-700">Reversed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!entry) {
    return (
      <Layout>
        <div className="text-center py-24">
          <p className="text-slate-500">Journal entry not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/journal')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Journal
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/journal')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                {entry.entryNumber}
              </h1>
              <p className="text-muted-foreground">{entry.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(entry.status)}
            {entry.status === 'draft' && (
              <Button onClick={() => setPostDialogOpen(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Post Entry
              </Button>
            )}
            {entry.status === 'posted' && (
              <>
                <Button variant="outline" onClick={() => setReverseDialogOpen(true)}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reverse
                </Button>
                <Button variant="destructive" onClick={() => setVoidDialogOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Void
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Entry Details */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Entry Number</p>
              <p className="font-mono font-semibold">{entry.entryNumber}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Date</p>
              <p className="font-semibold">{format(new Date(entry.date), 'dd MMM yyyy')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Source</p>
              <p className="font-semibold">{(entry as any).sourceType || 'manual'}</p>
              {(entry as any).sourceReference && (
                <p className="text-xs text-slate-400">{(entry as any).sourceReference}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Status</p>
              <p>{getStatusBadge(entry.status)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Journal Lines */}
        <Card>
          <CardHeader>
            <CardTitle>Journal Lines</CardTitle>
            <CardDescription>
              Total Debit: {entry.totalDebit.toLocaleString()} | Total Credit: {entry.totalCredit.toLocaleString()}
              {Math.abs(entry.totalDebit - entry.totalCredit) < 0.01 && (
                <Badge className="ml-2 bg-green-100 text-green-700">Balanced</Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{line.accountCode}</TableCell>
                    <TableCell>{line.accountName}</TableCell>
                    <TableCell className="text-slate-500">{line.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      {line.debit > 0 ? line.debit.toLocaleString() : ''}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {line.credit > 0 ? line.credit.toLocaleString() : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="font-bold bg-slate-50">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right font-mono">{entry.totalDebit.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{entry.totalCredit.toLocaleString()}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>

        {/* Metadata */}
        {entry.notes && (
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{entry.notes}</p></CardContent>
          </Card>
        )}

        {/* Post Dialog */}
        <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post Journal Entry</DialogTitle>
              <DialogDescription>
                Posting will finalize this entry and update all account balances. This cannot be undone (use Reverse instead).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPostDialogOpen(false)}>Cancel</Button>
              <Button onClick={handlePost} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Post Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Void Dialog */}
        <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void Journal Entry</DialogTitle>
              <DialogDescription>
                Voiding will reverse all account balance adjustments for this entry.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVoidDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleVoid} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                Void Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reverse Dialog */}
        <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reverse Journal Entry</DialogTitle>
              <DialogDescription>
                This will create a new entry that reverses all debits and credits.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for reversal</Label>
              <Textarea
                id="reason"
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Optional reason..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReverseDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleReverse} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Reverse Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
