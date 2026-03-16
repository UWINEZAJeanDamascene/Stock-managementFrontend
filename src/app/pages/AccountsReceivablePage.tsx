import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../layout/Layout';
import { receivablesApi, clientsApi } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Checkbox } from '@/app/components/ui/checkbox';

// Type definitions
interface ReceivablesSummary {
  totalReceivables: number;
  totalReceivablesCount: number;
  overdueReceivables: number;
  overdueReceivablesCount: number;
  badDebt: number;
  badDebtCount: number;
  topClients: Array<{
    clientName: string;
    clientCode: string;
    totalBalance: number;
    invoiceCount: number;
  }>;
}

interface AgingData {
  asOfDate: string;
  summary: {
    current: number;
    '1-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
    total: number;
  };
  byClient: Array<{
    client: { _id: string; name: string; code: string };
    totalBalance: number;
    current: number;
    '1-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
    invoiceCount: number;
  }>;
}

interface BadDebtInvoice {
  _id: string;
  invoiceNumber: string;
  client: { _id: string; name: string; code: string };
  roundedAmount: number;
  amountPaid: number;
  balance: number;
  invoiceDate: string;
  badDebtReason?: string;
  writtenOffAt?: string;
}

interface Client {
  _id: string;
  name: string;
  code: string;
  clientName?: string;
  clientCode?: string;
}

interface SelectableInvoice {
  _id: string;
  invoiceNumber: string;
  balance: number;
  invoiceDate: string;
}

