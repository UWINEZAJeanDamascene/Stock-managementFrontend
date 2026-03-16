import { useState, useRef, useMemo, useCallback } from 'react';
import { Layout } from '../layout/Layout';
import { bulkDataApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
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
  X,
  ArrowRight,
  ArrowLeft,
  Eye,
  Columns3,
  Sparkles,
  ChevronDown,
  TriangleAlert,
  CircleCheck,
  RotateCcw,
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

  return (
    <Layout>
      <div className="p-3 md:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
            {t('bulkData.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('bulkData.subtitle')}</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {success && step === 'result' && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
          <button
            onClick={() => { setActiveTab('import'); resetWizard(); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'import' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Upload className="h-4 w-4" /> {t('bulkData.importData')}
          </button>
          <button
            onClick={() => { setActiveTab('export'); setError(null); setSuccess(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'export' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Download className="h-4 w-4" /> {t('bulkData.exportData')}
          </button>
        </div>

        {/* ═══ IMPORT TAB ═══ */}
        {activeTab === 'import' && (
          <div>
            {/* Step indicator */}
            {step !== 'result' && (
              <div className="flex items-center gap-1 mb-8">
                {steps.map((s, i) => (
                  <div key={s.key} className="flex items-center flex-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                        i < stepIndex ? 'bg-green-500 text-white' :
                        i === stepIndex ? 'bg-indigo-600 text-white' :
                        'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        {i < stepIndex ? <CircleCheck className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className={`text-xs font-medium truncate hidden sm:block ${
                        i === stepIndex ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                      }`}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`h-0.5 w-6 mx-1 shrink-0 ${i < stepIndex ? 'bg-green-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── STEP 1: Select Type ── */}
            {step === 'select' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{t('bulkData.selectDataType')}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('bulkData.selectDataTypeDesc')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {dataTypes.map(dt => (
                      <button
                        key={dt.key}
                        onClick={() => setSelectedType(dt.key)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          selectedType === dt.key
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${dt.color}`}><dt.icon className="h-5 w-5" /></div>
                        <span className="font-medium text-slate-800 dark:text-white">{dt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Template download */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{t('bulkData.templateHint')}</p>
                  <button
                    onClick={() => handleDownloadTemplate(selectedType)}
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <FileDown className="h-4 w-4" /> {t('bulkData.downloadTemplate')} ({selectedType})
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setStep('upload')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                  >
                    {t('common.next')} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Upload File ── */}
            {step === 'upload' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{t('bulkData.uploadCSV')}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('bulkData.uploadHint')}</p>
                </div>

                <label className="flex flex-col items-center justify-center gap-3 px-6 py-12 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all bg-white dark:bg-slate-800">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('bulkData.dropOrClick')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('bulkData.csvOnly')}</p>
                  </div>
                </label>

                <div className="flex justify-between">
                  <button
                    onClick={() => setStep('select')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> {t('common.back')}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Column Mapping ── */}
            {step === 'map' && (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                      <Columns3 className="h-5 w-5 text-indigo-600" /> {t('bulkData.mapColumns')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('bulkData.mapColumnsDesc')}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300">
                      <Sparkles className="h-3 w-3 text-amber-500" /> {t('bulkData.autoMapped', { count: mappedCount })}
                    </span>
                    <span className={`px-2 py-1 rounded-md font-medium ${
                      allRequiredMapped
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {mappedRequiredCount}/{requiredFields.length} {t('bulkData.requiredMapped')}
                    </span>
                  </div>
                </div>

                {/* File info */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex items-center justify-between text-sm border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-300">
                    📄 {parsedHeaders.length} {t('bulkData.columnsDetected')} · {parsedRows.length} {t('bulkData.rowsDetected')}
                  </span>
                </div>

                {/* Mapping table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <span>{t('bulkData.yourColumn')}</span>
                    <span className="text-center">→</span>
                    <span>{t('bulkData.mapsTo')}</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[420px] overflow-y-auto">
                    {parsedHeaders.map(header => {
                      const mapped = columnMapping[header] || '';
                      const matchedTarget = targetFields.find(f => f.field === mapped);
                      const isRequired = matchedTarget?.required;

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
                              onChange={(e) => {
                                setColumnMapping(prev => ({ ...prev, [header]: e.target.value }));
                              }}
                              className={`w-full appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border transition-colors cursor-pointer ${
                                mapped
                                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400'
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
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setStep('upload')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> {t('common.back')}
                  </button>
                  <button
                    onClick={goToPreview}
                    disabled={!allRequiredMapped}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <Eye className="h-4 w-4" /> {t('bulkData.previewData')} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Preview & Validate ── */}
            {step === 'preview' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <Eye className="h-5 w-5 text-indigo-600" /> {t('bulkData.previewValidate')}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('bulkData.previewDesc')}</p>
                </div>

                {/* Validation summary */}
                {validationErrors.length > 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TriangleAlert className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold text-amber-800 dark:text-amber-300">{t('bulkData.validationIssues')}</span>
                    </div>
                    {structuralErrors.length > 0 && (
                      <div className="mb-2">
                        {structuralErrors.map((e, i) => (
                          <p key={i} className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {e.message}
                          </p>
                        ))}
                      </div>
                    )}
                    {rowWarnings.length > 0 && (
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        {t('bulkData.rowWarningsCount', { count: rowWarnings.length })}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-2">
                    <CircleCheck className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-300">{t('bulkData.validationPassed')}</span>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex flex-wrap gap-4">
                  <span>📊 {parsedRows.length} {t('bulkData.totalRows')}</span>
                  <span>📑 {mappedTargetCols.length} {t('bulkData.mappedColumns')}</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    → {selectedType}
                  </span>
                </div>

                {/* Data preview table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('bulkData.first5Rows')}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800">#</th>
                          {mappedTargetCols.map(col => {
                            const tf = targetFields.find(f => f.field === col);
                            return (
                              <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 whitespace-nowrap">
                                {tf?.label || col}
                                {tf?.required && <span className="text-red-500 ml-0.5">*</span>}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {previewData.map((row, i) => {
                          // Check if this row has validation warnings
                          const rowErrors = rowWarnings.filter(e => e.row === i + 2);
                          return (
                            <tr key={i} className={rowErrors.length > 0 ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                              <td className="px-3 py-2 text-xs text-slate-400">{i + 1}</td>
                              {mappedTargetCols.map(col => {
                                const val = row[col] || '';
                                const hasError = rowErrors.some(e => e.column === col);
                                return (
                                  <td key={col} className={`px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate ${
                                    hasError ? 'text-red-600 dark:text-red-400 font-medium' : ''
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
                    <div className="px-4 py-2 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700">
                      ...{t('bulkData.andMoreRows', { count: parsedRows.length - 5 })}
                    </div>
                  )}
                </div>

                {/* Row-level errors (expandable) */}
                {rowWarnings.length > 0 && (
                  <details className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <TriangleAlert className="h-4 w-4" />
                      {t('bulkData.showRowErrors', { count: rowWarnings.length })}
                    </summary>
                    <div className="px-4 pb-3 max-h-48 overflow-y-auto space-y-1">
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

                {/* Navigation */}
                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setStep('map')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> {t('bulkData.backToMapping')}
                  </button>
                  <button
                    onClick={handleFinalImport}
                    disabled={importing || structuralErrors.length > 0}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {importing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                    {importing ? t('bulkData.importing') : t('bulkData.confirmImport', { count: parsedRows.length })}
                  </button>
                </div>
              </div>
            )}

            {/* ── RESULT ── */}
            {step === 'result' && importResult && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t('bulkData.importComplete')}</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{success}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <p className="text-3xl font-bold text-green-600">{importResult.created}</p>
                      <p className="text-xs font-medium text-green-600 mt-1">{t('bulkData.created')}</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <p className="text-3xl font-bold text-blue-600">{importResult.updated}</p>
                      <p className="text-xs font-medium text-blue-600 mt-1">{t('bulkData.updated')}</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                      <p className="text-3xl font-bold text-red-600">{importResult.errors.length}</p>
                      <p className="text-xs font-medium text-red-600 mt-1">{t('bulkData.errorsCount')}</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <details className="border border-red-200 dark:border-red-800 rounded-xl">
                      <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> {t('bulkData.errorDetails')}
                      </summary>
                      <div className="px-4 pb-3 max-h-48 overflow-y-auto space-y-1">
                        {importResult.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-500 dark:text-red-400">
                            {t('bulkData.row')} {err.row}: {err.message}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                <button
                  onClick={resetWizard}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                >
                  <RotateCcw className="h-4 w-4" /> {t('bulkData.importAnother')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ EXPORT TAB ═══ */}
        {activeTab === 'export' && (
          <>
            {success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" /> {success}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {dataTypes.map(dt => (
                <div key={dt.key} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center">
                  <div className={`p-3 rounded-xl ${dt.color} mb-4`}><dt.icon className="h-8 w-8" /></div>
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-1">{dt.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t('bulkData.exportDesc')}</p>
                  <button
                    onClick={() => handleExport(dt.key)}
                    disabled={exporting === dt.key}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {exporting === dt.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {t('bulkData.exportCSV')}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
