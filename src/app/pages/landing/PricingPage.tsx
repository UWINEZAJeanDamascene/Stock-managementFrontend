import { Link } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  Boxes,
  Building2,
  Check,
  ClipboardCheck,
  FileText,
  Gauge,
  Layers3,
  LockKeyhole,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users2,
  WalletCards,
  Zap,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

const planGroups = [
  {
    name: 'Core Operations',
    price: '10k',
    accent: 'from-cyan-400 to-emerald-300',
    badge: 'Entry tier',
    summary: 'Product records, stock tracking, sales documents and purchase orders. No finance modules included.',
    modules: ['Dashboards', 'Products and categories', 'Warehouses', 'Stock levels and movements', 'Suppliers', 'Purchase orders', 'GRN', 'Clients', 'Quotations', 'Invoices'],
    outcomes: ['Track stock across warehouses', 'Manage suppliers and customers', 'Create quotes and invoices', 'View operational metrics'],
    icon: Boxes,
  },
  {
    name: 'Business Command',
    price: '15k',
    accent: 'from-amber-300 to-cyan-300',
    badge: 'Mid-tier',
    summary: 'Everything in Core plus banking, accounts receivable, accounts payable, expenses and reporting.',
    modules: ['Everything in Core', 'Sales orders', 'Pick and pack', 'Delivery notes', 'Credit notes', 'Recurring invoices', 'AR and AP', 'Bank accounts', 'Petty cash', 'Expenses', 'Reports hub'],
    outcomes: ['Track cash and bank balances', 'Manage what you owe and are owed', 'Recurring billing setup', 'Standard business reports'],
    icon: BarChart3,
    featured: true,
  },
  {
    name: 'Enterprise Control',
    price: '30k',
    accent: 'from-emerald-300 to-white',
    badge: 'Full access',
    summary: 'All modules including accounting, payroll, budgets, projects and system administration.',
    modules: ['Everything in Business', 'Chart of accounts', 'Journal entries', 'Fixed assets', 'Liabilities', 'Budgets', 'Projects', 'Employees', 'Payroll runs', 'Financial reports', 'Security, roles and audit trail', 'Backups and bulk data'],
    outcomes: ['Full general ledger and journals', 'Run payroll and manage staff', 'Project and budget tracking', 'Role-based access and audit logs'],
    icon: ShieldCheck,
  },
];

