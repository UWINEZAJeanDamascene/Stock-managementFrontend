/**
 * Stacy AI — Tax Calendar & Compliance Tracker (Phase 3: The Advisor)
 * Tracks Rwandan tax deadlines, computes days-until-due, and scores compliance risk.
 */

export type TaxType = 'VAT' | 'PAYE' | 'RSSB' | 'WHT' | 'CIT' | 'EBM' | 'Annual';
export type Frequency = 'monthly' | 'quarterly' | 'annual' | 'adhoc';
export type ComplianceStatus = 'compliant' | 'due-soon' | 'overdue' | 'unknown';

export interface TaxDeadline {
  taxType: TaxType;
  name: string;
  frequency: Frequency;
  dayOfMonth: number; // Due day (e.g., 15)
  graceDays: number;
  penaltyRate: string;
  description: string;
}

export interface ComplianceEvent {
  taxType: TaxType;
  name: string;
  dueDate: Date;
  daysUntil: number;
  status: ComplianceStatus;
  penaltyRisk: string;
  action: string;
}

// ─── Rwanda Tax Deadlines ─────────────────────────────────────────────────
const TAX_DEADLINES: TaxDeadline[] = [
  { taxType: 'VAT', name: 'VAT Return Filing (Monthly)', frequency: 'monthly', dayOfMonth: 15, graceDays: 0, penaltyRate: '10%/month late filing + 1.5%/month interest', description: 'File VAT return and remit payment by 15th of following month (for turnover > RWF 200M/year)' },
  { taxType: 'VAT', name: 'VAT Return Filing (Quarterly)', frequency: 'quarterly', dayOfMonth: 15, graceDays: 0, penaltyRate: '10%/month late filing + 1.5%/month interest', description: 'Quarterly VAT return for businesses with turnover <= RWF 200M/year' },
  { taxType: 'PAYE', name: 'PAYE Remittance', frequency: 'monthly', dayOfMonth: 15, graceDays: 0, penaltyRate: '10%/month late payment', description: 'Remit PAYE deducted from employee salaries by 15th of following month' },
  { taxType: 'RSSB', name: 'RSSB Declaration & Payment', frequency: 'monthly', dayOfMonth: 10, graceDays: 0, penaltyRate: '10%/month late payment', description: 'Pension (12% total: 6% employer + 6% employee), Maternity (0.3% employer), Occupational Hazards (0-2%)' },
  { taxType: 'WHT', name: 'Withholding Tax Remittance', frequency: 'monthly', dayOfMonth: 15, graceDays: 0, penaltyRate: '10%/month', description: 'Remit WHT on dividends, interest, royalties, services within 15 days following month of deduction' },
  { taxType: 'CIT', name: 'Corporate Income Tax Instalment (Q1-Q3)', frequency: 'quarterly', dayOfMonth: 15, graceDays: 0, penaltyRate: '10%/quarter', description: 'Instalment payments for CIT due 15th of month following quarter end' },
  { taxType: 'CIT', name: 'Corporate Income Tax Final Return', frequency: 'annual', dayOfMonth: 31, graceDays: 0, penaltyRate: '10%/month + interest', description: 'Annual CIT return due by 31 March following tax year end' },
  { taxType: 'EBM', name: 'EBM Reconciliation', frequency: 'monthly', dayOfMonth: 15, graceDays: 0, penaltyRate: 'RWF 200K–2M + suspension', description: 'Reconcile EBM sales data with VAT return' },
  { taxType: 'Annual', name: 'Company AGM', frequency: 'annual', dayOfMonth: 31, graceDays: 0, penaltyRate: 'Administrative sanctions', description: 'Annual General Meeting within 6 months of financial year end (Company Law)' },
];

// ─── Calendar Logic ───────────────────────────────────────────────────────

function getNextDueDate(dayOfMonth: number, frequency: Frequency, referenceDate: Date = new Date()): Date {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);

  if (frequency === 'monthly') {
    const target = new Date(d.getFullYear(), d.getMonth(), dayOfMonth);
    if (target < d) {
      target.setMonth(target.getMonth() + 1);
    }
    return target;
  }

  if (frequency === 'quarterly') {
    const quarter = Math.floor(d.getMonth() / 3);
    const targetMonth = quarter * 3 + 1; // Due in month after quarter end
    const target = new Date(d.getFullYear(), targetMonth, dayOfMonth);
    if (target < d) {
      target.setMonth(target.getMonth() + 3);
    }
    return target;
  }

  if (frequency === 'annual') {
    // Default: March 31 for annual filings
    const target = new Date(d.getFullYear(), 2, dayOfMonth); // Month is 0-indexed, 2 = March
    if (target < d) {
      target.setFullYear(target.getFullYear() + 1);
    }
    return target;
  }

  return d;
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Get all upcoming compliance events for the next 90 days.
 */
