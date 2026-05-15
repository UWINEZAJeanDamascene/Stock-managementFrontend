/**
 * Stacy AI — Morning Briefing System
 * Aggregates business data into a daily summary context for the LLM
 * and defines the structured briefing output format.
 */

import { dashboardApi, budgetsApi } from './api';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface BriefingMetric {
  label: string;
  value: string;
  change: string;
  trend: TrendDirection;
}

export interface BriefingAlert {
  severity: AlertSeverity;
  message: string;
  category: 'inventory' | 'receivables' | 'payables' | 'cash' | 'sales' | 'general';
}

export interface BriefingPriority {
  text: string;
  category: BriefingAlert['category'];
}

export interface BriefingData {
  type: 'briefing';
  date: string;
  greeting: string;
  summary: string;
  metrics: BriefingMetric[];
  alerts: BriefingAlert[];
  priorities: BriefingPriority[];
  chartData?: {
    labels: string[];
    datasets: { label: string; data: number[]; color?: string }[];
  };
}

/**
 * Fetch historical data from APIs to enrich the business context
 * for morning briefings and predictions.
 */
export async function buildHistoricalContext(): Promise<string> {
  const parts: string[] = [];

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> => {
    return Promise.race([
      promise.then(r => r).catch(() => null),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)).catch(() => null),
    ]) as Promise<T | null>;
  };

  const [salesChart, revenueForecast, cashFlowForecast, topProducts, reorderAlerts] = await Promise.all([
    withTimeout(dashboardApi.getSalesChart({ period: 'month' }), 4000),
    withTimeout(budgetsApi.getRevenueForecast(6), 4000),
    withTimeout(budgetsApi.getCashFlowForecast(6), 4000),
    withTimeout(dashboardApi.getTopSellingProducts({ limit: 5 }), 4000),
    withTimeout(dashboardApi.getReorderAlerts(), 4000),
  ]);

  // Sales chart history
  if (salesChart?.success && salesChart.data) {
    const d = salesChart.data as any;
    if (Array.isArray(d.labels) && Array.isArray(d.data)) {
      const entries = d.labels.map((l: string, i: number) => `${l}:${d.data[i]}`).slice(-6);
      parts.push(`SALES_HIST:[${entries.join(',')}]`);
    }
  }

  // Revenue forecast
  if (revenueForecast?.success && revenueForecast.data) {
    const d = revenueForecast.data as any;
    if (Array.isArray(d.historical)) {
      const hist = d.historical.slice(-3).map((h: any) => `${h.monthName || h.month}:${h.revenue}`);
      parts.push(`REV_HIST:[${hist.join(',')}]`);
    }
    if (Array.isArray(d.forecast)) {
      const fc = d.forecast.slice(0, 3).map((f: any) => `${f.monthName || f.month}:${f.predicted}`);
      parts.push(`REV_FC:[${fc.join(',')}]`);
    }
    if (d.accuracy) {
      parts.push(`FC_ACC:${d.accuracy.mape}%`);
    }
  }

  // Cash flow forecast
  if (cashFlowForecast?.success && cashFlowForecast.data) {
    const d = cashFlowForecast.data as any;
    if (Array.isArray(d.forecast)) {
      const fc = d.forecast.slice(0, 3).map((f: any) => `${f.monthName || f.month}:${f.netPosition}`);
      parts.push(`CF_FC:[${fc.join(',')}]`);
    }
  }

  // Top products
  if (topProducts?.success && Array.isArray(topProducts.data)) {
    const prods = (topProducts.data as any[]).slice(0, 3).map((p: any) => {
      const name = p.name || p.product_name || 'Product';
      const qty = p.total_sold || p.quantity || 0;
      const rev = p.total_revenue || p.revenue || 0;
      return `${name}|qty:${qty}|rev:${rev}`;
    });
    parts.push(`TOP_PRODS:[${prods.join(',')}]`);
  }

  // Reorder alerts
  if (reorderAlerts?.success && Array.isArray(reorderAlerts.data)) {
    const items = (reorderAlerts.data as any[]).slice(0, 5).map((r: any) => {
      const name = r.product_name || r.name || 'Unknown';
      const stock = r.current_stock ?? r.stock ?? 0;
      const reorder = r.reorder_point ?? r.reorder_level ?? 0;
      return `${name}(stock:${stock},reorder:${reorder})`;
    });
    parts.push(`REORDER:[${items.join(',')}]`);
  }

  return parts.join(' ');
}

/**
 * Instructions for the LLM on how to generate a morning briefing JSON.
 */
export function getMorningBriefingInstructions(): string {
  return `MORNING BRIEFING RULES — MUST follow exactly:
1. Output ONE raw JSON block in \`\`\`json fences with "type":"briefing".
2. ALL keys MUST be double-quoted. Output as SINGLE LINE compact JSON.
3. NEVER use markdown tables.

Required fields:
- "type":"briefing"
- "date": "YYYY-MM-DD"
- "greeting": Friendly morning greeting (e.g., "Good morning! ☀️")
- "summary": 1-2 sentence executive summary of the business state
- "metrics": array of { "label", "value", "change", "trend" } (4 items max)
  - label: "Cash", "MTD Sales", "Inventory Value", "Overdue AR", etc.
  - value: formatted string with currency (e.g., "RWF 2.4M")
  - change: percentage or absolute change (e.g., "+12%", "-2")
  - trend: "up" | "down" | "neutral"
- "alerts": array of { "severity", "message", "category" }
  - severity: "critical" | "warning" | "info"
  - category: "inventory" | "receivables" | "payables" | "cash" | "sales" | "general"
- "priorities": array of { "text", "category" } (max 5 items)

Guidelines:
- Use REAL data from the business context provided.
- Alerts should reflect actual problems (overdue invoices, low stock, etc.).
- Priorities must be actionable tasks the user should do TODAY.
- Keep the tone professional but encouraging.

Example (SINGLE LINE):
\`\`\`json
{"type":"briefing","date":"2026-05-13","greeting":"Good morning! ☀️ Your business is looking strong today.","summary":"Sales are 8% ahead of last month. 2 invoices are overdue and 5 products need reordering.","metrics":[{"label":"Cash","value":"RWF 2.4M","change":"+12%","trend":"up"},{"label":"MTD Sales","value":"RWF 1.8M","change":"+8%","trend":"up"},{"label":"Low Stock","value":"5 items","change":"-2","trend":"down"},{"label":"Overdue AR","value":"RWF 600K","change":"0%","trend":"neutral"}],"alerts":[{"severity":"warning","message":"5 products below reorder point","category":"inventory"},{"severity":"critical","message":"Invoice INV-042 overdue by 14 days (RWF 280K)","category":"receivables"}],"priorities":[{"text":"Reorder cement and steel rods","category":"inventory"},{"text":"Call Client X about overdue INV-042","category":"receivables"},{"text":"Review Q2 pricing strategy","category":"sales"}]}
\`\`\``;
}

/**
 * Detect if a user message is asking for a morning briefing / daily summary.
 */
export function isBriefingQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(briefing|morning|daily report|summary|status|overview|what's happening|what is happening|business update|dashboard summary|today's|today status)\b/i.test(lower);
}
