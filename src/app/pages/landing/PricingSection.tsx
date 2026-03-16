import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Link } from 'react-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export function PricingSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: 'STARTER',
      price: 'Rwf 15k',
      period: '/mo',
      popular: false,
      features: [
        { key: 'landing.planFeatures.products50', included: true },
        { key: 'landing.planFeatures.warehouse1', included: true },
        { key: 'landing.planFeatures.invoices', included: true },
        { key: 'landing.planFeatures.quotations', included: true },
        { key: 'landing.planFeatures.basicReports', included: false },
        { key: 'landing.planFeatures.creditNotes', included: false },
        { key: 'landing.planFeatures.recurringInvoices', included: false },
        { key: 'landing.planFeatures.dataExport', included: false },
        { key: 'landing.planFeatures.serialNumbers', included: false },
        { key: 'landing.planFeatures.stockAudits', included: false },
        { key: 'landing.planFeatures.prioritySupport', included: false },
      ],
      ctaKey: 'landing.planCta.getStarted',
    },
    {
      name: 'BUSINESS',
      price: 'Rwf 30k',
      period: '/mo',
      popular: true,
      features: [
        { key: 'landing.planFeatures.products500', included: true },
        { key: 'landing.planFeatures.warehouses3', included: true },
        { key: 'landing.planFeatures.invoices', included: true },
        { key: 'landing.planFeatures.quotations', included: true },
        { key: 'landing.planFeatures.advancedReports', included: true },
        { key: 'landing.planFeatures.creditNotes', included: true },
        { key: 'landing.planFeatures.recurringInvoices', included: true },
        { key: 'landing.planFeatures.pdfExport', included: true },
        { key: 'landing.planFeatures.serialNumbers', included: false },
        { key: 'landing.planFeatures.stockAudits', included: false },
        { key: 'landing.planFeatures.prioritySupport', included: false },
      ],
      ctaKey: 'landing.planCta.startTrial',
    },
    {
      name: 'PRO',
      price: 'Rwf 45k',
      period: '/mo',
      popular: false,
      features: [
        { key: 'landing.planFeatures.unlimitedProducts', included: true },
        { key: 'landing.planFeatures.unlimitedWarehouses', included: true },
        { key: 'landing.planFeatures.invoices', included: true },
        { key: 'landing.planFeatures.quotations', included: true },
        { key: 'landing.planFeatures.advancedReports', included: true },
        { key: 'landing.planFeatures.creditNotes', included: true },
        { key: 'landing.planFeatures.recurringInvoices', included: true },
        { key: 'landing.planFeatures.pdfExcelExport', included: true },
        { key: 'landing.planFeatures.serialNumbers', included: true },
        { key: 'landing.planFeatures.stockAudits', included: true },
        { key: 'landing.planFeatures.prioritySupport', included: true },
      ],
      ctaKey: 'landing.planCta.startTrial',
    },
  ];

  const allPlanFeatureKeys = [
    'landing.allPlanFeatures.secureStorage',
    'landing.allPlanFeatures.localSupport',
    'landing.allPlanFeatures.regularUpdates',
    'landing.allPlanFeatures.mobileFriendly',
    'landing.allPlanFeatures.posIntegration',
    'landing.allPlanFeatures.barcodeScanning',
  ];

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
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
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
                    {isYearly && plan.price !== 'Rwf 15k' 
                      ? `Rwf ${Math.round(parseInt(plan.price.replace('Rwf ', '')) * 0.8)}k` 
                      : plan.price}
                  </span>
                  <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{plan.period}</span>
                </div>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? '#475569' : '#94a3b8' }} />
                    )}
                    <span style={{ color: feature.included ? (isDark ? '#cbd5e1' : '#334155') : (isDark ? '#475569' : '#94a3b8') }}>
                      {t(feature.key)}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Button
                asChild
                className="w-full text-white font-medium"
                style={{ 
                  backgroundColor: plan.popular ? '#7c3aed' : (isDark ? '#f1f5f9' : '#0f172a'),
                  color: plan.popular ? '#ffffff' : (isDark ? '#0f172a' : '#ffffff')
                }}
              >
                <Link to="/register">{t(plan.ctaKey)}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* All Plans Include */}
        <div className="mt-12 text-center">
          <p className="mb-4" style={{ color: isDark ? '#94a3b8' : '#475569' }}>{t('landing.allPlansInclude')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {allPlanFeatureKeys.map((key) => (
              <div key={key} className="flex items-center gap-2 text-sm" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                <Check className="w-4 h-4 text-green-500" />
                <span>{t(key)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
