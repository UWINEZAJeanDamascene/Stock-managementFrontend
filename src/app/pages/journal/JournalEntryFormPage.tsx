import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { journalEntriesApi, chartOfAccountsApi, ChartOfAccountItem } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  BookOpen,
  Save
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LineForm {
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export default function JournalEntryFormPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<ChartOfAccountItem[]>([]);

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineForm[]>([
    { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
    { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 },
  ]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await chartOfAccountsApi.getAll({ isActive: true });
      if (response.success) setAccounts(response.data || []);
    } catch (error) {
      console.error('Failed to load accounts', error);
    }
  };

  const addLine = () => {
    setLines([...lines, { accountCode: '', accountName: '', description: '', debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) {
      toast.error('Minimum 2 lines required');
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineForm, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill account name when code is selected
    if (field === 'accountCode') {
      const account = accounts.find(a => a.code === value);
      if (account) {
        updated[index].accountName = account.name;
      }
    }

    // Clear opposite field
    if (field === 'debit' && value > 0) {
      updated[index].credit = 0;
    }
    if (field === 'credit' && value > 0) {
      updated[index].debit = 0;
    }

    setLines(updated);
  };

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    const validLines = lines.filter(l => l.accountCode && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      toast.error('At least 2 lines with amounts are required');
      return;
    }

    if (!isBalanced) {
      toast.error('Journal entry must be balanced (Debits = Credits)');
      return;
    }

    setSaving(true);
    try {
      const response = await journalEntriesApi.create({
        date,
        description,
        notes,
        lines: validLines.map(l => ({
          accountCode: l.accountCode,
          accountName: l.accountName,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
        })),
      });

      if (response.success) {
        toast.success('Journal entry created as draft');
        navigate(`/journal/${response.data._id}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/journal')} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
                <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                New Journal Entry
              </h1>
              <p className="text-muted-foreground dark:text-slate-400">Create a manual journal entry</p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="dark:bg-primary dark:text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save as Draft
          </Button>
        </div>

        {/* Entry Details */}
        <Card className="dark:bg-slate-800">
          <CardHeader><CardTitle className="dark:text-white">Entry Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="dark:text-slate-200">Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
            </div>
            <div className="space-y-2">
              <Label className="dark:text-slate-200">Description *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Monthly adjustment entry"
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Journal Lines */}
        <Card className="dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between dark:text-white">
              <span>Journal Lines</span>
              <Button variant="outline" size="sm" onClick={addLine} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                  <TableHead className="w-[200px] dark:text-slate-200">Account</TableHead>
                  <TableHead className="dark:text-slate-200">Description</TableHead>
                  <TableHead className="w-[150px] text-right dark:text-slate-200">Debit</TableHead>
                  <TableHead className="w-[150px] text-right dark:text-slate-200">Credit</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow key={idx} className="dark:border-slate-600">
                    <TableCell>
                      <Select
                        value={line.accountCode}
                        onValueChange={(value) => updateLine(idx, 'accountCode', value)}
                      >
                        <SelectTrigger className="font-mono text-sm dark:bg-slate-700 dark:text-white dark:border-slate-600">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          {accounts.map(acc => (
                            <SelectItem key={acc.code} value={acc.code} className="dark:text-slate-200">
                              {acc.code} - {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                        placeholder="Line description"
                        className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit || ''}
                        onChange={(e) => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                        className="text-right font-mono dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit || ''}
                        onChange={(e) => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                        className="text-right font-mono dark:bg-slate-700 dark:text-white dark:border-slate-600"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length <= 2}
                        className="dark:hover:bg-slate-700"
                      >
                        <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="flex justify-end gap-8 pt-4 border-t mt-4 dark:border-slate-600">
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Debit</p>
                <p className="text-xl font-bold font-mono dark:text-white">{totalDebit.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Credit</p>
                <p className="text-xl font-bold font-mono dark:text-white">{totalCredit.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">Difference</p>
                <p className={`text-xl font-bold font-mono ${isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {Math.abs(totalDebit - totalCredit).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="dark:bg-slate-800">
          <CardHeader><CardTitle className="dark:text-white">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
