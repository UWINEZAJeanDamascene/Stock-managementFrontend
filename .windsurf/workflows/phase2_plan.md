# Phase 2: Predictive Analytics + Morning Briefings — Implementation Plan

## Overview
Add AI-powered **Predictive Analytics** (forecasts, trend analysis, recommendations) and **Morning Briefings** (daily business summaries) to Stacy AI. Both features leverage existing backend forecasting APIs (`budgetsApi.getRevenueForecast`, `dashboardApi.getSalesChart`, etc.) and are surfaced via new structured JSON block types rendered natively in the chat UI.

---

## Files to Create

### 1. `src/lib/predictiveAnalytics.ts`
- `PredictionData` interface: `{ type, predictionType, title, confidence, trend, currentValue, forecast[], recommendations[] }`
- `ForecastPoint` interface: `{ period, actual?, predicted, lowerBound?, upperBound? }`
- `getPredictiveInstructions()`: LLM prompt that instructs the AI to:
  - Use historical context (sales, cash flow, stock trends) to generate predictions
  - Output a compact single-line JSON block with `type:"prediction"`
  - Provide confidence levels, trend direction, and actionable recommendations

### 2. `src/lib/morningBriefing.ts`
- `BriefingData` interface: `{ type, date, greeting, summary, metrics[], alerts[], priorities[], chartData? }`
- `BriefingMetric` interface: `{ label, value, change, trend }`
- `BriefingAlert` interface: `{ severity, message, category }`
- `getMorningBriefingInstructions()`: LLM prompt for synthesizing a daily briefing
- `buildHistoricalContext()`: Async helper that fetches:
  - `dashboardApi.getSalesChart({ period: 'month' })`
  - `budgetsApi.getRevenueForecast(6)`
  - `budgetsApi.getCashFlowForecast(6)`
  - `dashboardApi.getTopSellingProducts({ limit: 5 })`
  - `dashboardApi.getReorderAlerts()`
  - Formats results into a concise context string injected into the LLM prompt

---

## Files to Modify

### 3. `src/lib/businessContext.ts`
- Add `historical` field to `BusinessSnapshot` (sales history, forecast data, top products, reorder alerts)
- In `buildBusinessContext()`, parallel-fetch the new historical APIs alongside existing stats
- In `formatSnapshot()`, append historical context as a compact string section

### 4. `src/app/components/AIChatBot.tsx`
#### Types & Parsing
- Add `'prediction' | 'briefing'` to `ParsedBlock.type`
- In `tryExtractBlock()`, detect `type === 'prediction'` and `type === 'briefing'`
- In `MessageContent`, add renderers for the new block types

#### New Quick Questions
Add to `QUICK_QUESTIONS`:
- `🌅 Generate my morning briefing`
- `📈 Predict next month's revenue`
- `⚠️ What are my biggest risks?`
- `📊 Forecast my cash flow for next quarter`

#### New UI Components (inside AIChatBot.tsx)
- `PredictionBlock({ data })`: 
  - Header with title + confidence badge (green=high, amber=medium, red=low)
  - Trend indicator arrow (up/down/neutral) with percentage
  - Line chart showing `actual` (solid) + `predicted` (dashed) values
  - Recommendations list with bullet points
  - "Export to Excel" button
- `BriefingBlock({ data })`:
  - Greeting header with date
  - Executive summary card
  - Metrics grid (4 cards: cash, sales, inventory, receivables)
  - Alerts section (colored by severity: critical=red, warning=amber, info=blue)
  - Today's priorities checklist
  - Auto-generated chart from `chartData`

#### Prompt Integration
- In `sendMessage()`, detect intent keywords:
  - `/\b(predict|forecast|projection|trend|outlook|what if|scenario)\b/` → inject `getPredictiveInstructions()`
  - `/\b(briefing|morning|summary|daily report|status|overview|what's happening)\b/` → inject `getMorningBriefingInstructions()`

---

## Data Flow

