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
import { salesLegacyApi, clientsApi, warehouseApi, PosProduct } from '@/lib/api';
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'mobile_money'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCart, setShowCart] = useState(false);
  
  // Load initial data
  useEffect(() => {
    loadWarehouses();
    loadClients();
  }, []);
  
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
        notes
      };
      
      const response = await salesLegacyApi.createDirectSale(requestData);
      
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
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('salesLegacy.title', 'Direct Sale / POS')}</h1>
            <p className="text-muted-foreground">{t('salesLegacy.subtitle', 'Quick cash sale - Invoice and payment in one step')}</p>
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Warehouse</label>
                    <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => (
                          <SelectItem key={w._id} value={w._id}>{w.name} ({w.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Products Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No products found. Select a warehouse and search.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {products.map(product => (
                      <div
                        key={product._id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                          !product.isAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'
                        }`}
                        onClick={() => product.isAvailable && addToCart(product)}
                      >
                        <div className="font-medium truncate">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.sku}</div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-semibold">{formatCurrency(product.sellingPrice)}</span>
                          <span className={`text-xs ${toNumber(product.currentStock) > 10 ? 'text-green-600' : toNumber(product.currentStock) > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.length} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cart is empty. Click products to add.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item._id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="font-medium truncate flex-1">{item.name}</div>
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
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(item._id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.cartQuantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => updateQuantity(item._id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Price</label>
                            <Input
                              type="number"
                              value={toNumber(item.cartUnitPrice)}
                              onChange={(e) => updatePrice(item._id, parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Disc %</label>
                            <Input
                              type="number"
                              value={toNumber(item.cartDiscountPct)}
                              onChange={(e) => updateDiscount(item._id, parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                              min={0}
                              max={100}
                            />
                          </div>
                        </div>
                        
                        <div className="text-right font-semibold text-sm">
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer (or walk-in)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c._id} value={c._id}>{c.name} ({c.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedClientId === 'walk-in' && (
                  <Input
                    placeholder="Walk-in customer name (optional)"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <span className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" /> Cash
                      </span>
                    </SelectItem>
                    <SelectItem value="card">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Card
                      </span>
                    </SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Amount Received</label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="text-lg font-semibold"
                  />
                </div>
                
                <Input
                  placeholder="Payment reference (optional)"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
                
                <Input
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </CardContent>
            </Card>
            
            {/* Summary & Submit */}
            <Card className="bg-primary/5">
              <CardContent className="pt-6 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(cartCalculations.subtotal)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(cartCalculations.totalDiscount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(cartCalculations.totalTax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(cartCalculations.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Change Due:</span>
                  <span className={paymentAmount >= cartCalculations.grandTotal ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(Math.max(0, paymentAmount - cartCalculations.grandTotal))}
                  </span>
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
