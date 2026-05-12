import { useState, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { Layout } from '../layout/Layout';
import { bulkDataApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Package,
  Users,
  Truck,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileDown,
  ArrowRight,
  ArrowLeft,
  Eye,
  Columns3,
  Sparkles,
  ChevronDown,
  TriangleAlert,
  CircleCheck,
  RotateCcw,
  Database,
  ShieldCheck,
  TrendingUp,
  Inbox,
  ArrowUpDown,
  FileCheck,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────

type DataType = 'products' | 'clients' | 'suppliers';
type WizardStep = 'select' | 'upload' | 'map' | 'preview' | 'result';

interface ImportResult {
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

interface ColumnMapping {
  [sourceCol: string]: string; // sourceCol → targetField or '' (skip)
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

// ─── Target field definitions per data type ─────────

const TARGET_FIELDS: Record<DataType, { field: string; label: string; required: boolean }[]> = {
  products: [
    { field: 'name', label: 'Product Name', required: true },
    { field: 'sku', label: 'SKU', required: true },
    { field: 'description', label: 'Description', required: false },
    { field: 'category', label: 'Category', required: true },
    { field: 'unit', label: 'Unit', required: true },
    { field: 'currentStock', label: 'Current Stock', required: false },
    { field: 'lowStockThreshold', label: 'Low Stock Threshold', required: false },
    { field: 'averageCost', label: 'Average Cost', required: false },
    { field: 'sellingPrice', label: 'Selling Price', required: false },
    { field: 'supplier', label: 'Supplier', required: false },
    { field: 'barcode', label: 'Barcode', required: false },
    { field: 'barcodeType', label: 'Barcode Type', required: false },
    { field: 'taxCode', label: 'Tax Code', required: false },
    { field: 'taxRate', label: 'Tax Rate', required: false },
    { field: 'reorderPoint', label: 'Reorder Point', required: false },
    { field: 'reorderQuantity', label: 'Reorder Quantity', required: false },
    { field: 'weight', label: 'Weight', required: false },
    { field: 'brand', label: 'Brand', required: false },
    { field: 'location', label: 'Warehouse Location', required: false },
  ],
  clients: [
    { field: 'name', label: 'Client Name', required: true },
    { field: 'code', label: 'Code', required: false },
    { field: 'type', label: 'Type (individual/company)', required: false },
    { field: 'phone', label: 'Phone', required: false },
    { field: 'email', label: 'Email', required: false },
    { field: 'fax', label: 'Fax', required: false },
    { field: 'website', label: 'Website', required: false },
    { field: 'contactPerson', label: 'Contact Person', required: false },
    { field: 'address', label: 'Address', required: false },
    { field: 'city', label: 'City', required: false },
    { field: 'state', label: 'State / Province', required: false },
    { field: 'zipCode', label: 'Zip / Postal Code', required: false },
    { field: 'country', label: 'Country', required: false },
    { field: 'salesArea', label: 'Sales Area', required: false },
    { field: 'salesRepId', label: 'Sales Rep ID', required: false },
    { field: 'region', label: 'Region', required: false },
    { field: 'industry', label: 'Industry / Sector', required: false },
    { field: 'registrationDate', label: 'Registration Date', required: false },
    { field: 'taxId', label: 'Tax ID', required: false },
    { field: 'paymentTerms', label: 'Payment Terms', required: false },
    { field: 'creditLimit', label: 'Credit Limit', required: false },
    { field: 'notes', label: 'Notes', required: false },
    { field: 'isActive', label: 'Active (true/false)', required: false },
  ],
  suppliers: [
    { field: 'name', label: 'Supplier Name', required: true },
    { field: 'code', label: 'Code', required: false },
    { field: 'phone', label: 'Phone', required: false },
    { field: 'email', label: 'Email', required: false },
    { field: 'fax', label: 'Fax', required: false },
    { field: 'website', label: 'Website', required: false },
    { field: 'contactPerson', label: 'Contact Person', required: false },
    { field: 'address', label: 'Address', required: false },
    { field: 'city', label: 'City', required: false },
    { field: 'state', label: 'State / Province', required: false },
    { field: 'zipCode', label: 'Zip / Postal Code', required: false },
    { field: 'country', label: 'Country', required: false },
    { field: 'region', label: 'Region', required: false },
    { field: 'currency', label: 'Currency', required: false },
    { field: 'leadTime', label: 'Lead Time (days)', required: false },
    { field: 'minimumOrder', label: 'Minimum Order Qty', required: false },
    { field: 'bankName', label: 'Bank Name', required: false },
    { field: 'bankAccount', label: 'Bank Account / IBAN', required: false },
    { field: 'taxId', label: 'Tax ID', required: false },
    { field: 'paymentTerms', label: 'Payment Terms', required: false },
    { field: 'notes', label: 'Notes', required: false },
    { field: 'isActive', label: 'Active (true/false)', required: false },
  ],
};

// ─── Fuzzy matching for auto-suggestions ────────────

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const ALIASES: Record<string, string[]> = {
  name: ['name', 'productname', 'clientname', 'suppliername', 'fullname', 'title', 'nom', 'companyname', 'businessname', 'customername'],
  sku: ['sku', 'productcode', 'itemcode', 'articlecode', 'ref', 'reference', 'partnumber', 'itemnumber'],
  description: ['description', 'desc', 'details', 'info', 'productdescription'],
  category: ['category', 'cat', 'productcategory', 'categorie', 'productgroup', 'itemgroup', 'group'],
  unit: ['unit', 'uom', 'unitofmeasure', 'measure', 'unite'],
  currentStock: ['currentstock', 'stock', 'qty', 'quantity', 'onhand', 'instock', 'stocklevel', 'availableqty'],
  lowStockThreshold: ['lowstockthreshold', 'minstocklevel', 'lowstock', 'minstock', 'threshold', 'reorderlevel'],
  averageCost: ['averagecost', 'cost', 'unitcost', 'buyprice', 'purchaseprice', 'costprice', 'prixachat'],
  sellingPrice: ['sellingprice', 'price', 'unitprice', 'saleprice', 'retailprice', 'prixvente', 'listprice'],
  supplier: ['supplier', 'vendor', 'fournisseur', 'suppliername', 'vendorname'],
  barcode: ['barcode', 'ean', 'upc', 'gtin', 'ean13', 'upccode'],
  barcodeType: ['barcodetype', 'codetype'],
  taxCode: ['taxcode', 'tax', 'taxclass'],
  taxRate: ['taxrate', 'taxpercentage', 'vat', 'tva', 'vatrate'],
  reorderPoint: ['reorderpoint', 'reorderlevel', 'minqty'],
  reorderQuantity: ['reorderquantity', 'reorderqty'],
  weight: ['weight', 'poids', 'mass', 'netweight', 'grossweight'],
  brand: ['brand', 'marque', 'manufacturer', 'maker'],
  location: ['location', 'warehouselocation', 'binlocation', 'storagelocation', 'shelf', 'rack', 'emplacement'],
  code: ['code', 'clientcode', 'suppliercode', 'id', 'customerid', 'vendorid', 'accountnumber', 'accountno'],
  type: ['type', 'clienttype', 'customertype', 'accounttype'],
  phone: ['phone', 'tel', 'telephone', 'mobile', 'phonenumber', 'phone1', 'mainphone', 'cellphone'],
  email: ['email', 'emailaddress', 'mail', 'courriel', 'emailid', 'primaryemail', 'contactemail'],
  fax: ['fax', 'faxnumber', 'telecopie', 'faxno'],
  website: ['website', 'web', 'url', 'siteweb', 'homepage', 'webpage', 'site'],
  contactPerson: ['contactperson', 'contact', 'contactname', 'primarycontact', 'personne', 'representative', 'rep'],
  address: ['address', 'addr', 'street', 'adresse', 'streetaddress', 'address1', 'addressline1', 'billingaddress'],
  city: ['city', 'town', 'ville', 'locality', 'place'],
  state: ['state', 'province', 'region', 'etat', 'territoire', 'stateprovince', 'statecode', 'county'],
  zipCode: ['zipcode', 'zip', 'postalcode', 'postcode', 'codepostal', 'pincode', 'zippostal'],
  country: ['country', 'nation', 'pays', 'countrycode', 'countryname'],
  salesArea: ['salesarea', 'salesdistrict', 'salesterritory', 'territory', 'zone', 'zondevente', 'saleszone'],
  salesRepId: ['salesrepid', 'salesrep', 'salesperson', 'salesid', 'salespersonid', 'salesagent', 'accountmanager', 'salesrepresentative'],
  region: ['region', 'area', 'district', 'territoire', 'salesregion', 'marketregion'],
  industry: ['industry', 'sector', 'industrie', 'secteur', 'businesstype', 'vertical', 'segment'],
  registrationDate: ['registrationdate', 'registeredon', 'dateinscription', 'customersince', 'createdon', 'startdate', 'opendate', 'signupdate', 'joindate', 'dateregistered'],
  currency: ['currency', 'curr', 'devise', 'currencycode', 'defaultcurrency'],
  leadTime: ['leadtime', 'deliverytime', 'delailivraison', 'deliveryleadtime', 'daystodeliver'],
  minimumOrder: ['minimumorder', 'minorder', 'moq', 'minimumorderqty', 'minorderquantity'],
  bankName: ['bankname', 'bank', 'banque', 'bankingname'],
  bankAccount: ['bankaccount', 'iban', 'accountnumber', 'bankaccountnumber', 'comptebanque', 'swift', 'bic'],
  taxId: ['taxid', 'tin', 'vatnumber', 'taxnumber', 'nif', 'gstin', 'gst', 'ein', 'siret', 'siren', 'taxregistration'],
  paymentTerms: ['paymentterms', 'terms', 'payment', 'conditions', 'paymentconditions', 'paymentmethod'],
  creditLimit: ['creditlimit', 'credit', 'maxcredit', 'creditline', 'limitecredit'],
  notes: ['notes', 'note', 'comment', 'comments', 'remarks', 'remarques', 'memo', 'description', 'observations'],
  isActive: ['isactive', 'active', 'status', 'enabled', 'actif', 'isenabled'],
};

function suggestMapping(sourceCol: string, targetFields: { field: string }[]): string {
  const norm = normalise(sourceCol);
  if (!norm) return '';

  for (const tf of targetFields) {
    const aliases = ALIASES[tf.field] || [normalise(tf.field)];
    if (aliases.includes(norm)) return tf.field;
  }

  // Partial match
  for (const tf of targetFields) {
    const aliases = ALIASES[tf.field] || [normalise(tf.field)];
    for (const alias of aliases) {
      if (norm.includes(alias) || alias.includes(norm)) return tf.field;
    }
  }

  return '';
}

// ─── Validation logic ───────────────────────────────

function validateMappedData(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  dataType: DataType
): ValidationError[] {
  const errors: ValidationError[] = [];
  const targets = TARGET_FIELDS[dataType];
  const requiredFields = targets.filter(t => t.required).map(t => t.field);

  // Build reverse mapping: targetField → sourceCol
  const reverseMap: Record<string, string> = {};
  Object.entries(mapping).forEach(([src, tgt]) => {
    if (tgt) reverseMap[tgt] = src;
  });

  // Check unmapped required fields
  for (const rf of requiredFields) {
    if (!reverseMap[rf]) {
      errors.push({ row: 0, column: rf, message: `Required field "${rf}" is not mapped to any column` });
    }
  }

  // Per-row validation (first 100 rows)
  const checkRows = rows.slice(0, 100);
  for (let i = 0; i < checkRows.length; i++) {
    const row = checkRows[i];
    for (const rf of requiredFields) {
      const srcCol = reverseMap[rf];
      if (srcCol && (!row[srcCol] || !row[srcCol].trim())) {
        errors.push({ row: i + 2, column: rf, message: `Empty required field "${rf}"` });
      }
    }
  }

  return errors;
}

// ─── Remap CSV data to target columns ───────────────

function remapData(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): Record<string, string>[] {
  return rows.map(row => {
    const newRow: Record<string, string> = {};
    Object.entries(mapping).forEach(([srcCol, targetField]) => {
      if (targetField && row[srcCol] !== undefined) {
        newRow[targetField] = row[srcCol];
      }
    });
    return newRow;
  });
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════

export default function BulkDataPage() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Shared state ──
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exporting, setExporting] = useState<DataType | null>(null);

  // ── Import wizard state ──
  const [step, setStep] = useState<WizardStep>('select');
  const [selectedType, setSelectedType] = useState<DataType>('products');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const dataTypes: { key: DataType; icon: typeof Package; label: string; color: string }[] = [
    { key: 'products', icon: Package, label: t('bulkData.products'), color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' },
    { key: 'clients', icon: Users, label: t('bulkData.clients'), color: 'bg-green-100 text-green-600 dark:bg-green-900/30' },
    { key: 'suppliers', icon: Truck, label: t('bulkData.suppliers'), color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' },
  ];

  const targetFields = TARGET_FIELDS[selectedType];

  // ── Wizard step labels ──
  const steps: { key: WizardStep; label: string }[] = [
    { key: 'select', label: t('bulkData.step1') },
    { key: 'upload', label: t('bulkData.step2') },
    { key: 'map', label: t('bulkData.step3') },
    { key: 'preview', label: t('bulkData.step4') },
  ];

  // ── Reset wizard ──
  const resetWizard = useCallback(() => {
    setStep('select');
    setParsedHeaders([]);
    setParsedRows([]);
    setColumnMapping({});
    setValidationErrors([]);
    setImportResult(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ── File upload & parse ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError(t('bulkData.csvOnly'));
      return;
    }

    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];

        if (headers.length === 0 || rows.length === 0) {
          setError(t('bulkData.emptyFile'));
          return;
        }

        setParsedHeaders(headers);
        setParsedRows(rows);

        // Auto-suggest column mapping
        const autoMapping: ColumnMapping = {};
        const usedTargets = new Set<string>();
        headers.forEach(h => {
          const suggestion = suggestMapping(h, targetFields);
          if (suggestion && !usedTargets.has(suggestion)) {
            autoMapping[h] = suggestion;
            usedTargets.add(suggestion);
          } else {
            autoMapping[h] = '';
          }
        });
        setColumnMapping(autoMapping);
        setStep('map');
      },
      error: () => {
        setError(t('bulkData.parseError'));
      }
    });
  };

  // ── Proceed to preview ──
  const goToPreview = () => {
    const errors = validateMappedData(parsedRows, columnMapping, selectedType);
    setValidationErrors(errors);
    setStep('preview');
  };

  // ── Preview data (first 5 rows remapped) ──
  const previewData = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return remapData(parsedRows.slice(0, 5), columnMapping);
  }, [parsedRows, columnMapping]);

  const mappedTargetCols = useMemo(() => {
    return Object.values(columnMapping).filter(Boolean);
  }, [columnMapping]);

  // Mapping stats
  const mappedCount = Object.values(columnMapping).filter(Boolean).length;
  const requiredFields = targetFields.filter(f => f.required);
  const mappedRequiredCount = requiredFields.filter(f =>
    Object.values(columnMapping).includes(f.field)
  ).length;
  const allRequiredMapped = mappedRequiredCount === requiredFields.length;

  // ── Final import ──
  const handleFinalImport = async () => {
    setImporting(true);
    setError(null);

    try {
      // Remap all rows to target column names
      const remapped = remapData(parsedRows, columnMapping);
      const csv = Papa.unparse(remapped);
      const blob = new Blob([csv], { type: 'text/csv' });
      const file = new File([blob], `${selectedType}_import.csv`, { type: 'text/csv' });

      let result;
      switch (selectedType) {
        case 'products':
          result = await bulkDataApi.importProducts(file);
          break;
        case 'clients':
          result = await bulkDataApi.importClients(file);
          break;
        case 'suppliers':
          result = await bulkDataApi.importSuppliers(file);
          break;
      }
      setImportResult(result.data as ImportResult);
      setSuccess(result.message);
      setStep('result');
    } catch (err: any) {
      setError(err?.message || t('errors.saveFailed'));
    } finally {
      setImporting(false);
    }
  };

  // ── Export handlers ──
  const handleExport = async (type: DataType) => {
    setExporting(type);
    setError(null);
    try {
      let blob;
      switch (type) {
        case 'products': blob = await bulkDataApi.exportProducts(); break;
        case 'clients': blob = await bulkDataApi.exportClients(); break;
        case 'suppliers': blob = await bulkDataApi.exportSuppliers(); break;
      }
      downloadBlob(blob, `${type}_export.csv`);
      setSuccess(t('bulkData.exportSuccess'));
    } catch {
      setError(t('errors.fetchFailed'));
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadTemplate = async (type: DataType) => {
    try {
      const blob = await bulkDataApi.downloadTemplate(type);
      downloadBlob(blob, `${type}_template.csv`);
    } catch {
      setError(t('errors.fetchFailed'));
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Stepper indicator ──
  const stepIndex = steps.findIndex(s => s.key === step);

  const rowWarnings = validationErrors.filter(e => e.row > 0);
  const structuralErrors = validationErrors.filter(e => e.row === 0);

  const totalRows = parsedRows.length;
  const mappedColsCount = mappedTargetCols.length;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1200px] w-full space-y-6">

          {/* Hero Header */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm dark:border-slate-800">
            <div className="p-6 lg:p-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-white/10 text-white hover:bg-white/10">
                      <Database className="mr-1 h-3.5 w-3.5" />
                      Data Hub
                    </Badge>
                    {activeTab === 'import' && step !== 'result' && step !== 'select' && (
                      <Badge className="bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/20">
                        <ArrowUpDown className="mr-1 h-3 w-3" /> Step {stepIndex + 1} of {steps.length}
                      </Badge>
                    )}
                    {activeTab === 'import' && step === 'result' && importResult && (
                      <Badge className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20">
                        <CheckCircle className="mr-1 h-3 w-3" /> Complete
                      </Badge>
                    )}
                  </div>
                  <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                    {t('bulkData.title')}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                    {t('bulkData.subtitle')}
                  </p>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => {
                  const tab = v as 'import' | 'export';
                  if (tab === 'import') { setActiveTab('import'); resetWizard(); }
                  else { setActiveTab('export'); setError(null); setSuccess(null); }
                }}>
                  <TabsList className="bg-white/10 border border-white/10">
                    <TabsTrigger value="import" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300">
                      <Upload className="mr-1.5 h-4 w-4" /> {t('bulkData.importData')}
                    </TabsTrigger>
                    <TabsTrigger value="export" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300">
                      <Download className="mr-1.5 h-4 w-4" /> {t('bulkData.exportData')}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {activeTab === 'import' && step !== 'result' && step !== 'select' && (
                <div className="mt-7 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Rows Detected</p>
                    <p className="mt-3 text-3xl font-bold">{totalRows.toLocaleString()}</p>
                    <p className="mt-2 text-xs text-slate-400">{parsedHeaders.length} columns</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Mapped Columns</p>
                    <p className="mt-3 text-3xl font-bold">{mappedColsCount}</p>
                    <p className="mt-2 text-xs text-slate-400">{mappedRequiredCount}/{requiredFields.length} required</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Target</p>
                    <p className="mt-3 text-2xl font-bold capitalize">{selectedType}</p>
                    <p className="mt-2 text-xs text-slate-400">{targetFields.length} fields available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {success && step === 'result' && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" /> {success}
            </div>
          )}

          {/* ═══ IMPORT TAB ═══ */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Step indicator */}
              {step !== 'result' && (
                <div className="flex items-center gap-2">
                  {steps.map((s, i) => (
                    <div key={s.key} className="flex items-center flex-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                          i < stepIndex ? 'bg-emerald-500 text-white' :
                          i === stepIndex ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/30' :
                          'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                        }`}>
                          {i < stepIndex ? <CircleCheck className="h-4 w-4" /> : i + 1}
                        </div>
                        <span className={`text-xs font-medium truncate hidden sm:block ${
                          i === stepIndex ? 'text-indigo-600 dark:text-indigo-400' : i < stepIndex ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                        }`}>{s.label}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`h-0.5 w-6 mx-1 shrink-0 rounded-full ${i < stepIndex ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── STEP 1: Select Type ── */}
              {step === 'select' && (
                <div className="space-y-6">
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 dark:border-slate-800 dark:bg-slate-900/20">
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">{t('bulkData.selectDataType')}</CardTitle>
                      <CardDescription className="dark:text-slate-400">{t('bulkData.selectDataTypeDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {dataTypes.map(dt => (
                          <button
                            key={dt.key}
                            onClick={() => setSelectedType(dt.key)}
                            className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all ${
                              selectedType === dt.key
                                ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/20'
                                : 'border-slate-100 bg-white hover:border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className={`rounded-xl p-3 ${dt.color}`}><dt.icon className="h-6 w-6" /></div>
                            <span className="font-semibold text-slate-800 dark:text-white">{dt.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/20">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t('bulkData.templateHint')}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadTemplate(selectedType)}
                          className="border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <FileDown className="mr-1.5 h-4 w-4" /> {t('bulkData.downloadTemplate')} ({selectedType})
                        </Button>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={() => setStep('upload')} className="bg-indigo-600 text-white hover:bg-indigo-700">
                          {t('common.next')} <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── STEP 2: Upload File ── */}
              {step === 'upload' && (
                <div className="space-y-6">
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 dark:border-slate-800 dark:bg-slate-900/20">
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">{t('bulkData.uploadCSV')}</CardTitle>
                      <CardDescription className="dark:text-slate-400">{t('bulkData.uploadHint')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-5">
                      <label className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-slate-700 dark:bg-slate-900/20 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/10 cursor-pointer">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 ring-1 ring-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:ring-indigo-900/40">
                          <Upload className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('bulkData.dropOrClick')}</p>
                          <p className="text-xs text-slate-400 mt-1">{t('bulkData.csvOnly')}</p>
                        </div>
                      </label>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep('select')} className="border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                          <ArrowLeft className="mr-1.5 h-4 w-4" /> {t('common.back')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ── STEP 3: Column Mapping ── */}
              {step === 'map' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-950 dark:text-white flex items-center gap-2">
                        <Columns3 className="h-5 w-5 text-indigo-500" /> {t('bulkData.mapColumns')}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('bulkData.mapColumnsDesc')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                        <Sparkles className="mr-1 h-3 w-3" /> {t('bulkData.autoMapped', { count: mappedCount })}
                      </Badge>
                      <Badge variant="outline" className={allRequiredMapped
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400'
                      }>
                        {mappedRequiredCount}/{requiredFields.length} {t('bulkData.requiredMapped')}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/20 dark:text-slate-300">
                    <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                    <span>{parsedHeaders.length} {t('bulkData.columnsDetected')} · {parsedRows.length} {t('bulkData.rowsDetected')}</span>
                  </div>

                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400">
                      <span>{t('bulkData.yourColumn')}</span>
                      <span className="text-center"><ArrowRight className="h-3.5 w-3.5" /></span>
                      <span>{t('bulkData.mapsTo')}</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
                      {parsedHeaders.map(header => {
                        const mapped = columnMapping[header] || '';
                        return (
                          <div key={header} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium text-slate-800 dark:text-white truncate">{header}</span>
                              {parsedRows[0]?.[header] && (
                                <span className="text-xs text-slate-400 truncate max-w-[120px]" title={parsedRows[0][header]}>
                                  ({parsedRows[0][header]})
                                </span>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                            <div className="relative">
                              <select
                                value={mapped}
                                onChange={(e) => { setColumnMapping(prev => ({ ...prev, [header]: e.target.value })); }}
                                className={`w-full appearance-none rounded-lg border pl-3 pr-8 py-2 text-sm transition-colors cursor-pointer ${
                                  mapped
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                                    : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                                }`}
                              >
                                <option value="">— {t('bulkData.skip')} —</option>
                                {targetFields.map(tf => (
                                  <option key={tf.field} value={tf.field} disabled={
                                    Object.values(columnMapping).includes(tf.field) && columnMapping[header] !== tf.field
                                  }>
                                    {tf.label} {tf.required ? '*' : ''}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep('upload')} className="border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                      <ArrowLeft className="mr-1.5 h-4 w-4" /> {t('common.back')}
                    </Button>
                    <Button onClick={goToPreview} disabled={!allRequiredMapped} className="bg-indigo-600 text-white hover:bg-indigo-700">
                      <Eye className="mr-1.5 h-4 w-4" /> {t('bulkData.previewData')} <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 4: Preview & Validate ── */}
              {step === 'preview' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950 dark:text-white flex items-center gap-2">
                      <Eye className="h-5 w-5 text-indigo-500" /> {t('bulkData.previewValidate')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('bulkData.previewDesc')}</p>
                  </div>

                  {validationErrors.length > 0 ? (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t('bulkData.validationIssues')}</p>
                        {structuralErrors.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {structuralErrors.map((e, i) => (
                              <p key={i} className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {e.message}
                              </p>
                            ))}
                          </div>
                        )}
                        {rowWarnings.length > 0 && (
                          <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                            {t('bulkData.rowWarningsCount', { count: rowWarnings.length })}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                      <CircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{t('bulkData.validationPassed')}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/20 dark:text-slate-300">
                    <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-slate-400" /> {parsedRows.length} {t('bulkData.totalRows')}</span>
                    <span className="flex items-center gap-1"><Columns3 className="h-3.5 w-3.5 text-slate-400" /> {mappedTargetCols.length} {t('bulkData.mappedColumns')}</span>
                    <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400"><ArrowRight className="h-3.5 w-3.5" /> {selectedType}</span>
                  </div>

                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/80">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('bulkData.first5Rows')}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">#</th>
                            {mappedTargetCols.map(col => {
                              const tf = targetFields.find(f => f.field === col);
                              return (
                                <th key={col} className="bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap">
                                  {tf?.label || col}
                                  {tf?.required && <span className="text-red-500 ml-0.5">*</span>}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {previewData.map((row, i) => {
                            const rowErrors = rowWarnings.filter(e => e.row === i + 2);
                            return (
                              <tr key={i} className={rowErrors.length > 0 ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}>
                                <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                                {mappedTargetCols.map(col => {
                                  const val = row[col] || '';
                                  const hasError = rowErrors.some(e => e.column === col);
                                  return (
                                    <td key={col} className={`px-3 py-2 whitespace-nowrap max-w-[200px] truncate ${
                                      hasError ? 'font-medium text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
                                    }`}>
                                      {val || <span className="text-slate-300 dark:text-slate-600 italic">—</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {parsedRows.length > 5 && (
                      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                        ...{t('bulkData.andMoreRows', { count: parsedRows.length - 5 })}
                      </div>
                    )}
                  </Card>

                  {rowWarnings.length > 0 && (
                    <details className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <TriangleAlert className="h-4 w-4" />
                        {t('bulkData.showRowErrors', { count: rowWarnings.length })}
                      </summary>
                      <div className="max-h-48 space-y-1 overflow-y-auto px-4 pb-3">
                        {rowWarnings.slice(0, 50).map((e, i) => (
                          <p key={i} className="text-xs text-amber-600 dark:text-amber-400">
                            {t('bulkData.row')} {e.row}: {e.message}
                          </p>
                        ))}
                        {rowWarnings.length > 50 && (
                          <p className="text-xs text-slate-400 italic">...{rowWarnings.length - 50} more</p>
                        )}
                      </div>
                    </details>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep('map')} className="border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                      <ArrowLeft className="mr-1.5 h-4 w-4" /> {t('bulkData.backToMapping')}
                    </Button>
                    <Button onClick={handleFinalImport} disabled={importing || structuralErrors.length > 0} className="bg-indigo-600 text-white hover:bg-indigo-700">
                      {importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                      {importing ? t('bulkData.importing') : t('bulkData.confirmImport', { count: parsedRows.length })}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── RESULT ── */}
              {step === 'result' && importResult && (
                <div className="space-y-6">
                  <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="p-6 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-900/40">
                          <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t('bulkData.importComplete')}</h2>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{success}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-center dark:border-emerald-900/30 dark:bg-emerald-950/20">
                          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{importResult.created}</p>
                          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">{t('bulkData.created')}</p>
                        </div>
                        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-center dark:border-blue-900/30 dark:bg-blue-950/20">
                          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{importResult.updated}</p>
                          <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">{t('bulkData.updated')}</p>
                        </div>
                        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-center dark:border-red-900/30 dark:bg-red-950/20">
                          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{importResult.errors.length}</p>
                          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{t('bulkData.errorsCount')}</p>
                        </div>
                      </div>

                      {importResult.errors.length > 0 && (
                        <details className="overflow-hidden rounded-xl border border-red-200 dark:border-red-800">
                          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> {t('bulkData.errorDetails')}
                          </summary>
                          <div className="max-h-48 space-y-1 overflow-y-auto px-4 pb-3">
                            {importResult.errors.map((err, i) => (
                              <p key={i} className="text-xs text-red-500 dark:text-red-400">
                                {t('bulkData.row')} {err.row}: {err.message}
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                    </CardContent>
                  </Card>

                  <Button onClick={resetWizard} className="bg-indigo-600 text-white hover:bg-indigo-700">
                    <RotateCcw className="mr-1.5 h-4 w-4" /> {t('bulkData.importAnother')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ═══ EXPORT TAB ═══ */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              {success && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4 shrink-0" /> {success}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {dataTypes.map(dt => (
                  <Card key={dt.key} className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      <div className={`mb-4 rounded-2xl p-3 ${dt.color}`}><dt.icon className="h-8 w-8" /></div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{dt.label}</h3>
                      <p className="mt-1 mb-5 text-xs text-slate-500 dark:text-slate-400">{t('bulkData.exportDesc')}</p>
                      <Button
                        onClick={() => handleExport(dt.key)}
                        disabled={exporting === dt.key}
                        className="bg-indigo-600 text-white hover:bg-indigo-700"
                        size="sm"
                      >
                        {exporting === dt.key ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                        {t('bulkData.exportCSV')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