```
User asks for prediction/briefing
        ↓
AIChatBot.sendMessage() detects intent
        ↓
buildBusinessContext() + buildHistoricalContext() fetch live data
        ↓
LLM prompt = system + businessContext + historicalContext + instructions + user message
        ↓
LLM returns JSON block (type: "prediction" or "briefing")
        ↓
AIChatBot parses → renders PredictionBlock / BriefingBlock
```

---

## Backend Data Sources (Already Exist)

| API | Endpoint | Use |
|-----|----------|-----|
| `dashboardApi.getSalesChart({ period })` | `/dashboard/sales-chart` | Historical sales for trend lines |
| `dashboardApi.getStockMovementChart({ period })` | `/dashboard/stock-movement-chart` | Stock in/out trends |
| `budgetsApi.getRevenueForecast(months)` | `/budgets/forecast/revenue` | Revenue forecast + history |
| `budgetsApi.getCashFlowForecast(months)` | `/budgets/forecast/cashflow` | Cash flow forecast + history |
| `budgetsApi.getExpenseForecast(months)` | `/budgets/forecast/expense` | Expense forecast |
| `dashboardApi.getTopSellingProducts({ limit })` | `/dashboard/top-selling-products` | Product trends |
| `dashboardApi.getReorderAlerts()` | `/stock/advanced/reorder-points/needing-reorder` | Low-stock alerts |

---

## LLM Output Schemas

### Prediction JSON
```json
{"type":"prediction","predictionType":"revenue","title":"Revenue Forecast — June 2026","confidence":"high","trend":"up","currentValue":1250000,"forecast":[{"period":"Jun 2026","predicted":1320000,"lowerBound":1280000,"upperBound":1360000},{"period":"Jul 2026","predicted":1380000,"lowerBound":1330000,"upperBound":1430000}],"recommendations":["Increase cement stock — projected 15% demand rise","Follow up on 3 overdue invoices worth RWF 450K"]}
```

### Briefing JSON
```json
{"type":"briefing","date":"2026-05-13","greeting":"Good morning!","summary":"Strong sales momentum continues. 2 invoices overdue. 5 products need reorder.","metrics":[{"label":"Cash","value":"RWF 2.4M","change":"+12%","trend":"up"},{"label":"MTD Sales","value":"RWF 1.8M","change":"+8%","trend":"up"},{"label":"Low Stock","value":"5 items","change":"-2","trend":"down"},{"label":"Overdue AR","value":"RWF 600K","change":"0","trend":"neutral"}],"alerts":[{"severity":"warning","message":"5 products below reorder point","category":"inventory"},{"severity":"critical","message":"Invoice INV-042 overdue by 14 days (RWF 280K)","category":"receivables"}],"priorities":["Reorder cement and steel rods","Call Client X about overdue INV-042","Review Q2 pricing strategy"]}
```

---

## UI/UX Notes

- Both blocks use the existing dark chat theme (`bg-slate-900/80`, `border-slate-700/60`)
- Charts reuse `Recharts` (already imported in AIChatBot.tsx)
- Confidence badges: `high` → emerald, `medium` → amber, `low` → red
- Trend arrows use `lucide-react` icons (`TrendingUp`, `TrendingDown`, `Minus`)
- Briefing metrics use a 2x2 grid on mobile, 4-column on wider viewports
- Keep all text compact — chat messages are narrow

---

## Verification

1. Open Stacy AI
2. Click quick question `🌅 Generate my morning briefing`
3. Verify: greeting, metrics grid, alerts, priorities all render
4. Type `predict revenue next month`
5. Verify: prediction block with line chart (actual + forecast dashed line), confidence badge, recommendations
6. Type `forecast cash flow`
7. Verify: cash flow prediction with trend indicator
8. Check that regular chat/questions still work (no regressions)

External Knowledge — The Advisor
Goal: Stacy knows Rwanda business law, market prices, and tax rules



Document Mastery — The Designer
Goal: Stacy generates documents that make users look like Fortune 500 companies
AI-Powered Invoice Design (The "Wow" Feature)

