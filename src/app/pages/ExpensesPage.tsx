import React, { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';

// Type definition
interface ExpenseData {
  _id: string;
  type: string;
  description?: string;
  amount: number;
  expenseDate: string;
  status: string;
  paid: boolean;
  paymentMethod: string;
}

const EXPENSE_TYPES = [
  { value: 'salaries_wages', label: 'Salaries & Wages' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'transport_delivery', label: 'Transport & Delivery' },
  { value: 'marketing_advertising', label: 'Marketing & Advertising' },
  { value: 'other_expense', label: 'Other Expense' },
  { value: 'interest_income', label: 'Interest Income' },
  { value: 'other_income', label: 'Other Income' },
];

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    type: 'other_expense',
    description: '',
    amount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    notes: '',
    paid: false
  });

  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethodUpdate, setPaymentMethodUpdate] = useState('cash');
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token') || '';
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (typeFilter) params.set('type', typeFilter);
      
      const res = await fetch(`${API_URL}/expenses?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await res.json();
      
      if (data.success && data.data) {
        setExpenses(data.data);
      } else {
        setExpenses([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [typeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setShowForm(false);
        setFormData({
          type: 'other_expense',
          description: '',
          amount: 0,
          expenseDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          notes: '',
          paid: false
        });
        loadExpenses();
      } else {
        alert(data.message || 'Failed');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedExpense) return;
    try {
      setUpdatingPayment(true);
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/expenses/${selectedExpense._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paid: true, paymentMethod: paymentMethodUpdate }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setShowPaymentDialog(false);
        setSelectedExpense(null);
        loadExpenses();
      } else {
        alert(data.message || 'Failed to mark as paid');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setUpdatingPayment(false);
    }
  };

  const openPaymentDialog = (expense: ExpenseData) => {
    setSelectedExpense(expense);
    setPaymentMethodUpdate(expense.paymentMethod || 'cash');
    setShowPaymentDialog(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getTypeLabel = (type: string) => {
    const found = EXPENSE_TYPES.find(t => t.value === type);
    return found ? found.label : type || 'Unknown';
  };

  const totals = expenses.reduce((acc, exp) => {
    const isExpense = ['salaries_wages', 'rent', 'utilities', 'transport_delivery', 'marketing_advertising', 'other_expense'].includes(exp.type);
    if (isExpense) acc.operating += exp.amount;
    else acc.other += exp.amount;
    return acc;
  }, { operating: 0, other: 0 });

  const filtered = expenses.filter(exp => {
    const term = searchTerm.toLowerCase();
    return !term || 
      (exp.description || '').toLowerCase().includes(term) || 
      exp.type.toLowerCase().includes(term);
  });

  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Expenses</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            <span className="mr-2">+</span> Add Expense
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            {error}
            <button onClick={loadExpenses} className="ml-3 underline">Retry</button>
          </div>
        )}

        {showForm && (
          <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Expense</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {EXPENSE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={e => setFormData({...formData, expenseDate: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
                <div className="flex items-center h-full">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.paid}
                      onChange={e => setFormData({...formData, paid: e.target.checked})}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Mark as Paid</span>
                  </label>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (!open) setSelectedExpense(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark Expense as Paid</DialogTitle>
            </DialogHeader>
            {selectedExpense && (
              <div className="py-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-medium">Amount:</span> {formatCurrency(selectedExpense.amount)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <span className="font-medium">Description:</span> {selectedExpense.description || getTypeLabel(selectedExpense.type)}
                </p>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethodUpdate}
                  onChange={e => setPaymentMethodUpdate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>
            )}
            <DialogFooter className="sm:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentDialog(false);
                  setSelectedExpense(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkAsPaid}
                disabled={updatingPayment}
                className="bg-green-600 hover:bg-green-700"
              >
                {updatingPayment ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Expenses</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.operating)}</div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Other Income</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(Math.abs(totals.other))}</div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Records</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{expenses.length}</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {EXPENSE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Payment</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No expenses found</td>
                </tr>
              ) : (
                filtered.map(exp => (
                  <tr key={exp._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {getTypeLabel(exp.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{exp.description || '-'}</td>
                    <td className={`px-4 py-3 font-medium ${['interest_income', 'other_income'].includes(exp.type) ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {exp.paid ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!exp.paid && (
                        <button
                          onClick={() => openPaymentDialog(exp)}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default ExpensesPage;
