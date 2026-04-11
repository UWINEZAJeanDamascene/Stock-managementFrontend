import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { 
  Package, FileText, Building2, Users, ClipboardCheck, Bell, 
  TrendingUp, BarChart3, QrCode, Calculator, Zap,
  ArrowRight, CheckCircle2
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  benefits: string[];
  color: string;
}

interface FeatureCategory {
  id: string;
  label: string;
  features: Feature[];
}

export function FeaturesSectionEnhanced() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('inventory');

  const categories: FeatureCategory[] = [
    {
      id: 'inventory',
      label: t('landing.featureTabs.inventory'),
      features: [
        {
          icon: Package,
          title: t('landing.featuresList.productTracking.title'),
          description: t('landing.featuresList.productTracking.desc'),
          benefits: [
            t('landing.benefits.realTimeStock'),
            t('landing.benefits.multiWarehouse'),
            t('landing.benefits.serialNumbers'),
          ],
          color: '#7c3aed',
        },
        {
          icon: QrCode,
          title: t('landing.featuresList.barcodeScanning.title'),
          description: t('landing.featuresList.barcodeScanning.desc'),
          benefits: [
            t('landing.benefits.qrCode'),
            t('landing.benefits.barcode'),
            t('landing.benefits.bulkImport'),
          ],
          color: '#06b6d4',
        },
        {
          icon: ClipboardCheck,
          title: t('landing.featuresList.stockAudits.title'),
          description: t('landing.featuresList.stockAudits.desc'),
          benefits: [
            t('landing.benefits.cycleCounting'),
            t('landing.benefits.discrepancy'),
            t('landing.benefits.auditTrail'),
          ],
          color: '#10b981',
        },
      ],
    },
    {
      id: 'sales',
      label: t('landing.featureTabs.sales'),
      features: [
        {
          icon: FileText,
          title: t('landing.featuresList.invoicesQuotations.title'),
          description: t('landing.featuresList.invoicesQuotations.desc'),
          benefits: [
            t('landing.benefits.pdfExport'),
            t('landing.benefits.emailInvoices'),
            t('landing.benefits.recurring'),
          ],
          color: '#f59e0b',
        },
        {
          icon: Calculator,
          title: t('landing.featuresList.vatCalculations.title'),
          description: t('landing.featuresList.vatCalculations.desc'),
          benefits: [
            t('landing.benefits.automaticVAT'),
            t('landing.benefits.vatReports'),
            t('landing.benefits.rwandaCompliant'),
          ],
          color: '#8b5cf6',
        },
        {
          icon: TrendingUp,
          title: t('landing.featuresList.analytics.title'),
          description: t('landing.featuresList.analytics.desc'),
          benefits: [
            t('landing.benefits.salesReports'),
            t('landing.benefits.profitAnalysis'),
            t('landing.benefits.trends'),
          ],
          color: '#ec4899',
        },
      ],
    },
    {
      id: 'contacts',
      label: t('landing.featureTabs.contacts'),
      features: [
        {
          icon: Building2,
          title: t('landing.featuresList.supplierManagement.title'),
          description: t('landing.featuresList.supplierManagement.desc'),
          benefits: [
            t('landing.benefits.purchaseOrders'),
            t('landing.benefits.supplierHistory'),
            t('landing.benefits.paymentTracking'),
          ],
          color: '#3b82f6',
        },
        {
          icon: Users,
          title: t('landing.featuresList.clientManagement.title'),
          description: t('landing.featuresList.clientManagement.desc'),
          benefits: [
            t('landing.benefits.creditLimits'),
            t('landing.benefits.paymentHistory'),
            t('landing.benefits.loyaltyProgram'),
          ],
          color: '#14b8a6',
        },
      ],
    },
    {
      id: 'automation',
      label: t('landing.featureTabs.automation'),
      features: [
        {
          icon: Bell,
          title: t('landing.featuresList.reorderAlerts.title'),
          description: t('landing.featuresList.reorderAlerts.desc'),
          benefits: [
            t('landing.benefits.lowStock'),
            t('landing.benefits.emailAlerts'),
            t('landing.benefits.autoReorder'),
          ],
          color: '#f97316',
        },
        {
          icon: Zap,
          title: t('landing.featuresList.automation.title'),
          description: t('landing.featuresList.automation.desc'),
          benefits: [
            t('landing.benefits.autoInvoices'),
            t('landing.benefits.scheduledReports'),
            t('landing.benefits.webhooks'),
          ],
          color: '#eab308',
        },
      ],
    },
  ];

  const activeCategory = categories.find((c) => c.id === activeTab);

  return (
    <section id="features" className="py-20" style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{
              backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.1)',
            }}
          >
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-purple-500">
              {t('landing.featuresSection.badge')}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {t('landing.featuresTitle')}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            {t('landing.featuresSection.subtitle')}
          </p>
        </div>

        {/* Feature Tabs */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 mb-8 sm:mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveTab(category.id)}
              className="px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium text-sm sm:text-base transition-all duration-300 whitespace-nowrap"
              style={{
                backgroundColor: activeTab === category.id 
                  ? '#7c3aed' 
                  : (isDark ? '#1e293b' : '#f1f5f9'),
                color: activeTab === category.id 
                  ? '#ffffff' 
                  : (isDark ? '#94a3b8' : '#64748b'),
                transform: activeTab === category.id ? 'scale(1.02)' : 'scale(1)',
                boxShadow: activeTab === category.id 
                  ? '0 10px 25px -5px rgba(124, 58, 237, 0.4)' 
                  : 'none',
              }}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeCategory?.features.map((feature, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl transition-all duration-500 hover:scale-105"
              style={{
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                boxShadow: isDark 
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              {/* Glow effect on hover */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at 50% 0%, ${feature.color}20, transparent 70%)`,
                }}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${feature.color}20` }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold mb-2" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="mb-4" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  {feature.description}
                </p>

                {/* Benefits List */}
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: feature.color }} />
                      <span style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <Button
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white px-8"
          >
            {t('landing.featuresSection.exploreAll')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

      </div>
    </section>
  );
}

export default FeaturesSectionEnhanced;
