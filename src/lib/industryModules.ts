/**
 * Stacy AI — Industry-Specific Modules (Phase 6: The Moat)
 * Each industry has its own vocabulary, metrics, and data queries.
 * When a user's company profile has an industry set, Stacy uses these
 * specialized instructions to answer industry-specific questions.
 */

export type IndustryModule =
  | 'retail'
  | 'wholesale'
  | 'pharmacy'
  | 'construction'
  | 'manufacturing'
  | 'hospitality'
  | 'agriculture'
  | 'technology'
  | 'healthcare'
  | 'transport'
  | 'general';

export interface IndustryConfig {
  industry: IndustryModule;
  displayName: string;
  keywords: string[];
  specificMetrics: string[];
  commonQuestions: string[];
  dataQueries: string[];
  specialKnowledge: string;
}

// ─── Industry Configurations ───────────────────────────────────────────────

const INDUSTRY_CONFIGS: Record<IndustryModule, IndustryConfig> = {
  retail: {
    industry: 'retail',
    displayName: 'Retail',
    keywords: ['shop', 'store', 'boutique', 'supermarket', 'grocery', 'mall', 'checkout', 'shelf', 'sku', 'barcode', 'pos'],
    specificMetrics: [
      'sales per square meter',
      'conversion rate (walk-ins to purchases)',
      'average transaction value (ATV)',
      'items per basket',
      'stockout rate by SKU',
      'shrinkage (theft + damage)',
      'customer return rate',
    ],
    commonQuestions: [
      'Which products are out of stock?',
      'What is my best-selling product this week?',
      'What is my average transaction value?',
      'Which items have the highest shrinkage?',
      'Show me daily sales by POS terminal',
    ],
    dataQueries: [
      'Get top selling products (by quantity and revenue)',
      'Get low stock alerts',
      'Get sales by product category',
      'Get average transaction value trend',
      'Get stock movement by warehouse',
    ],
    specialKnowledge: `RETAIL-SPECIFIC RULES:
- "Shrinkage" means inventory loss from theft, damage, or expiry.
- "ATV" = Average Transaction Value = total revenue / number of transactions.
- "Conversion rate" = number of transactions / foot traffic (if POS data includes walk-ins).
- "Stockout" means a product with quantity = 0 or below reorder point.
- When asked about "fast movers", query products with highest sales velocity (quantity sold / days in stock).
- When asked about "slow movers", query products with low turnover and high days-in-inventory.`,
  },

  wholesale: {
    industry: 'wholesale',
    displayName: 'Wholesale / Distribution',
    keywords: ['wholesale', 'distributor', 'bulk', 'container', 'import', 'export', 'trading', 'supplier', 'margin', 'markup'],
    specificMetrics: [
      'gross margin by product line',
      'inventory turnover by category',
      'days sales outstanding (DSO)',
      'order fill rate',
      'container utilization',
      'freight cost per kg',
      'price elasticity by client tier',
    ],
    commonQuestions: [
      'What is my gross margin by product line?',
      'Which clients owe the most?',
      'What is my inventory turnover?',
      'Which products have the best margin?',
      'Show me pending purchase orders',
    ],
    dataQueries: [
      'Get product performance report (revenue, COGS, margin)',
      'Get aging receivables',
      'Get aging payables',
      'Get purchase orders by status',
      'Get supplier performance',
    ],
    specialKnowledge: `WHOLESALE-SPECIFIC RULES:
- "DSO" = Days Sales Outstanding = average days to collect payment from clients.
- "Fill rate" = percentage of customer orders fulfilled completely from stock.
- "Margin" in wholesale is typically 15-25% vs 30-50% in retail.
- Container/shipping costs are a major factor; suggest landed cost analysis when asked about imports.
- Tiered pricing is common: VIP clients get volume discounts.
- Backorders and partial shipments are normal; track fill rate as a KPI.`,
  },

  pharmacy: {
    industry: 'pharmacy',
    displayName: 'Pharmacy / Healthcare Retail',
    keywords: ['pharmacy', 'drug', 'medicine', 'prescription', 'batch', 'expiry', 'generic', 'branded', 'otc', 'rx', 'dispensary'],
    specificMetrics: [
      'batches expiring in next 30/60/90 days',
      'prescription vs OTC sales ratio',
      'generic vs branded sales ratio',
      'fast-moving medicines',
      'controlled substance stock levels',
      'average dispensing time',
      'insurance claim rejection rate',
    ],
    commonQuestions: [
      'Which batches expire next month?',
      'What is my prescription vs OTC ratio?',
      'Do I have any controlled substances running low?',
      'Which medicines are fast-moving?',
      'Show me expired stock that needs write-off',
    ],
    dataQueries: [
      'Get products with expiry date within range',
      'Get low stock alerts (especially for critical medicines)',
      'Get sales by product category (prescription/OTC)',
      'Get stock adjustments (expired, damaged)',
      'Get product batches with quantities',
    ],
    specialKnowledge: `PHARMACY-SPECIFIC RULES:
- "Expiry" or "expiration" is CRITICAL. Always check batch expiry dates when asked about stock.
- Controlled substances (narcotics, psychotropics) require tight stock tracking and often separate storage.
- "Prescription" (Rx) items require a doctor\'s prescription; "OTC" (Over-The-Counter) do not.
- "Generic" vs "Branded" : generics have same active ingredient but lower price.
- When asked about batches: query products with batch/serial tracking enabled and show expiry dates.
- Expired stock must be written off and disposed of according to regulations — do NOT sell.
- Fast movers in pharmacies often include painkillers, antibiotics, and chronic disease meds.
- Suggest FIFO (First-In-First-Out) for all pharmacy inventory to minimize expiry losses.`,
  },

  construction: {
    industry: 'construction',
    displayName: 'Construction',
    keywords: ['construction', 'builder', 'contractor', 'cement', 'building', 'engineering', 'project', 'site', 'subcontractor', 'masonry'],
    specificMetrics: [
      'project completion % by phase',
      'material cost vs budget variance',
      'labor cost per square meter',
      'equipment utilization',
      'subcontractor payment status',
      'delay days by project',
      'wastage rate (cement, steel, sand)',
    ],
    commonQuestions: [
      'What is my project completion status?',
      'Which materials are running low on site?',
      'How much cement have I used this month?',
      'Which subcontractors are unpaid?',
      'What is my labor cost vs budget?',
    ],
    dataQueries: [
      'Get stock levels of construction materials',
      'Get purchase orders for materials',
      'Get supplier payment status',
      'Get stock movement (consumption by site)',
      'Get low stock alerts for critical materials',
    ],
    specialKnowledge: `CONSTRUCTION-SPECIFIC RULES:
- Materials are often consumed at "sites" or "projects" rather than sold.
- Track material "issuance" to sites as a stock OUT movement.
- Cement, steel rods, and sand are the top 3 materials by volume and cost.
- "Wastage" is normal in construction (3-8% for cement, 5-10% for steel). Track and compare to industry norms.
- Subcontractor payments are milestone-based; track retention (typically 5-10% held until project completion).
- Equipment (mixers, excavators) should track utilization and maintenance schedules.`,
  },

  manufacturing: {
    industry: 'manufacturing',
    displayName: 'Manufacturing',
    keywords: ['manufacturing', 'factory', 'production', 'assembly', 'processing', 'raw material', 'work order', 'bom', 'batch production'],
    specificMetrics: [
      'production yield rate',
      'defect / rejection rate',
      'machine downtime',
      'raw material cost per unit',
      'overhead allocation per unit',
      'work-in-progress (WIP) value',
      'order lead time',
    ],
    commonQuestions: [
      'What is my production yield rate?',
      'Which raw materials are running low?',
      'What is my defect rate this month?',
      'How much is tied up in WIP?',
      'Which machine has the most downtime?',
    ],
    dataQueries: [
      'Get raw material stock levels',
      'Get stock movement (raw materials consumed)',
      'Get product performance (finished goods)',
      'Get low stock alerts for raw materials',
      'Get purchase orders for raw materials',
    ],
    specialKnowledge: `MANUFACTURING-SPECIFIC RULES:
- "BOM" = Bill of Materials = list of raw materials needed per finished product unit.
- "WIP" = Work In Progress = partially completed goods that have consumed raw materials but are not finished.
- "Yield" = (good units produced / total units started) x 100%. Track this as a key quality metric.
- "Defect rate" = (defective units / total units produced) x 100%. Target is <2% for most industries.
- "Machine downtime" should be tracked by machine and reason (maintenance, breakdown, no raw material).
- Overhead includes electricity, rent, depreciation, and indirect labor. Suggest activity-based costing.
- Reorder points for raw materials should consider supplier lead time + safety stock.`,
  },

  hospitality: {
    industry: 'hospitality',
    displayName: 'Hospitality (Hotel / Restaurant)',
    keywords: ['hotel', 'restaurant', 'cafe', 'bar', 'tourism', 'guesthouse', 'hospitality', 'room', 'menu', 'occupancy', 'guest'],
    specificMetrics: [
      'occupancy rate',
      'average daily rate (ADR)',
      'revenue per available room (RevPAR)',
      'food cost percentage',
      'labor cost percentage',
      'table turnover rate',
      'guest satisfaction score',
    ],
    commonQuestions: [
      'What is my occupancy rate this month?',
      'What is my average daily rate?',
      'Which menu items have the highest margin?',
      'What is my food cost percentage?',
      'Show me room availability for next week',
    ],
    dataQueries: [
      'Get sales by product category (food/beverage/room)',
      'Get product performance (menu items)',
      'Get low stock alerts (food & beverage)',
      'Get client sales report (repeat guests)',
      'Get stock movement (F&B consumption)',
    ],
    specialKnowledge: `HOSPITALITY-SPECIFIC RULES:
- "Occupancy rate" = (rooms sold / rooms available) x 100%. 60-70% is healthy in Kigali.
- "ADR" = Average Daily Rate = total room revenue / rooms sold.
- "RevPAR" = Revenue Per Available Room = ADR x Occupancy Rate. This is the #1 metric for hotels.
- "Food cost %" = (cost of food ingredients / food revenue) x 100%. Target: 25-35% for restaurants.
- "Labor cost %" = (total staff cost / total revenue) x 100%. Target: 20-30% for hotels.
- Perishable inventory (food) requires FIFO and strict expiry management.
- Room rates often vary by season and day of week (yield management).`,
  },

  agriculture: {
    industry: 'agriculture',
    displayName: 'Agriculture / Farming',
    keywords: ['farm', 'crop', 'livestock', 'harvest', 'seed', 'fertilizer', 'produce', 'agriculture', 'irrigation', 'planting'],
    specificMetrics: [
      'yield per hectare',
      'post-harvest loss rate',
      'input cost per kg produced',
      'crop cycle time',
      'weather-adjusted yield',
      'market price vs production cost',
      'storage capacity utilization',
    ],
    commonQuestions: [
      'What is my yield per hectare?',
      'How much post-harvest loss do I have?',
      'What is my input cost per kg?',
      'Which crops are most profitable?',
      'When should I plant next season?',
    ],
    dataQueries: [
      'Get product performance (crop revenue and margin)',
      'Get stock levels (seeds, fertilizer, harvested produce)',
      'Get stock movement (inputs consumed, produce sold)',
      'Get low stock alerts for inputs',
      'Get sales by product (crop type)',
    ],
    specialKnowledge: `AGRICULTURE-SPECIFIC RULES:
- "Post-harvest loss" in Rwanda averages 15-25% for grains and 20-40% for fruits/vegetables due to poor storage.
- "Input cost" includes seeds, fertilizer, pesticides, labor, and irrigation.
- "Yield per hectare" varies by crop: maize (2-4 tons/ha), rice (5-7 tons/ha), potatoes (10-20 tons/ha).
- Storage is critical — suggest investment in hermetic bags or cold storage when losses are high.
- Seasonal cash flow is a major challenge: income comes at harvest, expenses are year-round.
- Track "cost per kg" for each crop to identify the most profitable crops to expand.`,
  },

  technology: {
    industry: 'technology',
    displayName: 'Technology / Software / IT',
    keywords: ['tech', 'software', 'it', 'digital', 'app', 'saas', 'development', 'subscription', 'mrr', 'churn'],
    specificMetrics: [
      'monthly recurring revenue (MRR)',
      'annual recurring revenue (ARR)',
      'customer churn rate',
      'customer acquisition cost (CAC)',
      'lifetime value (LTV)',
      'LTV:CAC ratio',
      'net revenue retention',
    ],
    commonQuestions: [
      'What is my MRR?',
      'What is my churn rate?',
      'How much is my ARR?',
      'What is my customer lifetime value?',
      'Show me subscription revenue trend',
    ],
    dataQueries: [
      'Get recurring invoices (subscriptions)',
      'Get client sales report (by revenue)',
      'Get sales chart (trend over time)',
      'Get product performance (service lines)',
      'Get accounts receivable aging',
    ],
    specialKnowledge: `TECHNOLOGY-SPECIFIC RULES:
- "MRR" = Monthly Recurring Revenue = sum of all active subscriptions.
- "ARR" = Annual Recurring Revenue = MRR x 12.
- "Churn rate" = (customers lost in period / customers at start) x 100%. Target: <5% monthly for SaaS.
- "CAC" = Customer Acquisition Cost = total sales+marketing spend / new customers acquired.
- "LTV" = Lifetime Value = average revenue per customer x average customer lifespan.
- Healthy SaaS business: LTV:CAC ratio >= 3:1 and payback period on CAC < 12 months.
- Recurring invoices and subscriptions are the primary revenue model; track them carefully.
- "Net Revenue Retention" = (starting MRR + expansions - contractions - churn) / starting MRR. >100% is excellent.`,
  },

  healthcare: {
    industry: 'healthcare',
    displayName: 'Healthcare / Clinic / Medical',
    keywords: ['clinic', 'pharmacy', 'hospital', 'health', 'medical', 'patient', 'consultation', 'procedure', 'insurance', 'lab'],
    specificMetrics: [
      'patient visits per day',
      'average consultation revenue',
      'lab test turnaround time',
      'insurance claim approval rate',
      'medical supply stock levels',
      'equipment maintenance schedule',
      'patient satisfaction score',
    ],
    commonQuestions: [
      'How many patients visited this month?',
      'What is my average consultation fee?',
      'Which medical supplies are running low?',
      'What is my insurance claim approval rate?',
      'Show me revenue by service type',
    ],
    dataQueries: [
      'Get sales by product category (consultation/lab/pharmacy)',
      'Get low stock alerts for medical supplies',
      'Get product performance (services)',
      'Get client sales report (patients)',
      'Get stock movement (medical supplies)',
    ],
    specialKnowledge: `HEALTHCARE-SPECIFIC RULES:
- Revenue streams: consultations, lab tests, procedures, pharmacy sales, and insurance claims.
- "Insurance claim approval rate" = (approved claims / total claims submitted) x 100%. Track rejections to fix billing errors.
- Medical supplies have expiry dates just like pharmaceuticals. Check expiry before recommending use.
- Equipment maintenance must be scheduled (X-ray, ultrasound, lab analyzers). Downtime = lost revenue.
- Patient confidentiality is paramount. Never expose patient names or medical records in responses.
- Track "revenue per patient visit" and "revenue per bed day" for clinics with inpatient services.`,
  },

  transport: {
    industry: 'transport',
    displayName: 'Transport / Logistics',
    keywords: ['transport', 'logistics', 'trucking', 'delivery', 'fleet', 'cargo', 'shipping', 'vehicle', 'route', 'fuel'],
    specificMetrics: [
      'fleet utilization rate',
      'cost per km',
      'fuel efficiency (km per liter)',
      'on-time delivery rate',
      'average route distance',
      'maintenance cost per vehicle',
      'driver overtime hours',
    ],
    commonQuestions: [
      'What is my fleet utilization rate?',
      'What is my cost per km?',
      'Which vehicles need maintenance?',
      'What is my fuel consumption this month?',
      'Show me delivery performance',
    ],
    dataQueries: [
      'Get stock levels (fuel, spare parts)',
      'Get stock movement (fuel consumed, parts used)',
      'Get low stock alerts (spare parts)',
      'Get purchase orders (fuel, parts)',
      'Get supplier purchase report',
    ],
    specialKnowledge: `TRANSPORT-SPECIFIC RULES:
- "Fleet utilization" = (km driven / total available km capacity) x 100%. Target: >70% for commercial fleets.
- "Cost per km" = (fuel + maintenance + driver wages + insurance + depreciation) / total km.
- Fuel is typically 40-60% of total operating cost. Monitor fuel efficiency closely.
- Maintenance should be preventive (scheduled) not reactive (breakdown). Track service intervals.
- Driver overtime increases costs and fatigue-related accidents. Track and manage.
- Empty return trips (backhauling) waste fuel. Suggest load-matching opportunities.
- Spare parts inventory must balance availability vs carrying cost.`,
  },

  general: {
    industry: 'general',
    displayName: 'General Business',
    keywords: ['business', 'company', 'enterprise', 'trade', 'services'],
    specificMetrics: [
      'revenue growth rate',
      'gross margin',
      'operating margin',
      'net profit margin',
      'cash conversion cycle',
      'debt-to-equity ratio',
      'return on assets',
    ],
    commonQuestions: [
      'What is my revenue this month?',
      'What is my profit margin?',
      'How much cash do I have?',
      'Which clients owe me money?',
      'What are my top selling products?',
    ],
    dataQueries: [
      'Get dashboard stats',
      'Get sales summary',
      'Get accounts receivable aging',
      'Get accounts payable aging',
      'Get product performance report',
    ],
    specialKnowledge: `GENERAL BUSINESS RULES:
- Use standard business metrics: revenue, gross profit, operating profit, net profit.
- "Gross margin" = (revenue - COGS) / revenue x 100%.
- "Operating margin" = operating profit / revenue x 100%.
- "Cash conversion cycle" = DIO + DSO - DPO (Days Inventory Outstanding + Days Sales Outstanding - Days Payable Outstanding).
- When unsure of the industry, provide general business advice and suggest setting the industry in company profile for more specific insights.`,
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

export function detectIndustry(text: string): IndustryModule {
  const lower = text.toLowerCase();
  for (const [key, config] of Object.entries(INDUSTRY_CONFIGS)) {
    if (config.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return key as IndustryModule;
    }
  }
  return 'general';
}

export function getIndustryConfig(industry: IndustryModule): IndustryConfig {
  return INDUSTRY_CONFIGS[industry] || INDUSTRY_CONFIGS.general;
}

export function isIndustryQuery(text: string): boolean {
  const lower = text.toLowerCase();
  // Check if any industry keyword matches
  for (const config of Object.values(INDUSTRY_CONFIGS)) {
    for (const kw of config.keywords) {
      if (lower.includes(kw.toLowerCase())) return true;
    }
  }
  // Also check for industry-specific question patterns
  return /\b(batch|expiry|expiration|prescription|medicine|drug|controlled|dosage|formulation|concrete|cement|steel|rebar|occupancy|adr|revpar|mrr|churn|cac|ltv|yield per hectare|fleet|route|delivery|patient|consultation|procedure|production|yield rate|defect|wip|bom|machine downtime)\b/i.test(lower);
}

export function getAllIndustryConfigs(): IndustryConfig[] {
  return Object.values(INDUSTRY_CONFIGS);
}

/**
 * Format industry-specific instructions for the LLM.
 */
export function formatIndustryInstructions(industry: IndustryModule): string {
  const config = getIndustryConfig(industry);
  return `INDUSTRY CONTEXT: You are advising a ${config.displayName} business.
${config.specialKnowledge}

Common questions for this industry:
${config.commonQuestions.map(q => `- ${q}`).join('\n')}

Relevant data queries you can reference:
${config.dataQueries.map(q => `- ${q}`).join('\n')}

Key metrics to track:
${config.specificMetrics.map(m => `- ${m}`).join('\n')}`;
}

/**
 * Detect if a user is asking about workflows or automation.
 */
export function isWorkflowQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(auto|workflow|automation|automatic|schedule|cron|trigger|remind|reminder|notify|alert|send email|generate report|purchase order|reorder|replenish|overdue|follow up|every (monday|tuesday|wednesday|thursday|friday|saturday|sunday|day|week|month)|daily|weekly|monthly)\b/i.test(lower);
}
