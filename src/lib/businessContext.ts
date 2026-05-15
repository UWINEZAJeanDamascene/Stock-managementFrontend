/**
 * Stacy AI — Business Context Builder
 * Aggregates live business data from the system's existing APIs
 * to inject into AI prompts. No backend changes required.
 */

import { dashboardApi, clientsApi, productsApi } from './api';
import { useCompanyStore } from '@/store/companyStore';
import { buildHistoricalContext } from './morningBriefing';

export interface BusinessSnapshot {
  company: {
    name: string;
    legalName?: string;
    industry?: string;
    currency: string;
    taxId?: string;
    address?: string;
    phone?: string;
    email?: string;
  } | null;
  today: string;
  cash: {
    available: number;
    byType: Record<string, number>;
  } | null;
  sales: {
    mtd: number;
    vsLastMonth: string;
    topClient?: string;
  } | null;
  inventory: {
    totalValue: number;
    itemCount: number;
    lowStockItems: number;
  } | null;
  receivables: {
    totalOwed: number;
    overdue: number;
  } | null;
  payables: {
    totalDue: number;
    overdue: number;
  } | null;
  alerts: string[];
  clients: { name: string; tin?: string; phone?: string; email?: string; outstanding?: number }[];
  products: { name: string; price?: number; stock?: number }[];
}

// In-memory cache to avoid hammering APIs
let cache: { data: BusinessSnapshot; timestamp: number } | null = null;
const CACHE_TTL_MS = 120_000; // 2 minutes

function getCached(): BusinessSnapshot | null {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }
  return null;
}

function setCached(data: BusinessSnapshot) {
  cache = { data, timestamp: Date.now() };
}

function formatRWF(n: number): string {
  return 'RWF ' + n.toLocaleString('en-RW');
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Fetch dashboard stats and build a business snapshot.
 * This is called before every chat message when authenticated.
 */
export async function buildBusinessContext(): Promise<string> {
  const cached = getCached();
  if (cached) {
    return formatSnapshot(cached);
  }

  const snapshot: BusinessSnapshot = {
    company: null,
    today: new Date().toISOString().split('T')[0],
    cash: null,
    sales: null,
    inventory: null,
    receivables: null,
    payables: null,
    alerts: [],
    clients: [],
    products: [],
  };

  // Pull company info from store (sync)
  const companyStore = useCompanyStore.getState().company;
  if (companyStore) {
    const addrParts = [companyStore.address?.street, companyStore.address?.city, companyStore.address?.country].filter(Boolean);
    snapshot.company = {
      name: companyStore.name,
      legalName: companyStore.legal_name,
      industry: companyStore.industry,
      currency: companyStore.base_currency || 'RWF',
      taxId: companyStore.tax_identification_number,
      address: addrParts.join(', ') || undefined,
      phone: companyStore.phone || undefined,
      email: companyStore.email || undefined,
    };
  }

  // Pull clients, products, and stats in parallel with timeout
  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> => {
    return Promise.race([
      promise.then(r => r).catch(() => null),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)).catch(() => null),
    ]) as Promise<T | null>;
  };

  const [clientsRes, prodRes, stats] = await Promise.all([
    withTimeout(clientsApi.getWithStats({ limit: 5 }), 4000),
    withTimeout(productsApi.getAll({ limit: 5, status: 'active' }), 4000),
    withTimeout(dashboardApi.getStats(), 4000),
  ]);

  if (clientsRes?.success && Array.isArray(clientsRes.data)) {
    snapshot.clients = (clientsRes.data as any[]).slice(0, 3).map((c: any) => ({
      name: c.name || c.client_name || 'Unknown',
      tin: c.tin || c.tax_id || undefined,
      phone: c.phone || undefined,
      email: c.email || undefined,
      outstanding: typeof c.total_outstanding === 'number' ? c.total_outstanding : undefined,
    }));
  }

  if (prodRes?.success && Array.isArray(prodRes.data)) {
    snapshot.products = (prodRes.data as any[]).slice(0, 3).map((p: any) => ({
      name: p.name || p.product_name || 'Unknown',
      price: typeof p.selling_price === 'number' ? p.selling_price : (typeof p.price === 'number' ? p.price : undefined),
      stock: typeof p.quantity === 'number' ? p.quantity : (typeof p.stock === 'number' ? p.stock : undefined),
    }));
  }

  // Parse dashboard stats
  if (stats?.success && stats.data && typeof stats.data === 'object') {
    const d = stats.data as Record<string, any>;

    // Cash position
    if (d.cashPosition || d.cash) {
      const cp = d.cashPosition || d.cash;
      snapshot.cash = {
        available: typeof cp.total === 'number' ? cp.total : 0,
        byType: cp.byType || {},
      };
    }

    // Sales
    if (d.sales || d.revenue) {
      const s = d.sales || d.revenue;
      snapshot.sales = {
        mtd: typeof s.currentMonth === 'number' ? s.currentMonth : (typeof s.mtd === 'number' ? s.mtd : 0),
        vsLastMonth: s.growth || s.vsLastMonth || 'N/A',
        topClient: s.topClient,
      };
    }

    // Inventory
    if (d.inventory || d.stock) {
      const inv = d.inventory || d.stock;
      snapshot.inventory = {
        totalValue: typeof inv.totalValue === 'number' ? inv.totalValue : (typeof inv.value === 'number' ? inv.value : 0),
        itemCount: typeof inv.itemCount === 'number' ? inv.itemCount : (typeof inv.count === 'number' ? inv.count : 0),
        lowStockItems: typeof inv.lowStock === 'number' ? inv.lowStock : (typeof inv.reorderNeeded === 'number' ? inv.reorderNeeded : 0),
      };
    }

    // Receivables / Payables
    if (d.receivables) {
      snapshot.receivables = {
        totalOwed: d.receivables.total || 0,
        overdue: d.receivables.overdue || 0,
      };
    }
    if (d.payables) {
      snapshot.payables = {
        totalDue: d.payables.total || 0,
        overdue: d.payables.overdue || 0,
      };
    }

    // Alerts from dashboard
    if (Array.isArray(d.alerts)) {
      snapshot.alerts = d.alerts.slice(0, 5).map((a: any) =>
        typeof a === 'string' ? a : a.message || JSON.stringify(a)
      );
    }
  }

  // Fetch historical/forecast data for predictions & briefings
  let historical = '';
  try {
    historical = await buildHistoricalContext();
  } catch {
    // Non-critical; predictions will use current snapshot only
  }

  setCached(snapshot);
  const snapshotStr = formatSnapshot(snapshot);
  return historical ? `${snapshotStr} ${historical}` : snapshotStr;
}

