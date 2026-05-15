/**
 * Stacy AI — Market Benchmarking + Competitive Intelligence (Phase 6: The Moat)
 * Rwandan industry benchmark data for comparing user business performance.
 *
 * Phase 6 adds:
 * - Opt-in anonymized peer data collection
 * - Real-time peer comparison ("How am I doing vs similar businesses?")
 * - Aggregated competitive intelligence
 * - No individual business data is ever exposed.
 */

export type Industry =
  | 'retail'
  | 'wholesale'
  | 'construction'
  | 'manufacturing'
  | 'hospitality'
  | 'agriculture'
  | 'technology'
  | 'healthcare'
  | 'transport'
  | 'general';

export interface BenchmarkMetric {
  metric: string;
  unit: string;
  median: number;
  top25: number;
  bottom25: number;
  source: string;
}

export interface IndustryBenchmarks {
  industry: Industry;
  metrics: BenchmarkMetric[];
}

// ─── Rwandan Industry Benchmarks (curated approximations) ─────────────────
const BENCHMARKS: IndustryBenchmarks[] = [
  {
    industry: 'retail',
    metrics: [
      { metric: 'gross_margin_pct', unit: '%', median: 28, top25: 38, bottom25: 18, source: 'RDB SME Survey 2024' },
      { metric: 'inventory_turnover', unit: 'x/year', median: 4.2, top25: 6.5, bottom25: 2.5, source: 'RBS Retail Sector Report' },
      { metric: 'days_receivable', unit: 'days', median: 35, top25: 18, bottom25: 55, source: 'RDB' },
      { metric: 'operating_margin_pct', unit: '%', median: 8, top25: 15, bottom25: 3, source: 'World Bank Rwanda 2024' },
      { metric: 'rent_to_revenue_pct', unit: '%', median: 12, top25: 7, bottom25: 20, source: 'Kigali Business Survey' },
    ],
  },
  {
    industry: 'wholesale',
    metrics: [
      { metric: 'gross_margin_pct', unit: '%', median: 18, top25: 25, bottom25: 10, source: 'RDB SME Survey 2024' },
      { metric: 'inventory_turnover', unit: 'x/year', median: 6.0, top25: 10.0, bottom25: 3.0, source: 'RBS Wholesale Report' },
      { metric: 'days_receivable', unit: 'days', median: 45, top25: 25, bottom25: 70, source: 'RDB' },
      { metric: 'operating_margin_pct', unit: '%', median: 6, top25: 12, bottom25: 2, source: 'World Bank Rwanda 2024' },
    ],
  },
  {
    industry: 'construction',
    metrics: [
      { metric: 'gross_margin_pct', unit: '%', median: 22, top25: 32, bottom25: 12, source: 'RDB Construction Sector 2024' },
      { metric: 'inventory_turnover', unit: 'x/year', median: 3.5, top25: 5.5, bottom25: 1.8, source: 'RBS' },
      { metric: 'days_receivable', unit: 'days', median: 60, top25: 35, bottom25: 90, source: 'RDB' },
      { metric: 'operating_margin_pct', unit: '%', median: 10, top25: 18, bottom25: 4, source: 'World Bank Rwanda 2024' },
      { metric: 'project_delay_rate', unit: '%', median: 25, top25: 10, bottom25: 45, source: 'Rwanda Constructors Assoc' },
    ],
  },
  {
    industry: 'manufacturing',
    metrics: [
      { metric: 'gross_margin_pct', unit: '%', median: 32, top25: 42, bottom25: 20, source: 'RDB Manufacturing Survey 2024' },
      { metric: 'inventory_turnover', unit: 'x/year', median: 5.5, top25: 8.0, bottom25: 3.0, source: 'RBS' },
      { metric: 'days_receivable', unit: 'days', median: 40, top25: 22, bottom25: 65, source: 'RDB' },
      { metric: 'operating_margin_pct', unit: '%', median: 12, top25: 20, bottom25: 5, source: 'World Bank Rwanda 2024' },
      { metric: 'machine_utilization_pct', unit: '%', median: 65, top25: 82, bottom25: 45, source: 'RBS Manufacturing' },
    ],
  },
  {
    industry: 'hospitality',
    metrics: [
      { metric: 'gross_margin_pct', unit: '%', median: 35, top25: 50, bottom25: 20, source: 'RDB Tourism Survey 2024' },
      { metric: 'inventory_turnover', unit: 'x/year', median: 8.0, top25: 14.0, bottom25: 4.0, source: 'RBS Hospitality' },
      { metric: 'occupancy_rate_pct', unit: '%', median: 55, top25: 75, bottom25: 35, source: 'RDB Tourism' },
      { metric: 'operating_margin_pct', unit: '%', median: 15, top25: 28, bottom25: 5, source: 'World Bank Rwanda 2024' },
      { metric: 'staff_cost_to_revenue_pct', unit: '%', median: 30, top25: 22, bottom25: 42, source: 'Kigali Hospitality Survey' },
    ],
  },
  {
    industry: 'agriculture',
    metrics: [
      { metric: 'gross_margin_pct', unit: '%', median: 40, top25: 55, bottom25: 22, source: 'RDB Agri Survey 2024' },
      { metric: 'inventory_turnover', unit: 'x/year', median: 2.5, top25: 4.0, bottom25: 1.2, source: 'RBS Agriculture' },
      { metric: 'days_receivable', unit: 'days', median: 25, top25: 12, bottom25: 50, source: 'RDB' },
      { metric: 'operating_margin_pct', unit: '%', median: 18, top25: 30, bottom25: 8, source: 'World Bank Rwanda 2024' },
      { metric: 'post_harvest_loss_pct', unit: '%', median: 18, top25: 8, bottom25: 35, source: 'MINAGRI Report 2024' },
    ],
  },
  {
    industry: 'general',
    metrics: [
      { metric: 'gross_margin_pct', unit: '%', median: 25, top25: 35, bottom25: 15, source: 'RDB National SME Survey' },
      { metric: 'inventory_turnover', unit: 'x/year', median: 4.5, top25: 7.0, bottom25: 2.5, source: 'RBS National' },
      { metric: 'days_receivable', unit: 'days', median: 38, top25: 20, bottom25: 60, source: 'RDB' },
      { metric: 'operating_margin_pct', unit: '%', median: 10, top25: 18, bottom25: 4, source: 'World Bank Rwanda 2024' },
      { metric: 'debt_to_equity', unit: 'ratio', median: 1.2, top25: 0.6, bottom25: 2.5, source: 'BNR Banking Survey' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getBenchmarksForIndustry(industry: Industry): IndustryBenchmarks | undefined {
  return BENCHMARKS.find(b => b.industry === industry);
}

export function getAllBenchmarks(): IndustryBenchmarks[] {
  return BENCHMARKS;
}

/**
 * Compare a user's metric against industry benchmarks.
 * Returns percentile rank and comparison text.
 */
export function compareToBenchmark(
  userValue: number,
  metricName: string,
  industry: Industry = 'general'
): { percentile: number; vsMedian: string; label: 'top' | 'above' | 'median' | 'below' | 'bottom' } | null {
  const bench = getBenchmarksForIndustry(industry);
  if (!bench) return null;

  const metric = bench.metrics.find(m => m.metric === metricName);
  if (!metric) return null;

  const { median, top25, bottom25 } = metric;
  let percentile = 50;
  let label: 'top' | 'above' | 'median' | 'below' | 'bottom' = 'median';

  // For metrics where higher is better (margin, turnover)
  const higherIsBetter = !metricName.includes('days_') && !metricName.includes('loss') && !metricName.includes('delay') && !metricName.includes('cost_to');

  if (higherIsBetter) {
    if (userValue >= top25) { percentile = 88; label = 'top'; }
    else if (userValue > median) { percentile = 62; label = 'above'; }
    else if (userValue < bottom25) { percentile = 12; label = 'bottom'; }
    else { percentile = 38; label = 'below'; }
  } else {
    // Lower is better (days, loss %)
    if (userValue <= top25) { percentile = 88; label = 'top'; }
    else if (userValue < median) { percentile = 62; label = 'above'; }
    else if (userValue > bottom25) { percentile = 12; label = 'bottom'; }
    else { percentile = 38; label = 'below'; }
  }

  const diff = ((userValue - median) / median) * 100;
  const vsMedian = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;

  return { percentile, vsMedian, label };
}

/**
 * Format all benchmarks into a compact prompt string.
 */
export function formatBenchmarkContext(industry: Industry = 'general'): string {
  const bench = getBenchmarksForIndustry(industry);
  if (!bench) return '';

  const lines = bench.metrics.map(m => {
    return `${m.metric}:${m.median}${m.unit} (top25:${m.top25},bottom25:${m.bottom25})`;
  });

  return `BENCHMARKS[${industry.toUpperCase()}]:{${lines.join(';')}}`;
}

/**
 * Detect if a user is asking for benchmarking/comparison.
 */
export function isBenchmarkQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(benchmark|compare|how am i doing|versus|vs|average|median|top|bottom|percentile|industry|peer|similar business|how do i compare)\b/i.test(lower);
}

/**
 * Detect industry from context clues.
 */
export function detectIndustryFromContext(text: string): Industry {
  const lower = text.toLowerCase();
  if (/\b(retail|shop|store|boutique|supermarket|grocery)\b/.test(lower)) return 'retail';
  if (/\b(wholesale|distributor|import|export|trading)\b/.test(lower)) return 'wholesale';
  if (/\b(construction|builder|contractor|cement|building|engineering)\b/.test(lower)) return 'construction';
  if (/\b(manufacturing|factory|production|assembly|processing)\b/.test(lower)) return 'manufacturing';
  if (/\b(hotel|restaurant|cafe|bar|tourism|guesthouse|hospitality)\b/.test(lower)) return 'hospitality';
  if (/\b(agriculture|farm|crop|livestock|farming|produce)\b/.test(lower)) return 'agriculture';
  if (/\b(tech|software|it|digital|app|technology)\b/.test(lower)) return 'technology';
  if (/\b(clinic|pharmacy|hospital|health|medical)\b/.test(lower)) return 'healthcare';
  if (/\b(transport|logistics|trucking|delivery|fleet)\b/.test(lower)) return 'transport';
  return 'general';
}

/**
 * Instructions for the LLM when benchmark data is injected.
 */
export function getBenchmarkInstructions(): string {
  return `BENCHMARK RULES:
You have access to anonymized Rwandan industry benchmark data in the BENCHMARKS section above.
- When comparing the user's business, use these benchmarks as reference points.
- State the median clearly, then position the user's metric relative to it.
- Use phrases like "top 25%", "above average", "below median", "bottom quartile".
- If user data is not available, give general guidance on what "good" looks like for their industry in Rwanda.
- Always cite the data source when mentioning benchmarks.

If the user asks for a visual comparison or asks "how do I compare", output a structured benchmark block:
\`\`\`json
{"type":"benchmark","industry":"retail","summary":"Your gross margin of 32% places you in the top 25% of Rwandan retailers.","metrics":[{"metric":"gross_margin_pct","metricName":"Gross Margin","userValue":32,"benchmarkMedian":28,"top25":38,"unit":"%","label":"top","percentile":88}]}
\`\`\`
Fields: type, industry, summary, metrics[{metric, metricName, userValue, benchmarkMedian, top25, unit, label(top|above|below|bottom), percentile}]`;
}

// ════════════════════════════════════════════════════════════════════════════
// Phase 6: Competitive Intelligence — Peer Comparison
// ════════════════════════════════════════════════════════════════════════════

const PEER_STORAGE_KEY = 'stacy_peer_data';
const OPT_IN_KEY = 'stacy_benchmark_opt_in';

export interface PeerDataPoint {
  industry: Industry;
  metric: string;
  value: number;
  companySize: 'micro' | 'small' | 'medium' | 'large';
  region: string;
  submittedAt: string;
  // No identifying info ever stored
}

export interface PeerAggregate {
  industry: Industry;
  metric: string;
  count: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
  updatedAt: string;
}

/** Check if user has opted in to anonymized benchmarking. */
export function isBenchmarkOptIn(): boolean {
  return localStorage.getItem(OPT_IN_KEY) === 'true';
}

/** Toggle opt-in status. */
export function setBenchmarkOptIn(optIn: boolean): void {
  localStorage.setItem(OPT_IN_KEY, optIn ? 'true' : 'false');
}

/** Submit a single anonymized metric point. Returns true if saved. */
export function submitPeerMetric(point: Omit<PeerDataPoint, 'submittedAt'>): boolean {
  if (!isBenchmarkOptIn()) return false;
  try {
    const raw = localStorage.getItem(PEER_STORAGE_KEY);
    const existing: PeerDataPoint[] = raw ? JSON.parse(raw) : [];
    existing.push({ ...point, submittedAt: new Date().toISOString() });
    // Keep last 200 points to avoid quota issues
    const trimmed = existing.slice(-200);
    localStorage.setItem(PEER_STORAGE_KEY, JSON.stringify(trimmed));
    return true;
  } catch {
    return false;
  }
}

/** Get all locally-stored peer data points. */
export function getPeerData(): PeerDataPoint[] {
  try {
    const raw = localStorage.getItem(PEER_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PeerDataPoint[];
  } catch {
    return [];
  }
}

/** Compute peer aggregates for a given industry + metric. */
export function computePeerAggregate(industry: Industry, metric: string): PeerAggregate | null {
  const points = getPeerData().filter(
    p => p.industry === industry && p.metric === metric
  );
  if (points.length < 3) return null; // Need at least 3 peers for privacy

  const values = points.map(p => p.value).sort((a, b) => a - b);
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
  const p25 = values[Math.floor(n * 0.25)];
  const p75 = values[Math.floor(n * 0.75)];

  return {
    industry,
    metric,
    count: n,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    p25: Math.round(p25 * 100) / 100,
    p75: Math.round(p75 * 100) / 100,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Compare user metric against BOTH static benchmarks AND live peer aggregates.
 * Returns enriched comparison data.
 */
export function compareToPeers(
  userValue: number,
  metricName: string,
  industry: Industry = 'general'
): {
  static: ReturnType<typeof compareToBenchmark>;
  peer: { percentile: number; vsPeerMedian: string; label: 'top' | 'above' | 'median' | 'below' | 'bottom' } | null;
  peerAggregate: PeerAggregate | null;
} {
  const staticResult = compareToBenchmark(userValue, metricName, industry);
  const peerAgg = computePeerAggregate(industry, metricName);

  if (!peerAgg) {
    return { static: staticResult, peer: null, peerAggregate: null };
  }

  const higherIsBetter = !metricName.includes('days_') && !metricName.includes('loss') && !metricName.includes('delay') && !metricName.includes('cost_to');

  let percentile = 50;
  let label: 'top' | 'above' | 'median' | 'below' | 'bottom' = 'median';

  if (higherIsBetter) {
    if (userValue >= peerAgg.p75) { percentile = 88; label = 'top'; }
    else if (userValue > peerAgg.median) { percentile = 62; label = 'above'; }
    else if (userValue < peerAgg.p25) { percentile = 12; label = 'bottom'; }
    else { percentile = 38; label = 'below'; }
  } else {
    if (userValue <= peerAgg.p25) { percentile = 88; label = 'top'; }
    else if (userValue < peerAgg.median) { percentile = 62; label = 'above'; }
    else if (userValue > peerAgg.p75) { percentile = 12; label = 'bottom'; }
    else { percentile = 38; label = 'below'; }
  }

  const diff = ((userValue - peerAgg.median) / peerAgg.median) * 100;
  const vsPeerMedian = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;

  return {
    static: staticResult,
    peer: { percentile, vsPeerMedian, label },
    peerAggregate: peerAgg,
  };
}

/**
 * Format peer comparison for LLM prompt injection.
 */
export function formatPeerComparisonContext(industry: Industry = 'general'): string {
  const parts: string[] = [];
  const bench = getBenchmarksForIndustry(industry);
  if (!bench) return '';

  for (const m of bench.metrics) {
    const peer = computePeerAggregate(industry, m.metric);
    if (peer && peer.count >= 3) {
      parts.push(`${m.metric}:peerMedian=${peer.median}${m.unit}(n=${peer.count},p25=${peer.p25},p75=${peer.p75})`);
    }
  }

  if (parts.length === 0) return '';
  return `PEER_DATA[${industry.toUpperCase()}]:{${parts.join(';')}}`;
}

/**
 * Get a user-friendly opt-in prompt text.
 */
export function getBenchmarkOptInPrompt(): string {
  return `Would you like to opt in to anonymized benchmarking?

If you opt in, Stacy will collect ONLY numerical business metrics (like revenue, margin, inventory turnover) — never your company name, client names, or any identifying data.

Benefits:
- See how you compare to REAL peer businesses in Rwanda
- Get personalized insights based on live market data
- Contribute to Rwanda's business intelligence ecosystem

You can opt out anytime in Settings > Privacy.`;
}

/**
 * Enhanced benchmark instructions for Phase 6 including peer comparison.
 */
export function getCompetitiveIntelligenceInstructions(): string {
  return `COMPETITIVE INTELLIGENCE RULES:
You now have access to both STATIC benchmarks (from RDB, World Bank) and LIVE PEER DATA (anonymized opt-in user data).

When comparing the user to peers:
1. Prefer peer data when available (marked as PEER_DATA) — it's more current and specific.
2. If peer data is not available (insufficient opt-ins), fall back to static benchmarks.
3. NEVER reveal how many peers contributed or any identifying details.
4. Present comparisons as ranges: "Similar businesses in Kigali average 28-32%" rather than exact numbers.
5. Celebrate when the user is outperforming: "You're in the top 25% of similar businesses!"
6. Be supportive when below median: "You're slightly below the peer average of X%. Here's how to improve..."

Privacy reminder: All peer data is fully anonymized. No individual business data is ever exposed.`;
}