const moduleMap = [
  { title: 'Dashboards', icon: Gauge, tiers: ['10k', '15k', '30k'] },
  { title: 'Inventory', icon: PackageCheck, tiers: ['10k', '15k', '30k'] },
  { title: 'Purchasing', icon: ClipboardCheck, tiers: ['10k', '15k', '30k'] },
  { title: 'Sales', icon: ReceiptText, tiers: ['10k', '15k', '30k'] },
  { title: 'Banking and cash', icon: Banknote, tiers: ['15k', '30k'] },
  { title: 'AR / AP controls', icon: WalletCards, tiers: ['15k', '30k'] },
  { title: 'Budgets and projects', icon: BarChart3, tiers: ['30k'] },
  { title: 'Payroll and employees', icon: Users2, tiers: ['30k'] },
  { title: 'Reports suite', icon: FileText, tiers: ['15k', '30k'] },
  { title: 'Security and audit', icon: LockKeyhole, tiers: ['30k'] },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-950 dark:bg-[#06080d] dark:text-white">
      <section className="relative overflow-hidden px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(16,185,129,0.18),transparent_24%)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(74,222,128,0.12),transparent_24%)]" />
        <div className="relative mx-auto max-w-7xl">
          <header className="flex h-16 items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Layers3 className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold tracking-[0.18em]">STOCKMANAGER</span>
            </Link>
            <nav className="hidden items-center gap-5 lg:flex">
              <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Home</Link>
              <Link to="/platform" className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Platform</Link>
              <Link to="/operations" className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Operations</Link>
              <Link to="/trust" className="text-sm font-medium text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">Security</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link to="/" className="lg:hidden">
                <Button variant="ghost" size="sm" className="gap-1 px-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="sm" className="bg-white/70 dark:bg-white/8 hidden sm:inline-flex">Log in</Button>
                <Button variant="outline" size="icon" className="bg-white/70 dark:bg-white/8 sm:hidden h-9 w-9">
                  <span className="text-xs font-semibold">In</span>
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950">
                  <span className="hidden sm:inline">Start free</span>
                  <span className="sm:hidden">Start</span>
                </Button>
              </Link>
            </div>
          </header>

          <div className="grid gap-10 py-14 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-white/70 px-3 py-1.5 text-sm font-semibold text-cyan-800 shadow-sm backdrop-blur dark:bg-white/8 dark:text-cyan-200">
                <Sparkles className="h-4 w-4" />
                Pricing tied to available modules
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
                Three tiers. Same platform.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Each tier unlocks more modules. Core Operations covers inventory, sales and purchasing. Business Command adds banking, AR/AP and reporting. Enterprise Control brings in accounting, payroll, budgets and audit tools.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/86 p-4 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.05]">
              <div className="grid gap-3 sm:grid-cols-3">
                {['7 sidebar groups reviewed', '53+ module routes mapped', '3 upgrade paths'].map((metric) => (
                  <div key={metric} className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:bg-white/[0.05] dark:text-slate-200">
                    <BadgeCheck className="mb-5 h-5 w-5 text-emerald-500" />
                    {metric}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {planGroups.map((plan) => (
            <article
              key={plan.name}
              className={`relative overflow-hidden rounded-lg border bg-white p-6 shadow-sm dark:bg-white/[0.04] ${
                plan.featured
                  ? 'border-slate-950 shadow-2xl shadow-cyan-900/10 dark:border-cyan-300/60'
                  : 'border-slate-200 dark:border-white/10'
              }`}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${plan.accent}`} />
              {plan.featured && (
                <div className="absolute right-4 top-4 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white dark:bg-cyan-300 dark:text-slate-950">
                  Recommended
                </div>
              )}
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <plan.icon className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">{plan.badge}</p>
              <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-6xl font-semibold tracking-tight">{plan.price}</span>
                <span className="pb-2 text-sm font-medium text-slate-500 dark:text-slate-400">/ month</span>
              </div>
              <p className="mt-5 min-h-[72px] text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.summary}</p>
              <Link to="/register">
                <Button className={`mt-6 h-11 w-full ${plan.featured ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  Choose {plan.price}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <div className="mt-7">
                <h3 className="text-sm font-semibold">Included modules</h3>
                <div className="mt-3 grid gap-2">
                  {plan.modules.map((module) => (
                    <div key={module} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span>{module}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7 rounded-lg bg-slate-50 p-4 dark:bg-white/[0.05]">
                <h3 className="text-sm font-semibold">Best outcome</h3>
                <div className="mt-3 space-y-2">
                  {plan.outcomes.map((outcome) => (
                    <p key={outcome} className="text-sm leading-6 text-slate-600 dark:text-slate-300">{outcome}</p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="mx-auto mt-10 max-w-7xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Module matrix</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">What unlocks at each level</h2>
            </div>
            <div className="flex gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {['10k', '15k', '30k'].map((tier) => (
                <span key={tier} className="rounded-full border border-slate-200 px-3 py-1 dark:border-white/10">{tier}</span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {moduleMap.map((module) => (
              <div key={module.title} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-cyan-700 shadow-sm dark:bg-slate-950 dark:text-cyan-300">
                    <module.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold">{module.title}</span>
                </div>
                <div className="flex gap-1.5">
                  {['10k', '15k', '30k'].map((tier) => (
                    <span
                      key={tier}
                      className={`grid h-7 w-9 place-items-center rounded-md text-[11px] font-bold ${
                        module.tiers.includes(tier)
                          ? 'bg-slate-950 text-white dark:bg-cyan-300 dark:text-slate-950'
                          : 'bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-slate-600'
                      }`}
                    >
                      {tier}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-[1fr_0.62fr]">
          <div className="rounded-lg bg-slate-950 p-8 text-white dark:bg-white dark:text-slate-950">
            <Zap className="h-7 w-7 text-cyan-300 dark:text-cyan-700" />
            <h2 className="mt-5 text-3xl font-semibold tracking-tight">Custom access by branch, role or module?</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 dark:text-slate-600">
              Tiers map directly to module groups in the system. If you need a different combination, the structure supports custom permission sets without changing the underlying setup.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-white/[0.04]">
            <Building2 className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
            <h3 className="mt-5 text-2xl font-semibold">No hidden fees</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              The price covers the modules listed. No per-user charges, no transaction fees. You can move between tiers or cancel at any time.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
