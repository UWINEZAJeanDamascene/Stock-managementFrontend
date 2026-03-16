import { Package, FileText, Building2, Users, ClipboardCheck, Bell } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export function FeaturesSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const features = [
    { icon: Package, titleKey: 'landing.featuresList.productTracking.title', descKey: 'landing.featuresList.productTracking.desc' },
    { icon: FileText, titleKey: 'landing.featuresList.invoicesQuotations.title', descKey: 'landing.featuresList.invoicesQuotations.desc' },
    { icon: Building2, titleKey: 'landing.featuresList.supplierManagement.title', descKey: 'landing.featuresList.supplierManagement.desc' },
    { icon: Users, titleKey: 'landing.featuresList.clientManagement.title', descKey: 'landing.featuresList.clientManagement.desc' },
    { icon: ClipboardCheck, titleKey: 'landing.featuresList.stockAudits.title', descKey: 'landing.featuresList.stockAudits.desc' },
    { icon: Bell, titleKey: 'landing.featuresList.reorderAlerts.title', descKey: 'landing.featuresList.reorderAlerts.desc' },
  ];

  return (
    <section id="features" className="py-4 md:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl md:text-3xl font-bold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {t('landing.featuresTitle')}
          </h2>
        </div>

        {/* Features Grid - 3x2 */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-4 rounded-xl border hover:shadow-lg transition-all duration-300"
              style={{ 
                backgroundColor: isDark ? '#1e293b' : '#f8fafc', 
                borderColor: isDark ? '#334155' : '#e2e8f0' 
              }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" 
                style={{ backgroundColor: isDark ? '#4c1d95' : '#f3e8ff' }}>
                <feature.icon className="w-5 h-5" style={{ color: isDark ? '#a78bfa' : '#7c3aed' }} />
              </div>
              <h3 className="text-base font-semibold mb-1" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                {t(feature.titleKey)}
              </h3>
              <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                {t(feature.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
