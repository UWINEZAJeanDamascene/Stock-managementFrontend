import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  Check,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Zap,
  Loader2,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { companyService } from '@/services';

const PLAN_ACCENTS = [
  'from-cyan-400 to-emerald-300',
  'from-amber-300 to-cyan-300',
  'from-emerald-300 to-white',
  'from-violet-400 to-fuchsia-300',
  'from-rose-300 to-orange-300',
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Boxes,
  BarChart3,
  ShieldCheck,
  Sparkles,
  LockKeyhole,
  Zap,
  Building2,
  Check,
  Layers3,
  ArrowRight,
  ArrowLeft,
};

const PLAN_BADGES = ['Entry tier', 'Mid-tier', 'Full access', 'Advanced', 'Custom'];

interface PlanData {
  key: string;
  name: string;
  description: string;
  features: string[];
  modules: string[];
  outcomes: string[];
  badge: string;
  icon: string;
  featured: boolean;
  button_label: string;
  default_billing_amount: number;
  default_billing_cycle: string;
  sort_order: number;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyService.getPublicSubscriptionPlans()
      .then((res) => {
        if (res.success) {
          setPlans(res.data.sort((a, b) => a.sort_order - b.sort_order));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const uiPlans = plans.map((plan, index) => {
    const priceAmount = plan.default_billing_amount === 0 ? 'Free' : `${Math.round(plan.default_billing_amount / 1000)}k`;
    const pricePeriod = plan.default_billing_amount === 0 ? '' : plan.default_billing_cycle === 'annual' ? '/ year' : plan.default_billing_cycle === 'quarterly' ? '/ quarter' : '/ month';
    return {
      key: plan.key,
      name: plan.name,
      priceAmount,
      pricePeriod,
      accent: PLAN_ACCENTS[index % PLAN_ACCENTS.length],
      badge: plan.badge || PLAN_BADGES[index % PLAN_BADGES.length],
      summary: plan.description || '',
      modules: plan.modules?.length ? plan.modules : plan.features,
      outcomes: plan.outcomes?.length ? plan.outcomes : [],
      icon: ICON_MAP[plan.icon] || Boxes,
      featured: plan.featured,
      buttonLabel: plan.button_label || `Choose ${plan.name}`,
    };
  });

  const moduleMatrix = plans.length > 0
    ? (plans[0].modules?.length ? plans[0].modules : plans[0].features).map((mod) => ({
        key: mod,
        title: mod,
        tiers: plans.filter((p) => (p.modules?.length ? p.modules : p.features).includes(mod)).map((p) => p.key),
      }))
    : [];
  const tierKeys = uiPlans.map((p) => p.key);

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

          <div className="grid gap-10 py-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-white/70 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-800 shadow-sm backdrop-blur dark:bg-white/8 dark:text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Subscription Pricing
              </div>
              <h1 className="mt-6 text-[3.2rem] font-bold leading-[1.05] tracking-tight sm:text-7xl">
                <span className="bg-gradient-to-r from-slate-950 via-cyan-700 to-emerald-600 bg-clip-text text-transparent dark:from-white dark:via-cyan-300 dark:to-emerald-400">
                  Scale your
                </span>
                <br />
                <span className="text-slate-950 dark:text-white">operations</span>
                <span className="bg-gradient-to-r from-cyan-600 to-emerald-500 bg-clip-text text-transparent">.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-500 dark:text-slate-400">
                No per-seat fees. No hidden charges. Pick the modules your business actually needs and grow into the next tier when you are ready.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(plans.length > 0 ? [
                { value: String(plans.length), label: 'Tiers to grow through' },
                { value: String(Array.from(new Set(plans.flatMap((p) => p.modules?.length ? p.modules : p.features))).length), label: 'Modules available' },
                { value: '0%', label: 'Hidden fees — ever' }
              ] : [
                { value: '3+', label: 'Tiers to grow through' },
                { value: '12+', label: 'Modules available' },
                { value: '0%', label: 'Hidden fees — ever' }
              ]).map((metric) => (
                <div key={metric.label} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-400" />
                  <p className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{metric.value}</p>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="px-4 pb-20 sm:px-6 lg:px-8">
        {loading ? (
          <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-96 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
            {uiPlans.map((plan) => (
              <article
                key={plan.key}
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
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-6xl font-semibold tracking-tight">{plan.priceAmount}</span>
                  {plan.pricePeriod && (
                    <span className="text-lg font-medium text-slate-500 dark:text-slate-400">{plan.pricePeriod}</span>
                  )}
                </div>
                <p className="mt-5 min-h-[72px] text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.summary}</p>
                <Link to="/register">
                  <Button className={`mt-6 h-11 w-full ${plan.featured ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                    {plan.buttonLabel}
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
        )}

        {!loading && moduleMatrix.length > 0 && (
          <section className="mx-auto mt-10 max-w-7xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Module matrix</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">What unlocks at each level</h2>
              </div>
              <div className="flex gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {uiPlans.map((plan) => (
                  <span key={plan.key} className="rounded-full border border-slate-200 px-3 py-1 dark:border-white/10">{plan.key}</span>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {moduleMatrix.map((module) => (
                <div key={module.key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-emerald-600 shadow-sm dark:bg-slate-950 dark:text-emerald-400">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold">{module.title}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {tierKeys.map((tier) => (
                      <span
                        key={tier}
                        className={`grid h-7 w-9 place-items-center rounded-md text-[11px] font-bold ${
                          module.tiers.includes(tier)
                            ? 'bg-slate-950 text-white dark:bg-cyan-300 dark:text-slate-950'
                            : 'bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-slate-600'
                        }`}
                      >
                        {tier.slice(0, 2)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-[1fr_0.62fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300">
              <Zap className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Need a different setup for each branch?</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Every tier maps to real modules in the system. You can mix permissions by branch, assign roles per user, and adjust access without touching the core configuration.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 p-8 text-white dark:bg-white dark:text-slate-950">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-emerald-400 dark:bg-slate-100 dark:text-emerald-600">
              <Building2 className="h-5 w-5" />
            </div>
            <h3 className="mt-6 text-2xl font-bold tracking-tight">No hidden fees</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300 dark:text-slate-600">
              The price covers the modules listed. No per-user charges, no transaction fees. You can move between tiers or cancel at any time.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
