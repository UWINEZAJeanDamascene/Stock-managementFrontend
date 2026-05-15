/**
 * Stacy AI — Predictive Analytics Instruction System
 * Prompts and types for AI-generated forecasts, trends, and recommendations.
 */

export type PredictionType =
  | 'revenue'
  | 'cash-flow'
  | 'expense'
  | 'inventory'
  | 'receivables'
  | 'sales'
  | 'custom';

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface ForecastPoint {
  period: string;
  actual?: number;
  predicted: number;
  lowerBound?: number;
  upperBound?: number;
}

export interface PredictionData {
  type: 'prediction';
  predictionType: PredictionType;
  title: string;
  confidence: ConfidenceLevel;
  trend: TrendDirection;
  currentValue?: number;
  forecast: ForecastPoint[];
  recommendations: string[];
  unit?: string;
}

/**
 * Instructions for the LLM on how to generate predictive analytics JSON.
 * Inject this into the system prompt when the user asks for forecasts/predictions.
 */
export function getPredictiveInstructions(): string {
  return `PREDICTION RULES — MUST follow exactly:
1. Output ONE raw JSON block in \`\`\`json fences with "type":"prediction".
2. ALL keys MUST be double-quoted. Output as SINGLE LINE compact JSON.
3. NEVER use markdown tables. NEVER output plain-text lists.

Use the historical sales, cash flow, inventory, and receivables data provided in the system context to build realistic forecasts.

Required fields:
- "type":"prediction"
- "predictionType": one of "revenue","cash-flow","expense","inventory","receivables","sales","custom"
- "title": short descriptive title
- "confidence": "high" | "medium" | "low"
- "trend": "up" | "down" | "neutral"
- "currentValue": number (most recent actual value)
- "forecast": array of { "period", "predicted", "lowerBound"?, "upperBound"? }
- "recommendations": array of actionable strings (max 3)
- "unit": "RWF" or "units" or "%"

Guidelines:
- Base predictions on the historical trend data provided.
- If data is sparse, lower confidence to "medium" or "low".
- Forecast at least 3 future periods (months/quarters).
- Recommendations must be specific and actionable.

Example (SINGLE LINE):
\`\`\`json
{"type":"prediction","predictionType":"revenue","title":"Revenue Forecast — Next 3 Months","confidence":"high","trend":"up","currentValue":1250000,"forecast":[{"period":"Jun 2026","predicted":1320000,"lowerBound":1280000,"upperBound":1360000},{"period":"Jul 2026","predicted":1380000,"lowerBound":1330000,"upperBound":1430000},{"period":"Aug 2026","predicted":1410000,"lowerBound":1350000,"upperBound":1470000}],"recommendations":["Increase cement stock — projected 15% demand rise","Follow up on 3 overdue invoices worth RWF 450K","Consider hiring temp staff for peak season"],"unit":"RWF"}
\`\`\``;
}

/**
 * Detect if a user message is asking for a prediction/forecast.
 */
export function isPredictiveQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(predict|forecast|projection|trend|outlook|what if|scenario|estimate|expect|will.*revenue|will.*sales|next month|next quarter|future)\b/i.test(lower);
}
