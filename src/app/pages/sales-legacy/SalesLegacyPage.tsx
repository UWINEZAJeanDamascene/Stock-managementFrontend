import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Layout } from '@/app/layout/Layout';
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
import { toast } from 'sonner';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote,
  Receipt,
  User,
  Package,
  Loader2,
  Calculator,
  X
} from 'lucide-react';
import { salesLegacyApi, clientsApi, warehouseApi, PosProduct, bankAccountsApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';

interface CartItem extends PosProduct {
  cartQuantity: number;
  cartUnitPrice: number;
  cartDiscountPct: number;
}

interface Client {
  _id: string;
  name: string;
  code: string;
  contact?: {
    phone?: string;
    email?: string;
  };
  address?: string;
}

interface Warehouse {
  _id: string;
  name: string;
  code: string;
}

export default function SalesLegacyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // State
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('walk-in');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'mobile_money' | 'cheque'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [bankAccounts, setBankAccounts] = useState<Array<{_id: string; name: string; accountType: string}>>([]);
  
  // Load initial data
  useEffect(() => {
    loadWarehouses();
    loadClients();
    loadBankAccounts();
  }, []);
  
  const loadBankAccounts = async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      if (response.success && Array.isArray(response.data)) {
        setBankAccounts(response.data as Array<{_id: string; name: string; accountType: string}>);
      }
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
    }
  };
  
  // Load products when warehouse selected or search changes
  useEffect(() => {
    if (selectedWarehouseId) {
      loadProducts();
    }
  }, [selectedWarehouseId, searchQuery]);
  
  const loadWarehouses = async () => {
    try {
      const response = await warehouseApi.getAll({ isActive: true, limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setWarehouses(response.data as Warehouse[]);
        // Auto-select first warehouse if available
        if ((response.data as Warehouse[]).length > 0) {
          setSelectedWarehouseId((response.data as Warehouse[])[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    }
  };
  
  const loadClients = async () => {
    try {
      const response = await clientsApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setClients(response.data as Client[]);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };
  
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await salesLegacyApi.getProducts({
        search: searchQuery || undefined,
        warehouseId: selectedWarehouseId,
        limit: 50
      });
      if (response.success && Array.isArray(response.data)) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatCurrency = (amount: number | any) => {
    // Handle MongoDB Decimal128 ($numberDecimal)
    const num = typeof amount === 'object' && amount?.$numberDecimal 
      ? parseFloat(amount.$numberDecimal) 
      : Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };
  
  const toNumber = (val: number | any): number => {
    // Handle MongoDB Decimal128 ($numberDecimal)
    if (typeof val === 'object' && val?.$numberDecimal) {
      return parseFloat(val.$numberDecimal);
    }
    return Number(val) || 0;
  };
  
  // Cart operations
  const addToCart = (product: PosProduct) => {
    if (product.currentStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        if (existing.cartQuantity >= product.currentStock) {
          toast.error(`Cannot add more ${product.name}. Stock limit reached.`);
          return prev;
        }
        return prev.map(item => 
          item._id === product._id 
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prev, { 
        ...product, 
        cartQuantity: 1, 
        cartUnitPrice: product.sellingPrice,
        cartDiscountPct: 0
      }];
    });
    setShowCart(true);
    toast.success(`${product.name} added to cart`);
  };
  
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === productId) {
        const newQty = Math.max(1, item.cartQuantity + delta);
        if (newQty > item.currentStock) {
          toast.error(`Stock limit reached for ${item.name}`);
          return item;
        }
        return { ...item, cartQuantity: newQty };
      }
      return item;
    }));
  };
  
  const updatePrice = (productId: string, price: number) => {
    setCart(prev => prev.map(item => 
      item._id === productId ? { ...item, cartUnitPrice: Math.max(0, price) } : item
    ));
  };
  
  const updateDiscount = (productId: string, discount: number) => {
    setCart(prev => prev.map(item => 
      item._id === productId ? { ...item, cartDiscountPct: Math.max(0, Math.min(100, discount)) } : item
    ));
  };
  
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item._id !== productId));
  };
  
  const clearCart = () => {
    setCart([]);
    setPaymentAmount(0);
  };
  
  // Calculations
  const cartCalculations = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    
    cart.forEach(item => {
      const qty = toNumber(item.cartQuantity);
      const price = toNumber(item.cartUnitPrice);
      const discount = toNumber(item.cartDiscountPct);
      const taxRate = toNumber(item.taxRate);
      
      const itemSubtotal = qty * price;
      const itemDiscount = itemSubtotal * (discount / 100);
      const itemNet = itemSubtotal - itemDiscount;
      const itemTax = itemNet * (taxRate / 100);
      
      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;
    });
    
    const grandTotal = subtotal - totalDiscount + totalTax;
    
    return {
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal
    };
  }, [cart]);
  
  // Update payment amount when grand total changes
  useEffect(() => {
    setPaymentAmount(cartCalculations.grandTotal);
  }, [cartCalculations.grandTotal]);
  
  const handleSubmit = async () => {
    // Validation
    if (cart.length === 0) {
      toast.error('Please add items to cart');
      return;
    }
    
    if (!selectedWarehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    
    if (paymentAmount < cartCalculations.grandTotal) {
      toast.error('Payment amount must be at least the grand total');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const selectedClient = clients.find(c => c._id === selectedClientId);
      
      const requestData = {
        clientId: selectedClientId !== 'walk-in' ? selectedClientId : undefined,
        clientInfo: selectedClientId === 'walk-in' && walkInName ? {
          name: walkInName,
          contact: {}
        } : selectedClient ? {
          name: selectedClient.name,
          contact: selectedClient.contact || {}
        } : {
          name: 'Walk-in Customer',
          contact: {}
        },
        items: cart.map(item => ({
          productId: item._id,
          quantity: item.cartQuantity,
          unitPrice: item.cartUnitPrice,
          discountPct: item.cartDiscountPct,
          taxRate: item.taxRate,
          taxCode: item.taxCode,
          description: item.name,
          unit: item.unit
        })),
        warehouseId: selectedWarehouseId,
        paymentMethod,
        paymentAmount,
        paymentReference,
        notes,
        bankAccountId: (paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') && bankAccountId ? bankAccountId : undefined
      };
      
      const response = await salesLegacyApi.createDirectSale(requestData, sendEmail);
      
      if (response.success) {
        toast.success('Sale completed successfully!');
        
        // Reset form
        clearCart();
        setNotes('');
        setPaymentReference('');
        setWalkInName('');
        setSelectedClientId('walk-in');
        
        // Navigate to invoice or show receipt
        if (response.data && (response.data as any)._id) {
          navigate(`/invoices/${(response.data as any)._id}`);
        }
      } else {
        toast.error(response.message || 'Failed to complete sale');
      }
    } catch (error: any) {
      console.error('Sale error:', error);
      toast.error(error?.message || 'Failed to complete sale');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('salesLegacy.title', 'Direct Sale / POS')}</h1>
            <p className="text-muted-foreground dark:text-slate-400">{t('salesLegacy.subtitle', 'Quick cash sale - Invoice and payment in one step')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/invoices')}>
              <Receipt className="mr-2 h-4 w-4" />
              View Invoices
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Products */}
          <div className="lg:col-span-2 space-y-4">
            {/* Warehouse Selection */}
            <Card className="dark:bg-slate-800">
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block text-slate-900 dark:text-white">Warehouse</label>
                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {warehouses.map(w => (
                          <SelectItem key={w._id} value={w._id} className="dark:text-slate-200">{w.name} ({w.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground dark:text-slate-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Products Grid */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                  <Package className="h-5 w-5" />
                  Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                    No products found. Select a warehouse and search.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {products.map(product => (
                      <div
                        key={product._id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md dark:border-slate-600 ${
                          !product.isAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary dark:hover:border-slate-400'
                        }`}
                        onClick={() => product.isAvailable && addToCart(product)}
                      >
                        <div className="font-medium truncate dark:text-slate-200">{product.name}</div>
                        <div className="text-sm text-muted-foreground dark:text-slate-400">{product.sku}</div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-semibold dark:text-slate-200">{formatCurrency(product.sellingPrice)}</span>
                          <span className={`text-xs ${toNumber(product.currentStock) > 10 ? 'text-green-600 dark:text-green-400' : toNumber(product.currentStock) > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                            Stock: {toNumber(product.currentStock)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Cart & Checkout */}
          <div className="space-y-4">
            {/* Cart */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground dark:text-slate-400">
                    Cart is empty. Click products to add.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item._id} className="border rounded-lg p-3 space-y-2 dark:border-slate-600">
                        <div className="flex justify-between items-start">
                          <div className="font-medium truncate flex-1 dark:text-slate-200">{item.name}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500"
                            onClick={() => removeFromCart(item._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 dark:border-slate-600 dark:text-slate-200"
                            onClick={() => updateQuantity(item._id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium dark:text-slate-200">{item.cartQuantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 dark:border-slate-600 dark:text-slate-200"
                            onClick={() => updateQuantity(item._id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground dark:text-slate-400">Price</label>
                            <Input
                              type="number"
                              value={toNumber(item.cartUnitPrice)}
                              onChange={(e) => updatePrice(item._id, parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground dark:text-slate-400">Disc %</label>
                            <Input
                              type="number"
                              value={toNumber(item.cartDiscountPct)}
                              onChange={(e) => updateDiscount(item._id, parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                              min={0}
                              max={100}
                            />
                          </div>
                        </div>
                        
                        <div className="text-right font-semibold text-sm dark:text-slate-200">
                          {formatCurrency(
                            toNumber(item.cartQuantity) * toNumber(item.cartUnitPrice) * (1 - toNumber(item.cartDiscountPct) / 100) * (1 + toNumber(item.taxRate) / 100)
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-red-500"
                    onClick={clearCart}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear Cart
                  </Button>
                )}
              </CardContent>
            </Card>
            
            {/* Customer */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                    <SelectValue placeholder="Select customer (or walk-in)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="walk-in" className="dark:text-slate-200">Walk-in Customer</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c._id} value={c._id} className="dark:text-slate-200">{c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedClientId === 'walk-in' && (
                  <Input
                    placeholder="Walk-in customer name (optional)"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Payment */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                    <SelectValue placeholder="Payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="cash" className="dark:text-slate-200">
                      <span className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" /> Cash
                      </span>
                    </SelectItem>
                    <SelectItem value="card" className="dark:text-slate-200">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Card
                      </span>
                    </SelectItem>
                    <SelectItem value="bank_transfer" className="dark:text-slate-200">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money" className="dark:text-slate-200">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>

                {(paymentMethod === 'bank_transfer' || paymentMethod === 'cheque' || paymentMethod === 'mobile_money') && (
                  <div>
                    <label className="text-sm font-medium mb-2 block text-slate-900 dark:text-white">Bank Account</label>
                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                      <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        {bankAccounts.map((acc) => (
                          <SelectItem key={acc._id} value={acc._id} className="dark:text-slate-200">
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium mb-2 block text-slate-900 dark:text-white">Amount Received</label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="text-lg font-semibold bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                </div>
                
                <Input
                  placeholder="Payment reference (optional)"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
                
                <Input
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                />
              </CardContent>
            </Card>
            
            {/* Summary & Submit */}
            <Card className="bg-primary/5 dark:bg-slate-800">
              <CardContent className="pt-6 space-y-2">
                <div className="flex justify-between dark:text-slate-200">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(cartCalculations.subtotal)}</span>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount:</span>
                  <span>-{formatCurrency(cartCalculations.totalDiscount)}</span>
                </div>
                <div className="flex justify-between dark:text-slate-200">
                  <span>Tax:</span>
                  <span>{formatCurrency(cartCalculations.totalTax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-slate-600">
                  <span className="text-slate-900 dark:text-white">Grand Total:</span>
                  <span className="text-slate-900 dark:text-white">{formatCurrency(cartCalculations.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-sm dark:text-slate-200">
                  <span>Change Due:</span>
                  <span className={paymentAmount >= cartCalculations.grandTotal ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {formatCurrency(Math.max(0, paymentAmount - cartCalculations.grandTotal))}
                  </span>
                </div>

                <div className="flex items-center space-x-2 mt-3">
                  <input
                    type="checkbox"
                    id="sendEmailPOS"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="sendEmailPOS" className="cursor-pointer">
                    Send receipt to customer
                  </Label>
                </div>
                
                <Button
                  className="w-full mt-4 h-12 text-lg"
                  onClick={handleSubmit}
                  disabled={isSubmitting || cart.length === 0 || !selectedWarehouseId}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-5 w-5" />
                      Complete Sale
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