function formatSnapshot(s: BusinessSnapshot): string {
  const parts: string[] = [];
  parts.push(`DATE:${s.today}`);

  if (s.company) {
    parts.push(`CO:${s.company.name}`);
  }

  if (s.cash) {
    parts.push(`CASH:${formatRWF(s.cash.available)}`);
  }

  if (s.sales) {
    parts.push(`SALES:${formatRWF(s.sales.mtd)}`);
  }

  if (s.inventory) {
    parts.push(`INV:${formatRWF(s.inventory.totalValue)}|${s.inventory.itemCount}sku`);
    if (s.inventory.lowStockItems > 0) parts.push(`LOW:${s.inventory.lowStockItems}`);
  }

  if (s.receivables) {
    parts.push(`REC:${formatRWF(s.receivables.totalOwed)}|${formatRWF(s.receivables.overdue)}ovr`);
  }

  if (s.payables) {
    parts.push(`PAY:${formatRWF(s.payables.totalDue)}|${formatRWF(s.payables.overdue)}ovr`);
  }

  if (s.alerts.length > 0) {
    parts.push(`ALERT:${s.alerts.join('; ')}`);
  }

  if (s.clients.length > 0) {
    parts.push(`CLIENTS:${s.clients.map(c => `${c.name}${c.tin ? '|' + c.tin : ''}${c.outstanding ? '|' + formatRWF(c.outstanding) + 'due' : ''}`).join(',')}`);
  }

  if (s.products.length > 0) {
    parts.push(`PRODUCTS:${s.products.map(p => `${p.name}${p.price ? '|' + formatRWF(p.price) : ''}`).join(',')}`);
  }

  return parts.join(' ');
}

/**
 * Quick non-async version for when we just need the stringified snapshot
 * (uses cached data or returns empty context).
 */
export function getBusinessContextSync(): string {
  const cached = getCached();
  if (cached) return formatSnapshot(cached);
  return 'BUSINESS CONTEXT: Not yet loaded. Ask the user to wait a moment.';
}

/**
 * Clear the cache (e.g., after significant data changes).
 */
export function clearBusinessContextCache(): void {
  cache = null;
}