This is your killer differentiator.

How it works:

User says: "Create an invoice for Acme Ltd for 50 bags of cement"
Stacy:
Pulls Acme Ltd's history (payment terms, contact, past invoices)
Pulls cement pricing, calculates VAT (18%)
ANALYZES the business type: "This is a construction supplier selling to a contractor"
SELECTS the perfect template: Industrial, bold, trustworthy
COLORS: Extracts from company logo OR uses industry-appropriate palette (concrete gray + safety orange for construction)
LAYOUT: Traditional for established client, modern for new client
GENERATES: A PDF that looks like it cost $500 from a designer
Template Designs (React-PDF):

Template A: "Kigali Modern"

Clean white background
Subtle geometric patterns in brand colors
Large product table with zebra striping
QR code for MTN MoMo payment
Minimal footer
Template B: "Classic Trust"

Cream paper texture background
Serif fonts for headings
Handwritten-style signature line
Detailed terms & conditions
Professional but warm
Template C: "Industrial Bold"

Dark header with brand color accents
Large bold typography
Product images in table
Barcode for warehouse scanning
"PAY NOW" button for digital version
Template D: "Elegant Minimal"

Generous whitespace
Thin line separators
Small caps for labels
Subtle gold/brand accent line
Premium feel


Phase 5: Multimodal — The Connector
Timeline: Weeks 9-10
Goal: Stacy works everywhere, on any device
5.1 Voice Commands (Kinyarwanda + English)
What: "Stacy, ongera ibicuruzwa byanjye" → Stacy understands.

Tech:

Whisper (self-hosted or API) for STT
Text-to-speech: Browser SpeechSynthesis API (free, basic) or Google Cloud TTS (free tier: 4M chars/month)
Scope:

50 most common business commands in Kinyarwanda
"Montrez-moi les ventes" (French) for francophone users
Fallback to text if voice fails
Wow factor: Warehouse manager with dirty hands says "Stacy, how many bags of cement left?" while counting stock.

5.2 WhatsApp Business Integration
What: Chat with Stacy on WhatsApp.

Tech: WhatsApp Cloud API (free tier: 1K conversations/month)

Features:

Ask questions via WhatsApp
Receive morning briefings
Get alerts
Request invoice generation ("Send me last month's invoice for Acme")
Wow factor: Business owner in a taxi checks WhatsApp: "Stacy, what's my cash position?" → Instant reply with number and chart image.

5.3 Receipt OCR (Image-to-Data)
What: Snap a photo of a receipt → Stacy extracts data → Auto-enters transaction.

Tech: Tesseract.js (client-side, free)

Flow:

User takes photo of receipt
Tesseract.js extracts text
Stacy parses: vendor, items, amounts, date, VAT
Suggests: "I see a purchase from Supplier A for RWF 45K. Add to expenses?"
User confirms → Auto-enters into system
Wow factor: No more manual receipt entry. Snap, confirm, done.

Phase 6: Market Differentiation — The Moat
Timeline: Ongoing
Goal: Features no competitor can copy quickly
6.1 Industry-Specific AI Modules
What: Stacy speaks the language of specific industries.
Wow factor: A pharmacist asks "Which batches expire next month?" → Stacy knows exactly what to query.

6.2 Competitive Intelligence (Aggregated)
What: "How am I doing compared to similar businesses?"

Implementation:

Opt-in anonymized benchmarking
Show: "Your gross margin is 32%. Similar businesses in Kigali average 28%."
No individual business data exposed
Wow factor: Owner sees they're outperforming peers. Validation + motivation.

6.3 Auto-Workflows
What: Stacy doesn't just advise — she acts.

Examples:

"Auto-send payment reminders on day 7 and day 14 of overdue invoices"
"Auto-generate purchase order when stock hits reorder point"
"Auto-reconcile bank statement every Monday"
"Auto-generate weekly sales report and email to stakeholders"
Wow factor: Business runs itself. Owner checks in once a day.