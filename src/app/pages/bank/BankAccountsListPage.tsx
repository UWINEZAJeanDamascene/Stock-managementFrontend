import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { bankAccountsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Eye,
  Edit,
  RefreshCw,
  Loader2,
  Building2,
  Search,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';

import { Label } from '@/app/components/ui/label';
import { useTranslation } from 'react-i18next';

interface BankAccount {
  _id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  accountType: 'bk_bank' | 'equity_bank' | 'im_bank' | 'cogebanque' | 'ecobank' | 'mtn_momo' | 'airtel_money' | 'cash_in_hand';
  currencyCode: string;
  openingBalance: number;
  cachedBalance: number;
  isDefault: boolean;
  isPrimary?: boolean;
  isActive: boolean;
  color?: string;
}

export default function BankAccountsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isCreateMode = location.pathname === '/bank-accounts/new';
  const isEditMode = location.pathname.match(/\/bank-accounts\/[^/]+\/edit$/)?.[0] === location.pathname;
  const editAccountId = isEditMode ? location.pathname.split('/')[2] : null;
  const [loading, setLoading] = useState(!isCreateMode);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showForm, setShowForm] = useState(isCreateMode || isEditMode);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === 'active') params.isActive = true;
      if (filter === 'inactive') params.isActive = false;

      const response = await bankAccountsApi.getAll(params);
      console.log('[BankAccountsListPage] API Response:', response);

      if (response.success) {
        setAccounts(response.data as any[]);
      }
    } catch (error) {
      console.error('[BankAccountsListPage] Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // Handle edit mode - fetch account data
    if (isEditMode && editAccountId) {
      console.log('[BankAccountsListPage] Fetching account for edit:', editAccountId);
      setLoading(true);
      bankAccountsApi.getById(editAccountId)
        .then((response) => {
          if (response.success && response.data) {
            const account = response.data as any;
            setEditingAccount(account);
            setFormData({
              name: account.name || '',
              accountNumber: account.accountNumber || '',
              bankName: account.bankName || '',
              accountType: account.accountType || 'bk_bank',
              currencyCode: account.currencyCode || 'USD',
              openingBalance: String(account.openingBalance || '0'),
              isDefault: account.isDefault || false,
              isActive: account.isActive !== false,
            });
          }
        })
        .catch((err) => console.error('Failed to fetch account:', err))
        .finally(() => setLoading(false));
      return;
    }
    if (!isCreateMode) {
      console.log('[BankAccountsListPage] Fetching accounts...');
      fetchAccounts();
    }
  }, [fetchAccounts, isCreateMode, isEditMode, editAccountId]);

  console.log('[BankAccountsListPage] Render - accounts:', accounts.length, 'loading:', loading);

  const formatCurrency = (amount: any, currency: string = 'USD') => {
    if (amount === null || amount === undefined || amount === '') return '-';
    // Handle MongoDB Decimal128 or regular numbers/strings
    let num: number;
    if (typeof amount === 'object') {
      // Check for MongoDB Decimal128 format: { "$numberDecimal": "123.45" }
      if (amount.$numberDecimal) {
        num = parseFloat(amount.$numberDecimal);
      } else if (amount.toString && typeof amount.toString === 'function') {
        // Try toString but handle [object Object] case
        const str = amount.toString();
        if (str === '[object Object]') {
          return '-'; // Cannot parse this object
        }
        num = parseFloat(str);
      } else {
        return '-';
      }
    } else if (typeof amount === 'string') {
      num = parseFloat(amount);
    } else {
      num = amount;
    }
    if (isNaN(num)) return '-';
    // Map currency codes to valid ISO 4217 codes
    const currencyMap: Record<string, string> = {
      'RWF': 'RWF',
      'USD': 'USD',
      'EUR': 'EUR',
      'GBP': 'GBP',
    };
    const validCurrency = currencyMap[currency] || 'USD';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: validCurrency }).format(num);
    } catch (e) {
      return `${validCurrency} ${num.toFixed(2)}`;
    }
  };

  const filteredAccounts = accounts.filter((account) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      account.name.toLowerCase().includes(query) ||
      account.accountNumber.toLowerCase().includes(query) ||
      account.bankName.toLowerCase().includes(query)
    );
  });

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bank: t('bankAccount.type.bank', 'Bank Account'),
      cash: t('bankAccount.type.cash', 'Cash'),
      mobile_money: t('bankAccount.type.mobileMoney', 'Mobile Money'),
      petty_cash: t('bankAccount.type.pettyCash', 'Petty Cash'),
    };
    return labels[type] || type;
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    accountNumber: '',
    bankName: '',
    accountType: 'bk_bank',
    currencyCode: 'USD',
    openingBalance: '0',
    isDefault: false,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Log form data for debugging
      console.log('[BankAccountsListPage] Current formData:', formData);
      
      // Prepare data - convert openingBalance to number, but exclude it from updates (backend rule)
      const { openingBalance, ...updateDataWithoutOpeningBalance } = formData;
      
      const submitData = {
        ...updateDataWithoutOpeningBalance,
        openingBalance: parseFloat(formData.openingBalance) || 0,
      };
      
      console.log('[BankAccountsListPage] Submit data before cleanup:', submitData);
      
      let response;
      if (isEditMode && editAccountId) {
        // For updates, remove openingBalance entirely per backend rules
        const { openingBalance: ob, ...updateData } = submitData;
        console.log('[BankAccountsListPage] Updating account:', editAccountId, updateData);
        response = await bankAccountsApi.update(editAccountId, updateData as any);
      } else {
        console.log('[BankAccountsListPage] Creating account:', submitData);
        // Create new account - include openingBalance
        response = await bankAccountsApi.create(submitData as any);
      }
      console.log('[BankAccountsListPage] Save response:', response);
      if (response.success) {
        navigate('/bank-accounts');
      } else {
        alert((response as any).message || 'Failed to save account');
      }
    } catch (error) {
      console.error('[BankAccountsListPage] Failed to save account:', error);
      alert('Failed to save account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isCreateMode || isEditMode) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/bank-accounts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back', 'Back')}
            </Button>
            <h1 className="text-2xl font-bold">{isEditMode ? t('bankAccounts.editAccount.title', 'Edit Bank Account') : t('bankAccounts.addAccount.title', 'Add Bank Account')}</h1>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('bankAccounts.addAccount.description', 'Create a new bank or cash account')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('bankAccounts.addAccount.name', 'Account Name')} *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder={t('bankAccounts.addAccount.namePlaceholder', 'e.g., Business Account')}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">{t('bankAccounts.accountNumber', 'Account Number')} *</Label>
                        <Input
                          id="accountNumber"
                          value={formData.accountNumber}
                          onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                          placeholder={t('bankAccounts.addAccount.accountNumberPlaceholder', 'e.g., 1234567890')}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">{t('bankAccounts.addAccount.bankName', 'Bank Name')}</Label>
                        <Input
                          id="bankName"
                          value={formData.bankName}
                          onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                          placeholder={t('bankAccounts.addAccount.bankNamePlaceholder', 'e.g., BK Bank')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountType">{t('bankAccounts.addAccount.type', 'Account Type')}</Label>
                        <Select value={formData.accountType} onValueChange={(v) => setFormData({...formData, accountType: v})}>
                          <SelectTrigger id="accountType">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bk_bank">{t('bankAccounts.accountTypes.bk_bank', 'BK Bank')}</SelectItem>
                            <SelectItem value="equity_bank">{t('bankAccounts.accountTypes.equity_bank', 'Equity Bank')}</SelectItem>
                            <SelectItem value="im_bank">{t('bankAccounts.accountTypes.im_bank', 'I&M Bank')}</SelectItem>
                            <SelectItem value="cogebanque">{t('bankAccounts.accountTypes.cogebanque', 'Cogebanque')}</SelectItem>
                            <SelectItem value="ecobank">{t('bankAccounts.accountTypes.ecobank', 'Ecobank')}</SelectItem>
                            <SelectItem value="mtn_momo">{t('bankAccounts.accountTypes.mtn_momo', 'MTN MoMo')}</SelectItem>
                            <SelectItem value="airtel_money">{t('bankAccounts.accountTypes.airtel_money', 'Airtel Money')}</SelectItem>
                            <SelectItem value="cash_in_hand">{t('bankAccounts.accountTypes.cash_in_hand', 'Cash in Hand')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">{t('bankAccounts.currentBalance', 'Currency')}</Label>
                        <Select value={formData.currencyCode} onValueChange={(v) => setFormData({...formData, currencyCode: v})}>
                          <SelectTrigger id="currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="RWF">RWF - Rwandan Franc</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="openingBalance">{t('bankAccounts.addAccount.openingBalance', 'Opening Balance')}</Label>
                        <Input
                          id="openingBalance"
                          type="number"
                          step="0.01"
                          value={formData.openingBalance}
                          onChange={(e) => setFormData({...formData, openingBalance: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="isDefault" className="text-sm font-normal">
                        {t('bankAccounts.addAccount.isPrimary', 'Set as Primary Account')}
                      </Label>
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('common.saving', 'Saving...')}</>
                        ) : (
                          <><Plus className="mr-2 h-4 w-4" />{t('common.save', 'Save')}</>
                        )}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => navigate('/bank-accounts')}>
                        {t('common.cancel', 'Cancel')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{t('bankAccounts.help', 'Help')}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-4">
                  <p>
                    A bank account represents any financial account you use to track money.
                    This can include physical bank accounts, mobile money accounts, or cash on hand.
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium">Account Types:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Bank Account</strong> - Traditional bank accounts</li>
                      <li><strong>Cash</strong> - Physical cash on hand</li>
                      <li><strong>Mobile Money</strong> - Mobile money wallets</li>
                      <li><strong>Petty Cash</strong> - Small cash reserves</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <TooltipProvider>
      <Layout>
        <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('bankAccount.title', 'Bank Accounts')}</h1>
            <p className="text-muted-foreground">{t('bankAccount.description', 'Manage your bank accounts')}</p>
          </div>
          <Button onClick={() => {
            if (isCreateMode) {
              // Form is already showing
            } else {
              navigate('/bank-accounts/new');
            }
          }}>
            <Plus className="mr-2 h-4 w-4" />
            {isEditMode ? t('common.save', 'Save Changes') : (isCreateMode ? t('bankAccounts.addAccount.title', 'Add Account') : t('bankAccounts.actions.addAccount', 'Create Bank Account'))}
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('bankAccount.search', 'Search')}</label>
              <Input
                placeholder={t('bankAccount.searchPlaceholder', 'Search accounts...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('bankAccount.filter', 'Filter')}</label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('bankAccount.allAccounts', 'All Accounts')}</SelectItem>
                  <SelectItem value="active">{t('bankAccount.active', 'Active')}</SelectItem>
                  <SelectItem value="inactive">{t('bankAccount.inactive', 'Inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={fetchAccounts}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.refresh', 'Refresh')}
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('bankAccount.name', 'Name')}</TableHead>
                  <TableHead>{t('bankAccount.accountNumber', 'Account Number')}</TableHead>
                  <TableHead>{t('bankAccount.bank', 'Bank')}</TableHead>
                  <TableHead>{t('bankAccount.currency', 'Currency')}</TableHead>
                  <TableHead>{t('bankAccount.type', 'Type')}</TableHead>
                  <TableHead>{t('bankAccount.balance', 'Current Balance')}</TableHead>
                  <TableHead>{t('bankAccount.status', 'Status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('bankAccount.noAccounts', 'No bank accounts found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAccounts.map((account) => (
                    <TableRow key={account._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {account.name}
                          {account.isPrimary && (
                            <Badge variant="secondary">{t('bankAccount.default', 'Default')}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{account.accountNumber || '-'}</TableCell>
                      <TableCell>{account.bankName || '-'}</TableCell>
                      <TableCell>{account.currencyCode || 'USD'}</TableCell>
                      <TableCell>{getAccountTypeLabel(account.accountType)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(account.cachedBalance || account.openingBalance || 0, account.currencyCode || 'USD')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.isActive ? 'default' : 'secondary'}>
                          {account.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/bank-accounts/${account._id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('common.view', 'View')}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/bank-accounts/${account._id}?tab=reconciliation`)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('bankAccounts.actions.reconcile', 'Reconcile')}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/bank-accounts/${account._id}/edit`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('common.edit', 'Edit')}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm(t('bankAccounts.confirmations.deleteAccount', 'Are you sure you want to delete this bank account?'))) {
                                    bankAccountsApi.delete(account._id).then(() => {
                                      fetchAccounts();
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('common.delete', 'Delete')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </Layout>
    </TooltipProvider>
  );
}
