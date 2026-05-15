import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Link } from 'react-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { companyService } from '@/services';

export function PricingSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const [isYearly, setIsYearly] = useState(false);
  const [plans, setPlans] = useState<Array<{ key: string; name: string; description: string; features: string[]; modules: string[]; outcomes: string[]; badge: string; icon: string; featured: boolean; button_label: string; default_billing_amount: number; default_billing_cycle: string; sort_order: number }>>([]);
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

  const uiPlans = plans.map((plan) => {
    const priceLabel = plan.default_billing_amount === 0
      ? 'Free'
      : `Rwf ${Math.round(plan.default_billing_amount / 1000)}k`;
    return {
      name: plan.name.toUpperCase(),
      price: priceLabel,
      period: plan.default_billing_cycle === 'annual' ? '/ year' : plan.default_billing_cycle === 'quarterly' ? '/ quarter' : '/ month',
      popular: plan.featured,
      modules: plan.modules?.length ? plan.modules : plan.features,
      outcomes: plan.outcomes?.length ? plan.outcomes : [],
      buttonLabel: plan.button_label || `Choose ${plan.name}`,
      ctaKey: plan.default_billing_amount === 0 ? 'landing.planCta.getStarted' : 'landing.planCta.startTrial',
    };
  });

  const allPlanFeatures = plans.length > 0
    ? Array.from(new Set(plans.flatMap((p) => p.features)))
    : [];

  return (
    <section id="pricing" className="py-20" style={{ backgroundColor: isDark ? '#1e293b' : '#f2f2f2' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {t('landing.pricingTitle')}
          </h2>
        </div>

        {/* Monthly/Yearly Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center rounded-full p-1" style={{ backgroundColor: isDark ? '#334155' : '#f1f5f9' }}>
            <button
              onClick={() => setIsYearly(false)}
              className="px-6 py-2 rounded-full text-sm font-medium transition-all"
              style={{ 
                backgroundColor: !isYearly ? (isDark ? '#475569' : '#ffffff') : 'transparent',
                color: !isYearly ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b'),
                boxShadow: !isYearly ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {t('landing.monthly')}
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className="px-6 py-2 rounded-full text-sm font-medium transition-all"
              style={{ 
                backgroundColor: isYearly ? (isDark ? '#475569' : '#ffffff') : 'transparent',
                color: isYearly ? (isDark ? '#ffffff' : '#0f172a') : (isDark ? '#94a3b8' : '#64748b'),
                boxShadow: isYearly ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {t('landing.yearly')}
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-xl" style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }} />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {uiPlans.map((plan, index) => (
              <div
                key={index}
                className="relative rounded-xl p-6"
                style={{ 
                  backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                  borderColor: plan.popular ? '#7c3aed' : (isDark ? '#334155' : '#d1d1d1'),
                  borderWidth: plan.popular ? '2px' : '1px',
                  boxShadow: plan.popular ? '0 20px 25px -5px rgba(124, 58, 237, 0.15)' : ''
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-white text-xs font-semibold rounded-full" 
                    style={{ backgroundColor: '#7c3aed' }}>
                    {t('landing.mostPopular')}
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-1" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                      {plan.price}
                    </span>
                    <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{plan.period}</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-6">
                  {plan.modules.map((module, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{module}</span>
                    </li>
                  ))}
                </ul>
                {plan.outcomes.length > 0 && (
                  <div className="mb-6 rounded-lg p-3" style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Best outcome</p>
                    <div className="space-y-1">
                      {plan.outcomes.map((outcome, i) => (
                        <p key={i} className="text-sm" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{outcome}</p>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button
                  asChild
                  className="w-full text-white font-medium"
                  style={{ 
                    backgroundColor: plan.popular ? '#7c3aed' : (isDark ? '#f1f5f9' : '#0f172a'),
                    color: plan.popular ? '#ffffff' : (isDark ? '#0f172a' : '#ffffff')
                  }}
                >
                  <Link to="/register">{plan.buttonLabel}</Link>
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* All Plans Include */}
        <div className="mt-12 text-center">
          <p className="mb-4" style={{ color: isDark ? '#94a3b8' : '#475569' }}>{t('landing.allPlansInclude')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {allPlanFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                <Check className="w-4 h-4 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
