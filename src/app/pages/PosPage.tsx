import React, { useState, useEffect, useRef } from 'react';
import { Layout } from '../layout/Layout';
import { productsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import BarcodeScanner from '../components/BarcodeScanner';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  RotateCcw,
  Barcode,
  QrCode,
  Users,
  Package
} from 'lucide-react';

type Product = {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  currentStock: number;
  averageCost: number;
  unit: string;
};

interface CartItem {
  product: string;
  name: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

interface Payment {
  amount: number;
  paymentMethod: 'cash' | 'card' | 'mobile_money';
  reference: string;
}

export default function PosPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([{ amount: 0, paymentMethod: 'cash', reference: '' }]);
  const [drawerId, setDrawerId] = useState('POS-1');
  const [showScanner, setShowScanner] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search products
  useEffect(() => {
    const handle = setTimeout(() => {
      if (query.trim().length === 0) return setResults([]);
      productsApi.getAll({ search: query, limit: 20 }).then(r => setResults((r as any).data || [])).catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  // Handle barcode scan
  const handleBarcodeScan = (barcode: string) => {
    setShowScanner(false);
    // Search by barcode
    productsApi.getAll({ search: barcode, limit: 1 }).then(r => {
      const products = (r as any).data || [];
      if (products.length > 0) {
        addToCart(products[0]);
      } else {
        alert('Product not found');
      }
    }).catch(() => setResults([]));
  };

  const addToCart = (p: Product) => {
    setCart(prev => {
      const exist = prev.find(i => i.product === p._id);
      if (exist) {
        return prev.map(i => i.product === p._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        product: p._id, 
        name: p.name, 
        unitPrice: p.averageCost || 0, 
        quantity: 1,
        stock: p.currentStock || 0
      }];
    });
    setQuery('');
    setResults([]);
    searchInputRef.current?.focus();
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter((_, i) => i !== idx));
    } else {
      setCart(prev => prev.map((c, i) => i === idx ? { ...c, quantity: qty } : c));
    }
  };

  const removeItem = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotal = cart.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 0), 0);
  const totalPayment = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const change = totalPayment - subtotal;

  const addPaymentLine = () => setPayments(prev => [...prev, { amount: 0, paymentMethod: 'cash', reference: '' }]);
  const updatePayment = (idx: number, p: Partial<Payment>) => setPayments(prev => prev.map((x, i) => i === idx ? { ...x, ...p } : x));
  const removePayment = (idx: number) => setPayments(prev => prev.filter((_, i) => i !== idx));