export function getUpcomingComplianceEvents(lookAheadDays: number = 90): ComplianceEvent[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const events: ComplianceEvent[] = [];

  for (const deadline of TAX_DEADLINES) {
    let due = getNextDueDate(deadline.dayOfMonth, deadline.frequency, now);
    const daysUntil = daysBetween(now, due);

    if (daysUntil <= lookAheadDays) {
      let status: ComplianceStatus = 'compliant';
      if (daysUntil < 0) status = 'overdue';
      else if (daysUntil <= 7) status = 'due-soon';

      events.push({
        taxType: deadline.taxType,
        name: deadline.name,
        dueDate: due,
        daysUntil,
        status,
        penaltyRisk: deadline.penaltyRate,
        action: deadline.description,
      });
    }
  }

  events.sort((a, b) => a.daysUntil - b.daysUntil);
  return events;
}

/**
 * Score overall compliance health (0–100).
 */
export function getComplianceScore(): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; urgent: ComplianceEvent[] } {
  const events = getUpcomingComplianceEvents(60);
  const overdue = events.filter(e => e.status === 'overdue');
  const dueSoon = events.filter(e => e.status === 'due-soon');

  let score = 100;
  score -= overdue.length * 25;
  score -= dueSoon.length * 10;
  score = Math.max(0, score);

  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
  if (score < 50) grade = 'F';
  else if (score < 65) grade = 'D';
  else if (score < 80) grade = 'C';
  else if (score < 90) grade = 'B';

  return { score, grade, urgent: [...overdue, ...dueSoon] };
}

/**
 * Format tax calendar into a compact prompt string.
 */
export function formatTaxCalendarContext(): string {
  const events = getUpcomingComplianceEvents(45);
  if (!events.length) return '';

  const parts = events.map(e => {
    const flag = e.status === 'overdue' ? 'OVERDUE' : e.status === 'due-soon' ? 'URGENT' : 'UPCOMING';
    return `${flag}|${e.taxType}|${e.name}|due:${e.daysUntil}d|penalty:${e.penaltyRisk}`;
  });

  return `TAX_CALENDAR:[${parts.join(',')}]`;
}

/**
 * Detect if a user is asking about tax deadlines or compliance.
 */
export function isTaxCalendarQuery(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(deadline|due date|filing date|when is.*due|tax calendar|compliance|overdue|upcoming|reminder|vat due|paye due|rra deadline|filing|return due)\b/i.test(lower);
}

/**
 * Instructions for the LLM when tax calendar data is injected.
 */
export function getTaxCalendarInstructions(): string {
  return `TAX CALENDAR RULES:
You have access to the user's upcoming tax deadlines in the TAX_CALENDAR section above.
- If any deadline is OVERDUE or URGENT (≤7 days), emphasize this prominently.
- State the exact number of days until the deadline.
- Mention the penalty risk so the user understands urgency.
- Suggest concrete next steps (e.g., "File your VAT return on the RRA portal today").
- If no urgent deadlines, reassure the user and note the next upcoming deadline.

If the user asks for a compliance overview or "what's coming up", output a structured tax alert block:
\`\`\`json
{"type":"tax_alert","complianceScore":85,"grade":"B","summary":"You have 2 upcoming deadlines and 1 overdue filing. Overall compliance is good.","events":[{"taxType":"VAT","name":"VAT Return Filing","daysUntil":3,"status":"due-soon","penaltyRisk":"10%/month late filing + 1.5%/month interest"},{"taxType":"RSSB","name":"RSSB Declaration & Payment","daysUntil":-2,"status":"overdue","penaltyRisk":"10%/month late payment"}]}
\`\`\`
Fields: type, complianceScore (0-100), grade (A-F), summary, events[{taxType, name, daysUntil, status (overdue|due-soon|compliant), penaltyRisk}]`;
}
