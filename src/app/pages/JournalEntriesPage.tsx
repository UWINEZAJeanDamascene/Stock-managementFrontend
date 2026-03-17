import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { journalEntriesApi, JournalEntry, ChartOfAccounts, JournalEntryLine, bankAccountsApi } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Plus, RefreshCw, Save, X, Trash2, FileText, ArrowDownLeft, ArrowUpRight, CheckCircle, XCircle, DollarSign, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

export default function JournalEntriesPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccounts[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCapitalDialog, setShowCapitalDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Bank accounts for capital entry
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingBankAccounts, setLoadingBankAccounts] = useState(false);
  
  // Capital form state
  const [capitalData, setCapitalData] = useState({
    capitalType: 'owner',
    amount: 0,
    description: '',
    reference: '',
    paymentMethod: 'bank_transfer',
    selectedBankAccount: '' // ID of the selected bank/MOMO account
  });
  const [capitalSaving, setCapitalSaving] = useState(false);
  
  // Create form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    notes: ''
  });
  const [lines, setLines] = useState<Array<{
    accountCode: string;
    description: string;
    debit: number;
    credit: number;
  }>>([
    { accountCode: '', description: '', debit: 0, credit: 0 },
    { accountCode: '', description: '', debit: 0, credit: 0 }
  ]);

  useEffect(() => {
    fetchData();
    // Also fetch bank accounts for capital entry
    fetchBankAccounts();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, accountsRes] = await Promise.all([
        journalEntriesApi.getAll({ limit: 100 }),
        journalEntriesApi.getAccounts()
      ]);
      setEntries(entriesRes.data);
      setAccounts(accountsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load journal entries');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return lines.reduce(
      (acc, line) => ({
        totalDebit: acc.totalDebit + (line.debit || 0),
        totalCredit: acc.totalCredit + (line.credit || 0)
      }),
      { totalDebit: 0, totalCredit: 0 }
    );
  };

  const isBalanced = () => {
    const { totalDebit, totalCredit } = calculateTotals();
    return Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  };

  const handleAddLine = () => {
    setLines([...lines, { accountCode: '', description: '', debit: 0, credit: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (index: number, field: string, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // If entering debit, clear credit and vice versa
    if (field === 'debit' && typeof value === 'number' && value > 0) {
      newLines[index].credit = 0;
    } else if (field === 'credit' && typeof value === 'number' && value > 0) {
      newLines[index].debit = 0;
    }
    
    setLines(newLines);
  };

  const handleSubmit = async () => {
    if (!isBalanced()) {
      toast.error('Journal entry must have equal debits and credits');
      return;
    }

    if (!formData.description || lines.some(l => !l.accountCode)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const formattedLines = lines.map(line => ({
        accountCode: line.accountCode,
        description: line.description,
        debit: line.debit || 0,
        credit: line.credit || 0
      }));

      await journalEntriesApi.create({
        date: formData.date,
        description: formData.description,
        reference: formData.reference,
        lines: formattedLines,
        notes: formData.notes
      });

      toast.success('Journal entry created successfully');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating journal entry:', error);
      toast.error('Failed to create journal entry');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference: '',
      notes: ''
    });
    setLines([
      { accountCode: '', description: '', debit: 0, credit: 0 },
      { accountCode: '', description: '', debit: 0, credit: 0 }
    ]);
  };

  const getAccountName = (code: string) => {
    const account = accounts.find(a => a.code === code);
    return account ? `${code} - ${account.name}` : code;
  };

  const getAccountType = (code: string) => {
    const account = accounts.find(a => a.code === code);
    return account?.type || '';
  };

  // Fetch bank accounts for capital entry
  const fetchBankAccounts = async () => {
    setLoadingBankAccounts(true);
    try {
      console.log('Fetching bank accounts...');
      const response = await bankAccountsApi.getAll();
      console.log('Bank accounts response:', response);
      setBankAccounts(response.data || []);
      console.log('Bank accounts set:', response.data?.length || 0);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      toast.error('Failed to load bank accounts');
    } finally {
      setLoadingBankAccounts(false);
    }
  };

  // Filter bank accounts by payment method
  const filteredBankAccounts = useMemo(() => {
    if (!bankAccounts || bankAccounts.length === 0) {
      return [];
    }
    
    if (capitalData.paymentMethod === 'bank_transfer' || capitalData.paymentMethod === 'cheque') {
      // Show only bank accounts (not MOMO, not cash in hand)
      return bankAccounts.filter((acc: any) => 
        acc.accountType && 
        acc.accountType !== 'mtn_momo' && 
        acc.accountType !== 'airtel_money' && 
        acc.accountType !== 'cash_in_hand'
      );
    } else if (capitalData.paymentMethod === 'mobile_money') {
      // Show only MOMO accounts
      return bankAccounts.filter((acc: any) => 
        acc.accountType && 
        (acc.accountType === 'mtn_momo' || acc.accountType === 'airtel_money')
      );
    }
    return [];
  }, [bankAccounts, capitalData.paymentMethod]);

  // Get the selected bank account details
  const selectedBankAccountDetails = useMemo(() => {
    return bankAccounts.find((acc: any) => acc._id === capitalData.selectedBankAccount);
  }, [bankAccounts, capitalData.selectedBankAccount]);

  // Get GL account code based on payment method and selected account
  const getGLAccountCode = () => {
    if (capitalData.paymentMethod === 'cash') {
      return '1000'; // Cash in Hand
    }
    if (selectedBankAccountDetails) {
      return selectedBankAccountDetails.accountCode || getDefaultGLCode(capitalData.paymentMethod);
    }
    return getDefaultGLCode(capitalData.paymentMethod);
  };

  // Get default GL code based on payment method
  const getDefaultGLCode = (method: string) => {
    switch (method) {
      case 'bank_transfer':
      case 'cheque':
        return '1100'; // Cash at Bank (default)
      case 'mobile_money':
        return '1200'; // MTN MoMo (default)
      case 'cash':
        return '1000'; // Cash in Hand
      default:
        return '1100';
    }
  };

  const handleCapitalSubmit = async () => {
    if (capitalData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!capitalData.description) {
      toast.error('Please enter a description');
      return;
    }

    // Validate bank account selection for bank transfer, cheque, or mobile money
    if ((capitalData.paymentMethod === 'bank_transfer' || capitalData.paymentMethod === 'cheque' || capitalData.paymentMethod === 'mobile_money') && !capitalData.selectedBankAccount) {
      toast.error('Please select a ' + (capitalData.paymentMethod === 'mobile_money' ? 'MOMO' : 'bank') + ' account');
      return;
    }

    setCapitalSaving(true);
    try {
      const endpoint = capitalData.capitalType === 'owner' 
        ? '/api/companies/capital/owner' 
        : '/api/companies/capital/share';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount: capitalData.amount,
          description: capitalData.description,
          reference: capitalData.reference,
          paymentMethod: capitalData.paymentMethod,
          bankAccountId: capitalData.selectedBankAccount || null,
          glAccountCode: getGLAccountCode()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record capital');
      }

      toast.success(t('Capital recorded successfully', 'Capital recorded successfully'));
      setShowCapitalDialog(false);
      setCapitalData({ capitalType: 'owner', amount: 0, description: '', reference: '', paymentMethod: 'bank_transfer', selectedBankAccount: '' });
      fetchData();
    } catch (error) {
      console.error('Error recording capital:', error);
      toast.error(t('Failed to record capital', 'Failed to record capital'));
    } finally {
      setCapitalSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const totals = calculateTotals();

  return (
    <div className="container-fluid py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('Journal Entries', 'Journal Entries')}</h1>
          <p className="text-muted-foreground">
            {t('Create and manage manual journal entries', 'Create and manage manual journal entries')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('Refresh', 'Refresh')}
          </Button>
          <Button variant="outline" onClick={() => setShowCapitalDialog(true)}>
            <DollarSign className="h-4 w-4 mr-2" />
            {t('Record Capital', 'Record Capital')}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('New Entry', 'New Entry')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Journal Entries List', 'Journal Entries List')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('No journal entries found', 'No journal entries found')}</p>
              <Button variant="link" onClick={() => setShowCreateDialog(true)}>
                {t('Create your first journal entry', 'Create your first journal entry')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Entry #', 'Entry #')}</TableHead>
                  <TableHead>{t('Date', 'Date')}</TableHead>
                  <TableHead>{t('Description', 'Description')}</TableHead>
                  <TableHead>{t('Reference', 'Reference')}</TableHead>
                  <TableHead className="text-right">{t('Debit', 'Debit')}</TableHead>
                  <TableHead className="text-right">{t('Credit', 'Credit')}</TableHead>
                  <TableHead className="text-center">{t('Status', 'Status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell className="font-medium">{entry.entryNumber}</TableCell>
                    <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{entry.reference || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.totalDebit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.totalCredit)}</TableCell>
                    <TableCell className="text-center">
                      {entry.status === 'posted' ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          {t('Posted', 'Posted')}
                        </span>
                      ) : entry.status === 'voided' ? (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          {t('Voided', 'Voided')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-600">
                          <FileText className="h-4 w-4" />
                          {t('Draft', 'Draft')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Journal Entry Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Create Journal Entry', 'Create Journal Entry')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Header Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('Date', 'Date')} *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('Reference', 'Reference')}</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder={t('e.g. INV-001', 'e.g. INV-001')}
                />
              </div>
            </div>
            
            <div>
              <Label>{t('Description', 'Description')} *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('e.g. Monthly rent payment', 'e.g. Monthly rent payment')}
              />
            </div>

            {/* Journal Entry Lines */}
            <div>
              <Label>{t('Journal Entry Lines', 'Journal Entry Lines')} *</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">{t('Account', 'Account')}</TableHead>
                    <TableHead className="w-1/3">{t('Description', 'Description')}</TableHead>
                    <TableHead className="text-right">{t('Debit', 'Debit')}</TableHead>
                    <TableHead className="text-right">{t('Credit', 'Credit')}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={line.accountCode}
                          onValueChange={(value) => handleLineChange(index, 'accountCode', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('Select account', 'Select account')} />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.code} value={account.code}>
                                {account.code} - {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                          placeholder={t('Line description', 'Line description')}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit || ''}
                          onChange={(e) => handleLineChange(index, 'debit', parseFloat(e.target.value) || 0)}
                          className="text-right"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit || ''}
                          onChange={(e) => handleLineChange(index, 'credit', parseFloat(e.target.value) || 0)}
                          className="text-right"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        {lines.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLine(index)}
                            disabled={lines.length <= 2}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <Button variant="outline" onClick={handleAddLine} className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                {t('Add Line', 'Add Line')}
              </Button>
            </div>

            {/* Totals */}
            <div className="flex justify-end gap-8 p-4 bg-muted rounded-lg">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('Total Debit', 'Total Debit')}</p>
                <p className={`text-xl font-bold ${isBalanced() ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.totalDebit)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('Total Credit', 'Total Credit')}</p>
                <p className={`text-xl font-bold ${isBalanced() ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totals.totalCredit)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('Difference', 'Difference')}</p>
                <p className={`text-xl font-bold ${Math.abs(totals.totalDebit - totals.totalCredit) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}
                </p>
              </div>
            </div>

            {/* Balance Status */}
            {!isBalanced() && totals.totalDebit > 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                <XCircle className="h-5 w-5" />
                <span>{t('Journal entry must have equal debits and credits', 'Journal entry must have equal debits and credits')}</span>
              </div>
            )}

            {isBalanced() && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span>{t('Journal entry is balanced', 'Journal entry is balanced')}</span>
              </div>
            )}

            <div>
              <Label>{t('Notes', 'Notes')}</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('Additional notes (optional)', 'Additional notes (optional)')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              <X className="h-4 w-4 mr-2" />
              {t('Cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !isBalanced()}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('Saving...', 'Saving...') : t('Save Entry', 'Save Entry')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Capital Entry Dialog */}
      <Dialog open={showCapitalDialog} onOpenChange={(open) => { setShowCapitalDialog(open); if (open) fetchBankAccounts(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('Record Capital Investment', 'Record Capital Investment')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>{t('Capital Type', 'Capital Type')}</Label>
              <Select
                value={capitalData.capitalType}
                onValueChange={(value) => setCapitalData({ ...capitalData, capitalType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {t("Owner's Capital", "Owner's Capital")}
                    </div>
                  </SelectItem>
                  <SelectItem value="share">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t('Share Capital', 'Share Capital')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('Amount', 'Amount')} *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={capitalData.amount || ''}
                onChange={(e) => setCapitalData({ ...capitalData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>{t('Payment Method', 'Payment Method')}</Label>
              <Select
                value={capitalData.paymentMethod}
                onValueChange={(value) => setCapitalData({ ...capitalData, paymentMethod: value, selectedBankAccount: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">
                    <div className="flex items-center gap-2">
                      {t('Bank Transfer', 'Bank Transfer')}
                    </div>
                  </SelectItem>
                  <SelectItem value="cheque">
                    <div className="flex items-center gap-2">
                      {t('Cheque', 'Cheque')}
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile_money">
                    <div className="flex items-center gap-2">
                      {t('Mobile Money', 'Mobile Money')}
                    </div>
                  </SelectItem>
                  <SelectItem value="cash">
                    <div className="flex items-center gap-2">
                      {t('Cash in Hand', 'Cash in Hand')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bank/MOMO Account Selection - Show based on payment method */}
            {(capitalData.paymentMethod === 'bank_transfer' || capitalData.paymentMethod === 'cheque' || capitalData.paymentMethod === 'mobile_money') && (
              <div>
                <Label>
                  {capitalData.paymentMethod === 'mobile_money' ? t('Select MOMO Account', 'Select MOMO Account') : t('Select Bank Account', 'Select Bank Account')} *
                </Label>
                {loadingBankAccounts ? (
                  <div className="flex items-center gap-2 p-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t('Loading accounts...', 'Loading accounts...')}
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <div className="p-2 text-red-600 text-sm bg-red-50 rounded">
                    No bank accounts found. Please create a bank account first in Bank Accounts page.
                  </div>
                ) : filteredBankAccounts.length === 0 ? (
                  <div className="p-2 text-amber-600 text-sm bg-amber-50 rounded">
                    {capitalData.paymentMethod === 'mobile_money' 
                      ? t('No MOMO accounts found. Please create one in Bank Accounts page.', 'No MOMO accounts found. Please create one in Bank Accounts page.')
                      : t('No bank accounts found. Please create one in Bank Accounts page.', 'No bank accounts found. Please create one in Bank Accounts page.')
                    }
                    <div className="text-xs text-gray-500 mt-1">Debug: {bankAccounts.length} total accounts, 0 match filter</div>
                  </div>
                ) : (
                  <Select
                    value={capitalData.selectedBankAccount}
                    onValueChange={(value) => setCapitalData({ ...capitalData, selectedBankAccount: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select account', 'Select account')} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredBankAccounts.map((account: any) => (
                        <SelectItem key={account._id} value={account._id}>
                          <div className="flex flex-col">
                            <span>{account.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {account.bankName || account.accountType} {account.accountNumber && `- ${account.accountNumber}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div>
              <Label>{t('Description', 'Description')}</Label>
              <Input
                value={capitalData.description}
                onChange={(e) => setCapitalData({ ...capitalData, description: e.target.value })}
                placeholder={t('e.g. Initial capital contribution', 'e.g. Initial capital contribution')}
              />
            </div>

            <div>
              <Label>{t('Reference', 'Reference')}</Label>
              <Input
                value={capitalData.reference}
                onChange={(e) => setCapitalData({ ...capitalData, reference: e.target.value })}
                placeholder={t('e.g. Bank receipt number', 'e.g. Bank receipt number')}
              />
            </div>

            {capitalData.amount > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{t('Journal Entry Preview', 'Journal Entry Preview')}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t('Debit', 'Debit')}:</span>
                    <span>
                      {capitalData.paymentMethod === 'cash' ? '1000 - Cash in Hand' : 
                       selectedBankAccountDetails ? `${selectedBankAccountDetails.accountCode || getGLAccountCode()} - ${selectedBankAccountDetails.name}` :
                       capitalData.paymentMethod === 'mobile_money' ? '1200 - MTN MoMo' : 
                       '1100 - Cash at Bank'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('Credit', 'Credit')}:</span>
                    <span>{capitalData.capitalType === 'owner' ? '3005' : '3000'} - {capitalData.capitalType === 'owner' ? t("Owner's Capital", "Owner's Capital") : t('Share Capital', 'Share Capital')}</span>
                  </div>
                  <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                    <span>{t('Amount', 'Amount')}:</span>
                    <span>{new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(capitalData.amount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCapitalDialog(false); setCapitalData({ capitalType: 'owner', amount: 0, description: '', reference: '', paymentMethod: 'bank_transfer', selectedBankAccount: '' }); }}>
              <X className="h-4 w-4 mr-2" />
              {t('Cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={handleCapitalSubmit} 
              disabled={capitalSaving || capitalData.amount <= 0 || !capitalData.description || ((capitalData.paymentMethod === 'bank_transfer' || capitalData.paymentMethod === 'cheque' || capitalData.paymentMethod === 'mobile_money') && !capitalData.selectedBankAccount)}
            >
              <Save className="h-4 w-4 mr-2" />
              {capitalSaving ? t('Saving...', 'Saving...') : t('Record Capital', 'Record Capital')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
