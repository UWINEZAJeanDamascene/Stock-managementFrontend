import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { 
  ArrowLeft, 
  Pencil, 
  Loader2, 
  AlertCircle,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

interface Supplier {
  _id: string;
  name: string;
  code: string;
  contact: {
    email?: string;
    phone?: string;
    fax?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    contactPerson?: string;
  };
  region?: string;
  currency?: string;
  leadTime?: number;
  minimumOrder?: number;
  bankName?: string;
  bankAccount?: string;
  paymentTerms: string;
  taxId?: string;
  notes?: string;
  isActive: boolean;
  totalPurchases: number;
  lastPurchaseDate?: string;
  productsSupplied?: Array<{ _id: string; name: string; sku: string; unit?: string }>;
  createdBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

interface PurchaseRecord {
  _id: string;
  movementDate: string;
  quantity: number;
  totalCost: number;
  product?: { name: string; sku: string; unit?: string };
}

export default function SupplierDetailPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchaseSummary, setPurchaseSummary] = useState({ totalAmount: 0, totalQuantity: 0, totalPurchases: 0 });

  useEffect(() => {
    if (id) {
      fetchSupplier();
      fetchPurchaseHistory();
    }
  }, [id]);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const response: any = await suppliersApi.getById(id!);
      if (response.success && response.data) {
        setSupplier(response.data);
      } else {
        toast.error(t('suppliers.errors.notFound', 'Supplier not found'));
        navigate('/suppliers');
      }
    } catch (error) {
      console.error('[SupplierDetailPage] Failed to fetch supplier:', error);
      toast.error(t('suppliers.errors.fetchFailed', 'Failed to load supplier'));
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseHistory = async () => {
    setPurchasesLoading(true);
    try {
      const response: any = await suppliersApi.getPurchaseHistory(id!, { limit: 20 });
      if (response.success) {
        setPurchases(response.data || []);
        if (response.summary) {
          setPurchaseSummary(response.summary);
        }
      }
    } catch (error) {
      console.error('[SupplierDetailPage] Failed to fetch purchase history:', error);
    } finally {
      setPurchasesLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getPaymentTermsLabel = (terms: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      credit_7: 'Credit 7 Days',
      credit_15: 'Credit 15 Days',
      credit_30: 'Credit 30 Days',
      credit_45: 'Credit 45 Days',
      credit_60: 'Credit 60 Days',
    };
    return labels[terms] || terms;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!supplier) return null;

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/suppliers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{supplier.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-mono">{supplier.code}</span>
              <Badge 
                variant={supplier.isActive ? 'default' : 'secondary'}
                className={supplier.isActive ? 'bg-green-500 dark:bg-green-600' : ''}
              >
                {supplier.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(`/suppliers/${id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('suppliers.editSupplier', 'Edit Supplier')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">{t('suppliers.totalPurchases', 'Total Purchases')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{formatCurrency(supplier.totalPurchases)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">{t('suppliers.paymentTerms', 'Payment Terms')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{getPaymentTermsLabel(supplier.paymentTerms)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">{t('suppliers.products', 'Products Supplied')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{supplier.productsSupplied?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">{t('suppliers.lastPurchase', 'Last Purchase')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold dark:text-white">
                {supplier.lastPurchaseDate ? formatDate(supplier.lastPurchaseDate) : '-'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information */}
          <Card className="dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">{t('suppliers.contactInfo', 'Contact Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {supplier.contact?.contactPerson && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="dark:text-slate-200">{supplier.contact.contactPerson}</span>
                </div>
              )}
              {supplier.contact?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${supplier.contact.email}`} className="text-primary hover:underline dark:text-blue-400">
                    {supplier.contact.email}
                  </a>
                </div>
              )}
              {supplier.contact?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${supplier.contact.phone}`} className="hover:underline dark:text-slate-200">
                    {supplier.contact.phone}
                  </a>
                </div>
              )}
              {supplier.contact?.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={supplier.contact.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline dark:text-blue-400">
                    {supplier.contact.website}
                  </a>
                </div>
              )}
              {(supplier.contact?.address || supplier.contact?.city || supplier.contact?.country) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="dark:text-slate-300">
                    {supplier.contact.address && <div>{supplier.contact.address}</div>}
                    <div>
                      {[supplier.contact.city, supplier.contact.state, supplier.contact.zipCode].filter(Boolean).join(', ')}
                    </div>
                    {supplier.contact.country && <div>{supplier.contact.country}</div>}
                  </div>
                </div>
              )}
              {!supplier.contact?.email && !supplier.contact?.phone && !supplier.contact?.contactPerson && (
                <div className="text-muted-foreground text-sm dark:text-slate-400">{t('suppliers.noContactInfo', 'No contact information')}</div>
              )}
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card className="dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">{t('suppliers.details', 'Details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {supplier.taxId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">{t('suppliers.taxId', 'Tax ID')}</span>
                  <span className="font-medium dark:text-slate-200">{supplier.taxId}</span>
                </div>
              )}
              {supplier.region && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">{t('suppliers.region', 'Region')}</span>
                  <span className="font-medium dark:text-slate-200">{supplier.region}</span>
                </div>
              )}
              {supplier.currency && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">{t('suppliers.currency', 'Currency')}</span>
                  <span className="font-medium dark:text-slate-200">{supplier.currency}</span>
                </div>
              )}
              {supplier.leadTime != null && supplier.leadTime > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">{t('suppliers.leadTime', 'Lead Time')}</span>
                  <span className="font-medium dark:text-slate-200">{supplier.leadTime} days</span>
                </div>
              )}
              {supplier.minimumOrder != null && supplier.minimumOrder > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">{t('suppliers.minimumOrder', 'Min Order')}</span>
                  <span className="font-medium dark:text-slate-200">{formatCurrency(supplier.minimumOrder)}</span>
                </div>
              )}
              {supplier.bankName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">{t('suppliers.bankName', 'Bank')}</span>
                  <span className="font-medium dark:text-slate-200">{supplier.bankName}</span>
                </div>
              )}
              {supplier.bankAccount && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">{t('suppliers.bankAccount', 'Account')}</span>
                  <span className="font-medium font-mono dark:text-slate-200">{supplier.bankAccount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-slate-400">{t('common.createdAt', 'Created')}</span>
                <span className="font-medium dark:text-slate-200">{formatDate(supplier.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Products Supplied */}
          <Card className="dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">{t('suppliers.productsSupplied', 'Products Supplied by {{name}}', { name: supplier?.name || '' })}</CardTitle>
            </CardHeader>
            <CardContent>
              {supplier.productsSupplied && supplier.productsSupplied.length > 0 ? (
                <div className="space-y-2">
                  {supplier.productsSupplied.map((product) => (
                    <div key={product._id} className="flex justify-between items-center p-2 rounded bg-muted/50 dark:bg-slate-700/50">
                      <span className="font-medium dark:text-slate-200">{product.name}</span>
                      <span className="text-sm text-muted-foreground dark:text-slate-400 font-mono">{product.sku}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm dark:text-slate-400">{t('suppliers.noProductsLinked', 'No products linked to this supplier')}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Purchase History */}
        <Card className="mt-6 dark:bg-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">{t('suppliers.purchaseHistory', 'Purchase History')}</CardTitle>
            <CardDescription className="dark:text-slate-400">
              {t('suppliers.purchaseHistoryDesc', 'Recent stock received from this supplier')}
              {purchaseSummary.totalPurchases > 0 && (
                <span className="ml-2 font-medium">
                  ({purchaseSummary.totalPurchases} {t('suppliers.records', 'records')}, {t('suppliers.total', 'Total')}: {formatCurrency(purchaseSummary.totalAmount)})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {purchasesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : purchases.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-muted-foreground dark:text-slate-400">{t('suppliers.noPurchaseHistory', 'No purchase history found')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="dark:bg-slate-700">
                    <TableHead className="dark:text-white">{t('suppliers.date', 'Date')}</TableHead>
                    <TableHead className="dark:text-white">{t('suppliers.product', 'Product')}</TableHead>
                    <TableHead className="text-right dark:text-white">{t('suppliers.quantity', 'Quantity')}</TableHead>
                    <TableHead className="text-right dark:text-white">{t('suppliers.totalCost', 'Total Cost')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase._id} className="dark:hover:bg-slate-700/50">
                      <TableCell className="dark:text-slate-300">{formatDate(purchase.movementDate)}</TableCell>
                      <TableCell className="dark:text-slate-300">
                        <div>{purchase.product?.name || '-'}</div>
                        {purchase.product?.sku && (
                          <div className="text-xs text-muted-foreground dark:text-slate-400 font-mono">{purchase.product.sku}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right dark:text-slate-300">
                        {purchase.quantity} {purchase.product?.unit || ''}
                      </TableCell>
                      <TableCell className="text-right font-medium dark:text-slate-200">{formatCurrency(purchase.totalCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {supplier.notes && (
          <Card className="mt-6 dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">{t('suppliers.notes', 'Notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap dark:text-slate-300">{supplier.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