const AccountsReceivablePage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null);
  const [agingData, setAgingData] = useState<AgingData | null>(null);
  const [badDebts, setBadDebts] = useState<BadDebtInvoice[]>([]);
  const [activeTab, setActiveTab] = useState('summary');

  // Bad debt write-off modal
  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientInvoices, setClientInvoices] = useState<SelectableInvoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [writeOffReason, setWriteOffReason] = useState('');
  const [writeOffNotes, setWriteOffNotes] = useState('');
  const [writingOff, setWritingOff] = useState(false);

  // Reverse bad debt modal
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reversingInvoice, setReversingInvoice] = useState<BadDebtInvoice | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);

  // Client statement modal
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementClient, setStatementClient] = useState<Client | null>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  useEffect(() => {
    loadData();
    loadClients();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, agingRes, badDebtsRes] = await Promise.all([
        receivablesApi.getReceivablesSummary(),
        receivablesApi.getReceivableAgingReport(),
        receivablesApi.getBadDebts()
      ]);

      if (summaryRes?.data) {
        setSummary(summaryRes.data);
      }
      if (agingRes?.data) {
        setAgingData(agingRes.data as AgingData);
      }
      if (badDebtsRes?.data) {
        setBadDebts(badDebtsRes.data.invoices as BadDebtInvoice[]);
      }
    } catch (error) {
      console.error('Error loading receivables data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const res = await clientsApi.getAll();
      if (res?.data) {
        // Handle both array and object response
        const clientsArray = Array.isArray(res.data) ? res.data : (res.data as any).clients || [];
        setClients(clientsArray);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const handleClientChange = async (clientId: string) => {
    const client = clients.find(c => c._id === clientId);
    setSelectedClient(client || null);
    setSelectedInvoices([]);
    
    if (clientId) {
      try {
        const res = await receivablesApi.getClientStatement(clientId);
        if (res?.data) {
          // Filter invoices with balance > 0
          const unpaidInvoices = res.data.invoices?.filter(
            (inv: SelectableInvoice) => inv.balance > 0
          ) || [];
          setClientInvoices(unpaidInvoices);
        }
      } catch (error) {
        console.error('Error loading client statement:', error);
        setClientInvoices([]);
      }
    } else {
      setClientInvoices([]);
    }
  };

  const handleWriteOff = async () => {
    if (!selectedClient || selectedInvoices.length === 0) return;

    setWritingOff(true);
    try {
      await receivablesApi.writeOffBadDebt(selectedClient._id, {
        invoiceIds: selectedInvoices,
        reason: writeOffReason,
        notes: writeOffNotes
      });
      
      // Reset modal and reload data
      setShowWriteOffModal(false);
      setSelectedClient(null);
      setSelectedInvoices([]);
      setWriteOffReason('');
      setWriteOffNotes('');
      await loadData();
    } catch (error) {
      console.error('Error writing off bad debt:', error);
    } finally {
      setWritingOff(false);
    }
  };

  const handleReverseBadDebt = async () => {
    if (!reversingInvoice) return;

    setReversing(true);
    try {
      await receivablesApi.reverseBadDebt(reversingInvoice._id, {
        reason: reverseReason
      });
      
      // Reset modal and reload data
      setShowReverseModal(false);
      setReversingInvoice(null);
      setReverseReason('');
      await loadData();
    } catch (error) {
      console.error('Error reversing bad debt:', error);
    } finally {
      setReversing(false);
    }
  };

  const handleViewStatement = async (client: Client) => {
    setStatementClient(client);
    setShowStatementModal(true);
    setLoadingStatement(true);
    
    try {
      const res = await receivablesApi.getClientStatement(client._id);
      if (res?.data) {
        setStatementData(res.data);
      }
    } catch (error) {
      console.error('Error loading statement:', error);
    } finally {
      setLoadingStatement(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Accounts Receivable
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Track money clients owe you
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowWriteOffModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Write Off Bad Debt
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Receivables</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary?.totalReceivables || 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {summary?.totalReceivablesCount || 0} invoices
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Overdue</div>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(summary?.overdueReceivables || 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {summary?.overdueReceivablesCount || 0} overdue
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Bad Debt</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary?.badDebt || 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {summary?.badDebtCount || 0} written off
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Top Client</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {summary?.topClients?.[0]?.clientName || '-'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatCurrency(summary?.topClients?.[0]?.totalBalance || 0)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4">
            {['summary', 'aging', 'bad-debts', 'clients'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'bad-debts' ? 'Bad Debts' : tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Receivables Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-sm text-green-600 dark:text-green-400">Current</div>
                <div className="text-xl font-bold">{formatCurrency(agingData?.summary?.current || 0)}</div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-sm text-yellow-600 dark:text-yellow-400">1-30 days</div>
                <div className="text-xl font-bold">{formatCurrency(agingData?.summary?.['1-30'] || 0)}</div>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-sm text-orange-600 dark:text-orange-400">31-60 days</div>
                <div className="text-xl font-bold">{formatCurrency(agingData?.summary?.['31-60'] || 0)}</div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-sm text-red-600 dark:text-red-400">61-90 days</div>
                <div className="text-xl font-bold">{formatCurrency(agingData?.summary?.['61-90'] || 0)}</div>
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <div className="text-sm text-red-700 dark:text-red-300">90+ days</div>
                <div className="text-xl font-bold">{formatCurrency(agingData?.summary?.['90+'] || 0)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Aging Report Tab */}
        {activeTab === 'aging' && (
          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Client</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Current</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">1-30</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">31-60</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">61-90</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">90+</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {agingData?.byClient?.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{item.client?.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.client?.code}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(item.current)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(item['1-30'])}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(item['31-60'])}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(item['61-90'])}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{formatCurrency(item['90+'])}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(item.totalBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bad Debts Tab */}
        {activeTab === 'bad-debts' && (
          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Paid</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Bad Debt</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {badDebts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No bad debts recorded
                    </td>
                  </tr>
                ) : (
                  badDebts.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {invoice.client?.name}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                        {formatCurrency(invoice.roundedAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                        {formatCurrency(invoice.amountPaid)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(invoice.balance)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setReversingInvoice(invoice);
                            setShowReverseModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          Reverse
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* By Client Tab */}
        {activeTab === 'clients' && (
          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Code</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Invoices</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">Balance</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {summary?.topClients?.map((client, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {client.clientName}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {client.clientCode}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      {client.invoiceCount}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                      {formatCurrency(client.totalBalance)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewStatement({ _id: '', name: client.clientName, code: client.clientCode })}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        View Statement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Write Off Bad Debt Modal */}
        <Dialog open={showWriteOffModal} onOpenChange={setShowWriteOffModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Write Off Bad Debt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Client</Label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                  value={selectedClient?._id || ''}
                  onChange={(e) => handleClientChange(e.target.value)}
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name} ({client.code})
                    </option>
                  ))}
                </select>
              </div>

              {clientInvoices.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Invoices to Write Off</Label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md p-2 space-y-2">
                    {clientInvoices.map((invoice) => (
                      <div key={invoice._id} className="flex items-center gap-2">
                        <Checkbox
                          id={invoice._id}
                          checked={selectedInvoices.includes(invoice._id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedInvoices([...selectedInvoices, invoice._id]);
                            } else {
                              setSelectedInvoices(selectedInvoices.filter(id => id !== invoice._id));
                            }
                          }}
                        />
                        <label
                          htmlFor={invoice._id}
                          className="flex-1 text-sm text-gray-900 dark:text-gray-100 cursor-pointer"
                        >
                          {invoice.invoiceNumber} - {formatCurrency(invoice.balance)}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedInvoices.length > 0 && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      Total to write off: {formatCurrency(
                        clientInvoices
                          .filter(inv => selectedInvoices.includes(inv._id))
                          .reduce((sum, inv) => sum + inv.balance, 0)
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  placeholder="e.g., Client bankruptcy, unable to collect"
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={writeOffNotes}
                  onChange={(e) => setWriteOffNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWriteOffModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleWriteOff}
                disabled={!selectedClient || selectedInvoices.length === 0 || writingOff}
                className="bg-red-600 hover:bg-red-700"
              >
                {writingOff ? 'Writing Off...' : 'Write Off'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reverse Bad Debt Modal */}
        <Dialog open={showReverseModal} onOpenChange={setShowReverseModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reverse Bad Debt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {reversingInvoice && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Invoice</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {reversingInvoice.invoiceNumber}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Amount to restore:</div>
                  <div className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(reversingInvoice.balance)}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Reason for reversal</Label>
                <Textarea
                  placeholder="Explain why this bad debt is being reversed..."
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReverseModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReverseBadDebt}
                disabled={!reverseReason || reversing}
              >
                {reversing ? 'Reversing...' : 'Reverse Bad Debt'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Client Statement Modal */}
        <Dialog open={showStatementModal} onOpenChange={setShowStatementModal}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Client Statement - {(statementClient as any)?.clientName || (statementClient as any)?.name || statementClient?.code}
              </DialogTitle>
            </DialogHeader>
            {loadingStatement ? (
              <div className="py-8 text-center text-gray-500">Loading statement...</div>
            ) : statementData ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-500">Total Invoices</div>
                    <div className="text-lg font-bold">{statementData.summary?.invoiceCount || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Total Paid</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(statementData.summary?.totalPaid || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Balance</div>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(statementData.summary?.totalBalance || 0)}
                    </div>
                  </div>
                </div>

                {/* Aging */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-center">
                    <div className="text-xs">Current</div>
                    <div className="font-bold">{formatCurrency(statementData.aging?.current || 0)}</div>
                  </div>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-center">
                    <div className="text-xs">1-30</div>
                    <div className="font-bold">{formatCurrency(statementData.aging?.['1-30'] || 0)}</div>
                  </div>
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-center">
                    <div className="text-xs">31-60</div>
                    <div className="font-bold">{formatCurrency(statementData.aging?.['31-60'] || 0)}</div>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-center">
                    <div className="text-xs">61-90</div>
                    <div className="font-bold">{formatCurrency(statementData.aging?.['61-90'] || 0)}</div>
                  </div>
                  <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded text-center">
                    <div className="text-xs">90+</div>
                    <div className="font-bold">{formatCurrency(statementData.aging?.['90+'] || 0)}</div>
                  </div>
                </div>

                {/* Invoices Table */}
                <div>
                  <h4 className="font-medium mb-2">Invoices</h4>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-2 py-1 text-left">Invoice #</th>
                        <th className="px-2 py-1 text-left">Date</th>
                        <th className="px-2 py-1 text-left">Due Date</th>
                        <th className="px-2 py-1 text-left">Status</th>
                        <th className="px-2 py-1 text-right">Total</th>
                        <th className="px-2 py-1 text-right">Paid</th>
                        <th className="px-2 py-1 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statementData.invoices?.map((inv: any, idx: number) => (
                        <tr key={idx} className="border-b dark:border-gray-600">
                          <td className="px-2 py-1">{inv.invoiceNumber}</td>
                          <td className="px-2 py-1">{formatDate(inv.invoiceDate)}</td>
                          <td className="px-2 py-1">{formatDate(inv.dueDate)}</td>
                          <td className="px-2 py-1 capitalize">{inv.status}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(inv.total)}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(inv.paid)}</td>
                          <td className="px-2 py-1 text-right font-medium">{formatCurrency(inv.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">No statement data available</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AccountsReceivablePage;
