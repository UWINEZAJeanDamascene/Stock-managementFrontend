import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layout } from '../layout/Layout';
import { payablesApi } from '@/lib/api';

// Type definitions
interface PayablesSummary {
  totalPayables: number;
  totalPayablesCount: number;
  overduePayables: number;
  overduePayablesCount: number;
  upcomingPayments: number;
  upcomingPaymentsCount: number;
  topSuppliers: Array<{
    supplierName: string;
    supplierCode: string;
    totalBalance: number;
    purchaseCount: number;
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
  bySupplier: Array<{
    supplier: { _id: string; name: string; code: string };
    totalBalance: number;
    current: number;
    '1-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
    purchaseCount: number;
  }>;
}

interface PaymentSchedule {
  _id: string;
  purchase: { _id: string; purchaseNumber: string; grandTotal: number; amountPaid: number; balance: number };
  supplier: { _id: string; name: string; code: string };
  installmentNumber: number;
  scheduledAmount: number;
  scheduledDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paidAmount: number;
  paidDate?: string;
  earlyPaymentDiscount?: {
    applied: boolean;
    discountPercent: number;
    discountAmount: number;
    originalAmount: number;
  };
}

const AccountsPayablePage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PayablesSummary | null>(null);
  const [agingData, setAgingData] = useState<AgingData | null>(null);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, agingRes, schedulesRes] = await Promise.all([
        payablesApi.getPayablesSummary(),
        payablesApi.getPayableAgingReport(),
        payablesApi.getPaymentSchedules()
      ]);

      if (summaryRes?.data) {
        setSummary(summaryRes.data);
      }
      if (agingRes?.data) {
        setAgingData(agingRes.data as AgingData);
      }
      if (schedulesRes?.data) {
        setSchedules(schedulesRes.data as PaymentSchedule[]);
      }
    } catch (error) {
      console.error('Error loading payables data:', error);
    } finally {
      setLoading(false);
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

  // Safely resolve translation keys that may be objects (e.g. "suppliers": { title: 'Suppliers', ... })
  const resolveLabel = (key: string) => {
    const res: any = t(key as any);
    if (res == null) return key;
    if (typeof res === 'object') {
      // try nested title key
      const title = t(`${key}.title` as any);
      if (title && typeof title === 'string') return title;
      // fallback to object's title prop if present
      if ('title' in res && typeof res.title === 'string') return res.title;
      // final fallback: capitalize key
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
    return res;
  };

  // Explicit tab label mapping to avoid accidental object translations
  const getTabLabel = (tab: string) => {
    // Prefer explicit suppliersTab key when available
    if (tab === 'suppliers') {
      const explicit = t('suppliersTab' as any);
      if (typeof explicit === 'string' && explicit !== 'suppliersTab') return explicit;
      const pagetitle = t('pages.suppliers.title' as any);
      if (typeof pagetitle === 'string' && pagetitle !== 'pages.suppliers.title') return pagetitle;
      const s = t('suppliers.title' as any);
      if (typeof s === 'string' && s !== 'suppliers.title') return s;
      return 'Suppliers';
    }
    if (tab === 'aging') return t('Aging Report');
    if (tab === 'summary') return t('Payables Overview');
    if (tab === 'schedules') return t('Schedules') !== 'Schedules' ? t('Schedules') : 'Schedules';
    return tab.charAt(0).toUpperCase() + tab.slice(1);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredSchedules = statusFilter 
    ? schedules.filter(s => s.status === statusFilter)
    : schedules;

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
              {t('Accounts Payable')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {t('Track money you owe suppliers')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
            >
              {t('Refresh')}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('Total Payables')}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary?.totalPayables || 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {summary?.totalPayablesCount || 0} purchases
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('Overdue')}</div>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(summary?.overduePayables || 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {summary?.overduePayablesCount || 0} {t('overdue')}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('Upcoming (7 days)')}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary?.upcomingPayments || 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {summary?.upcomingPaymentsCount || 0} {t('payments due')}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('Top Supplier')}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {summary?.topSuppliers?.[0]?.supplierName || '-'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatCurrency(summary?.topSuppliers?.[0]?.totalBalance || 0)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4">
            {['summary', 'aging', 'schedules', 'suppliers'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {getTabLabel(tab)}
              </button>
            ))}
          </nav>
        </div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('Payables Overview')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-sm text-green-600 dark:text-green-400">{t('Current')}</div>
                <div className="text-xl font-bold">{formatCurrency(agingData?.summary?.current || 0)}</div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-sm text-yellow-600 dark:text-yellow-400">1-30 {t('days')}</div>
                <div className="text-xl font-bold">{formatCurrency(agingData?.summary?.['1-30'] || 0)}</div>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-sm text-orange-600 dark:text-orange-400">31-60 {t('days')}</div>
                <div className="text-xl font-bold">{formatCurrency(agingData?.summary?.['31-60'] || 0)}</div>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-sm text-red-600 dark:text-red-400">61-90 {t('days')}</div>
                <div className="text-xl font-bold">{formatCurrency(agingData?.summary?.['61-90'] || 0)}</div>
              </div>
              <div className="p-4 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <div className="text-sm text-red-700 dark:text-red-300">90+ {t('days')}</div>
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Supplier</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">{t('Current')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">1-30</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">31-60</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">61-90</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">90+</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">{t('Total')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {agingData?.bySupplier?.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{item.supplier?.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.supplier?.code}</div>
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

        {/* Payment Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              >
                <option value="">{t('All Statuses')}</option>
                <option value="pending">{t('Pending')}</option>
                <option value="paid">{t('Paid')}</option>
                <option value="overdue">{t('Overdue')}</option>
              </select>
            </div>

            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Supplier</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">{t('Purchase #')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">{t('Installment')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">{t('Amount')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">{t('Due Date')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">{t('Status')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">{t('Discount')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        {t('No payment schedules found')}
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((schedule) => (
                      <tr key={schedule._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {schedule.supplier?.name}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {schedule.purchase?.purchaseNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          #{schedule.installmentNumber}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                          {formatCurrency(schedule.scheduledAmount)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {formatDate(schedule.scheduledDate)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(schedule.status)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {schedule.earlyPaymentDiscount?.discountPercent ? (
                            <span className="text-green-600 dark:text-green-400">
                              {schedule.earlyPaymentDiscount.discountPercent}% {t('discount')}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* By Supplier Tab */}
        {activeTab === 'suppliers' && (
          <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Supplier</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">{t('Code')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">{t('Purchases')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">{t('Balance')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {summary?.topSuppliers?.map((supplier, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {supplier.supplierName}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {supplier.supplierCode}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      {supplier.purchaseCount}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                      {formatCurrency(supplier.totalBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AccountsPayablePage;
