/**
 * Stacy AI — Smart Chart Auto-Selector
 * Analyzes data characteristics and recommends the optimal chart type.
 */

export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';

export interface DataCharacteristics {
  hasTimeAxis: boolean;        // Dates, months, quarters
  categoryCount: number;       // Number of distinct categories
  isComparison: boolean;       // Multiple series comparing same categories
  isDistribution: boolean;     // Parts of a whole
  hasTrend: boolean;           // Values change directionally
  valueRange: { min: number; max: number };
  totalValue: number;
  dataPoints: number;          // Total number of data cells
}

export interface ChartRecommendation {
  type: ChartType;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  alternative?: ChartType;
}

const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#14b8a6', '#a855f7', '#eab308',
];

function isTimeValue(value: string): boolean {
  if (!value) return false;
  const v = String(value).toLowerCase().trim();
  // Match: Jan, January, 2024, Q1, Week 1, Monday, etc.
  const timePatterns = [
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*$/i,
    /^\d{4}$/,                           // 2024
    /^q[1-4]$/i,                         // Q1, Q2
    /^week\s*\d+$/i,                     // Week 1
    /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*$/i,
    /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/,    // 12/05 or 12/05/2024
    /^\d{4}-\d{2}-\d{2}$/,               // 2024-05-12
    /^(today|yesterday|last\s+)/i,
  ];
  return timePatterns.some(p => p.test(v));
}

function detectTrend(values: number[]): boolean {
  if (values.length < 3) return false;
  const diffs = values.slice(1).map((v, i) => v - values[i]);
  const up = diffs.filter(d => d > 0).length;
  const down = diffs.filter(d => d < 0).length;
  // If 60%+ move in same direction, it's a trend
  const total = diffs.length;
  return (up / total > 0.6) || (down / total > 0.6);
}

/**
 * Analyze raw data and recommend the best chart type.
 * @param labels Category labels or time labels
 * @param datasets Array of { label, data: number[] }
 */
export function analyzeAndRecommend(
  labels: string[],
  datasets: { label: string; data: number[] }[]
): ChartRecommendation {
  const values = datasets.flatMap(ds => ds.data);
  const characteristics: DataCharacteristics = {
    hasTimeAxis: labels.some(isTimeValue),
    categoryCount: labels.length,
    isComparison: datasets.length > 1,
    isDistribution: datasets.length === 1 && labels.length <= 8,
    hasTrend: detectTrend(values),
    valueRange: { min: Math.min(...values), max: Math.max(...values) },
    totalValue: values.reduce((a, b) => a + b, 0),
    dataPoints: values.length,
  };

  return recommendChart(characteristics);
}

export function recommendChart(c: DataCharacteristics): ChartRecommendation {
  // Rule 1: Time-series with trend → Line (or Area for single series)
  if (c.hasTimeAxis && c.categoryCount >= 3) {
    if (c.isComparison) {
      return {
        type: 'line',
        reason: `Time-series with ${c.categoryCount} periods and ${datasetsCount(c)} series for comparison. Lines show trends clearly.`,
        confidence: 'high',
        alternative: 'bar',
      };
    }
    if (c.hasTrend) {
      return {
        type: 'area',
        reason: `Single time-series with ${c.categoryCount} periods showing clear directional movement. Area chart emphasizes magnitude + trend.`,
        confidence: 'high',
        alternative: 'line',
      };
    }
    return {
      type: 'line',
      reason: `Time-series data across ${c.categoryCount} periods. Best for showing change over time.`,
      confidence: 'high',
    };
  }

  // Rule 2: Part-to-whole (single series, few categories, all positive)
  if (c.isDistribution && c.valueRange.min >= 0 && c.categoryCount <= 6) {
    return {
      type: 'doughnut',
      reason: `Distribution of ${c.categoryCount} categories forming a whole (total: ${formatNumber(c.totalValue)}). Doughnut is modern and readable.`,
      confidence: 'high',
      alternative: 'pie',
    };
  }

  // Rule 3: Category comparison with many categories → Horizontal bar
  if (c.categoryCount > 6 && !c.isComparison) {
    return {
      type: 'bar',
      reason: `${c.categoryCount} categories to compare. Bar chart with sorted values makes ranking instantly readable.`,
      confidence: 'high',
    };
  }

  // Rule 4: Multi-series comparison → Grouped bar
  if (c.isComparison && c.categoryCount <= 12) {
    return {
      type: 'bar',
      reason: `Comparing ${datasetsCount(c)} metrics across ${c.categoryCount} categories. Grouped bars enable side-by-side comparison.`,
      confidence: 'high',
      alternative: 'line',
    };
  }

  // Rule 5: Scatter for correlation (two series, many points)
  if (c.isComparison && datasetsCount(c) === 2 && c.categoryCount >= 10) {
    return {
      type: 'scatter',
      reason: `Two variables across ${c.categoryCount} data points. Scatter reveals correlation and outliers.`,
      confidence: 'medium',
      alternative: 'line',
    };
  }

  // Default: Bar chart (safest general-purpose choice)
  return {
    type: 'bar',
    reason: `General-purpose comparison of ${c.categoryCount} categories. Bar charts are universally understood.`,
    confidence: 'medium',
  };
}

function datasetsCount(c: DataCharacteristics): number {
  // This is approximate from context; actual count comes from caller
  return c.isComparison ? 2 : 1;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

/**
 * Build a Recharts-ready config object with the recommended chart type.
 */
export function buildChartConfig(
  recommendation: ChartRecommendation,
  labels: string[],
  datasets: { label: string; data: number[]; color?: string }[]
): {
  type: ChartType;
  labels: string[];
  datasets: { label: string; data: number[]; color: string }[];
  title: string;
  recommendation: ChartRecommendation;
} {
  const coloredDatasets = datasets.map((ds, i) => ({
    ...ds,
    color: ds.color || CHART_COLORS[i % CHART_COLORS.length],
  }));

  return {
    type: recommendation.type,
    labels,
    datasets: coloredDatasets,
    title: '', // Caller fills this
    recommendation,
  };
}

/**
 * Instructions for the LLM to generate charts with optimal types.
 * Inject this into the system prompt.
 */
export function getChartInstructions(): string {
  return `CHART RULES: Output raw JSON in \`\`\`json blocks. NEVER use images, URLs, or links.\n\nChart type guide:\n- Time-series (dates/months) → "line" (trend) or "area" (volume)\n- Category compare (products) → "bar"; 7+ items sort desc\n- Part-to-whole (breakdown) → "doughnut" (≤6 items) else "bar"\n- NEVER "pie", always "doughnut"\n\nRequired fields: type, chartType, title, labels[], datasets[{label,data[],color}]\n\nExample:\n\`\`\`json\n{"type":"chart","chartType":"line","title":"Revenue Trend","labels":["Jan","Feb"],"datasets":[{"label":"Revenue","data":[1200,1500],"color":"#6366f1"}]}\n\`\`\``;
}