  const createSale = async () => {
    if (!token) {
      alert('Please log in to record a sale');
      return;
    }
    
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    const validPayments = payments.filter(p => p.amount > 0);
    if (validPayments.length === 0) {
      alert('Please add at least one payment');
      return;
    }

    if (totalPayment < subtotal) {
      alert('Insufficient payment');
      return;
    }

    const salePayload = {
      items: cart.map(i => ({ product: i.product, quantity: i.quantity, unitPrice: i.unitPrice })),
      payments: validPayments,
      drawerId,
      clientInfo: walkInName ? { name: walkInName } : undefined
    };

    try {
      const res = await fetch(`/api/pos/sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(salePayload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Sale failed');
      }
      
      setLastSale(data.data);
      setShowReceipt(true);
      
      // Clear cart after successful sale
      setCart([]);
      setPayments([{ amount: 0, paymentMethod: 'cash', reference: '' }]);
      setWalkInName('');
    } catch (err: any) {
      console.error('Sale error:', err);
      alert(err.message || 'Failed to record sale');
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setLastSale(null);
  };

  return (
    <Layout>
      <div className="p-3 md:p-4 lg:p-6 pt-14 md:pt-6 lg:pt-6">
        {/* Receipt Modal */}
        {showReceipt && lastSale && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div ref={receiptRef} className="p-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
                <p className="text-slate-500 mb-4">Receipt #{lastSale.invoiceNumber}</p>
                
                <div className="border-t border-b py-4 mb-4 text-left">
                  {lastSale.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm mb-1">
                      <span>{item.description} x{item.quantity}</span>
                      <span>{(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="text-xl font-bold text-right">
                  Total: {lastSale.roundedAmount?.toFixed(2) || subtotal.toFixed(2)}
                </div>
                <div className="text-sm text-slate-500 text-right">
                  Paid: {totalPayment.toFixed(2)} | Change: {(totalPayment - (lastSale.roundedAmount || subtotal)).toFixed(2)}
                </div>
                
                <p className="text-xs text-slate-400 mt-4">Please come again!</p>
              </div>
              
              <div className="flex gap-2 p-4 bg-slate-50">
                <button onClick={printReceipt} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  <Printer className="h-4 w-4" /> Print
                </button>
                <button onClick={closeReceipt} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Point of Sale</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowScanner(!showScanner)}
              className={`p-2 rounded-lg ${showScanner ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              <QrCode className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barcode Scanner */}
        {showScanner && (
          <div className="mb-4 bg-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-medium">Scan Barcode</h3>
              <button onClick={() => setShowScanner(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <BarcodeScanner 
              onStart={() => {}}
              onStop={() => {}}
              onInitError={(err) => console.error('Scanner error:', err)}
              style={{ maxWidth: '400px', margin: '0 auto' }}
            />
            <p className="text-slate-400 text-sm text-center mt-2">Point camera at barcode to scan</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Left Column - Product Search & Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input 
                ref={searchInputRef}
                value={query} 
                onChange={e => setQuery(e.target.value)} 
                placeholder="Search products by name, SKU, or barcode..."
                className="w-full pl-10 pr-4 py-3 text-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Search Results / Product Grid */}
            {query.trim().length > 0 && results.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-3">Search Results</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-auto">
                  {results.map(r => (
                    <button 
                      key={r._id} 
                      onClick={() => addToCart(r)}
                      className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-white truncate">{r.name}</p>
                        <p className="text-xs text-slate-500">SKU: {r.sku} • Stock: {r.currentStock}</p>
                      </div>
                      <Plus className="h-5 w-5 text-indigo-600 ml-2 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800 dark:text-white">Cart</h3>
                  <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs px-2 py-0.5 rounded-full">
                    {cart.length} items
                  </span>
                </div>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
                    <Trash2 className="h-4 w-4" /> Clear
                  </button>
                )}
              </div>
              
              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Cart is empty</p>
                  <p className="text-sm">Search and add products to start a sale</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-80 overflow-auto">
                  {cart.map((c, idx) => (
                    <div key={c.product} className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-white truncate">{c.name}</p>
                        <p className="text-sm text-slate-500">Stock: {c.stock}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => updateQty(idx, c.quantity - 1)}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input 
                          type="number" 
                          value={c.quantity} 
                          onChange={e => updateQty(idx, Number(e.target.value))}
                          className="w-16 text-center p-1 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded"
                          min="1"
                        />
                        <button 
                          onClick={() => updateQty(idx, c.quantity + 1)}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right w-24">
                        <p className="font-semibold text-slate-800 dark:text-white">{(c.unitPrice * c.quantity).toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeItem(idx)} className="p-1 text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Cart Total */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Subtotal</span>
                  <span className="text-indigo-600">{subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payments */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> Payment
                </h3>
                <button onClick={addPaymentLine} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <Plus className="h-4 w-4" /> Add Split Payment
                </button>
              </div>
              
              <div className="space-y-2">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex gap-2 items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex-1">
                      <input 
                        type="number" 
                        value={p.amount} 
                        onChange={e => updatePayment(idx, { amount: Number(e.target.value) })} 
                        placeholder="Amount"
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg"
                      />
                    </div>
                    <select 
                      value={p.paymentMethod} 
                      onChange={e => updatePayment(idx, { paymentMethod: e.target.value as any })}
                      className="p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile_money">Mobile Money</option>
                    </select>
                    <input 
                      placeholder="Reference"
                      value={p.reference} 
                      onChange={e => updatePayment(idx, { reference: e.target.value })} 
                      className="w-32 p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-lg"
                    />
                    {payments.length > 1 && (
                      <button onClick={() => removePayment(idx)} className="p-2 text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-lg font-semibold">
                <span>Total Payment:</span>
                <span className={totalPayment >= subtotal ? 'text-green-600' : 'text-red-600'}>
                  {totalPayment.toFixed(2)}
                </span>
              </div>
              
              {totalPayment >= subtotal && (
                <div className="mt-2 text-right text-green-600 font-medium">
                  Change: {change.toFixed(2)}
                </div>
              )}
            </div>

            {/* Walk-in Customer */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" /> Customer
              </h3>
              <input 
                value={walkInName}
                onChange={e => setWalkInName(e.target.value)}
                placeholder="Walk-in customer name (optional)"
                className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
              />
            </div>

            {/* Complete Sale Button */}
            <button 
              onClick={createSale}
              disabled={cart.length === 0 || totalPayment < subtotal}
              className="w-full py-4 bg-green-600 text-white text-xl font-bold rounded-xl hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-6 w-6" /> Complete Sale
            </button>
          </div>

          {/* Right Column - Drawer & Quick Actions */}
          <div className="space-y-4">
            {/* Cash Drawer */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Cash Drawer</h3>
              <div className="space-y-2">
                <input 
                  value={drawerId}
                  onChange={e => setDrawerId(e.target.value)}
                  placeholder="Drawer ID"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={async () => {
                      try {
                        await fetch(`/api/pos/drawer/open`, { 
                          method: 'POST', 
                          headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, 
                          body: JSON.stringify({ drawerId, openingBalance: 0 }) 
                        });
                        alert('Drawer opened');
                      } catch { alert('Failed to open drawer'); }
                    }}
                    className="py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Open
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await fetch(`/api/pos/drawer/close`, { 
                          method: 'POST', 
                          headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, 
                          body: JSON.stringify({ drawerId, closingBalance: 0 }) 
                        });
                        alert('Drawer closed');
                      } catch { alert('Failed to close drawer'); }
                    }}
                    className="py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => {
                    setPayments([{ amount: subtotal, paymentMethod: 'cash', reference: '' }]);
                  }}
                  disabled={subtotal <= 0}
                  className="py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 flex flex-col items-center"
                >
                  <DollarSign className="h-5 w-5 mb-1" />
                  <span className="text-sm">Cash</span>
                </button>
                <button 
                  onClick={() => {
                    setPayments([{ amount: subtotal, paymentMethod: 'card', reference: '' }]);
                  }}
                  disabled={subtotal <= 0}
                  className="py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 flex flex-col items-center"
                >
                  <CreditCard className="h-5 w-5 mb-1" />
                  <span className="text-sm">Card</span>
                </button>
                <button 
                  onClick={() => {
                    setPayments([{ amount: subtotal, paymentMethod: 'mobile_money', reference: '' }]);
                  }}
                  disabled={subtotal <= 0}
                  className="py-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 flex flex-col items-center"
                >
                  <Smartphone className="h-5 w-5 mb-1" />
                  <span className="text-sm">Mobile</span>
                </button>
                <button 
                  onClick={() => {
                    const cashAmount = Math.ceil(subtotal / 10) * 10;
                    setPayments([{ amount: cashAmount, paymentMethod: 'cash', reference: '' }]);
                  }}
                  disabled={subtotal <= 0}
                  className="py-3 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-50 flex flex-col items-center"
                >
                  <Barcode className="h-5 w-5 mb-1" />
                  <span className="text-sm">Exact Cash</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
