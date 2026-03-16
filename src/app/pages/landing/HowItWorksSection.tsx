import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export function HowItWorksSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const steps = [
    { number: '1', titleKey: 'landing.steps.step1.title', descKey: 'landing.steps.step1.desc' },
    { number: '2', titleKey: 'landing.steps.step2.title', descKey: 'landing.steps.step2.desc' },
    { number: '3', titleKey: 'landing.steps.step3.title', descKey: 'landing.steps.step3.desc' },
  ];

  return (
    <section id="how-it-works" className="py-20" style={{ backgroundColor: isDark ? '#0f172a' : '#f2f2f2' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {t('landing.howItWorksTitle')}
          </h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5" 
            style={{ backgroundColor: isDark ? '#334155' : '#cbd5e1' }} />
          
          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                {/* Step Number Circle */}
                <div className="w-14 h-14 mx-auto mb-6 rounded-full flex items-center justify-center text-2xl font-bold text-white" 
                  style={{ backgroundColor: '#7c3aed' }}>
                  {step.number}
                </div>
                
                {/* Step Content */}
                <h3 className="text-xl font-semibold mb-3" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  {t(step.titleKey)}
                </h3>
                <p style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                  {t(step.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
