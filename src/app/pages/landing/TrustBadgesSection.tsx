import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, Globe, CheckCircle2 } from 'lucide-react';

export function TrustBadgesSection() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const securityFeatures = [
    { icon: Shield, label: t('landing.trust.sslEncryption'), desc: '256-bit SSL' },
    { icon: Lock, label: t('landing.trust.dataProtection'), desc: 'GDPR Ready' },
    { icon: CheckCircle2, label: t('landing.trust.soc2'), desc: 'SOC 2 Type II' },
  ];

  const stats = [
    { value: '99.9%', label: t('landing.trust.uptime') },
    { value: '24/7', label: t('landing.trust.support') },
    { value: 'Kigali', label: t('landing.trust.localServers') },
    { value: '<100ms', label: t('landing.trust.responseTime') },
  ];

  return (
    <section className="py-16" style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Security Badges Row */}
        <div className="flex flex-wrap items-center justify-center gap-8 mb-12">
          {securityFeatures.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105"
              style={{
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                boxShadow: isDark 
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: isDark ? '#312e81' : '#e0e7ff' }}
              >
                <feature.icon className="w-5 h-5" style={{ color: '#6366f1' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                  {feature.label}
                </p>
                <p className="text-xs" style={{ color: isDark ? '#64748b' : '#64748b' }}>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-4 rounded-xl transition-all duration-300 hover:scale-105"
              style={{
                backgroundColor: isDark ? 'rgba(124, 58, 237, 0.1)' : 'rgba(124, 58, 237, 0.05)',
                border: `1px solid ${isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.1)'}`,
              }}
            >
              <p className="text-2xl md:text-3xl font-bold text-purple-500 mb-1">
                {stat.value}
              </p>
              <p className="text-xs md:text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Trust Banner */}
        <div 
          className="mt-12 p-6 rounded-2xl text-center"
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(79, 70, 229, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(79, 70, 229, 0.05) 100%)',
            border: `1px solid ${isDark ? 'rgba(124, 58, 237, 0.3)' : 'rgba(124, 58, 237, 0.2)'}`,
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-purple-500" />
            <span className="font-semibold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
              {t('landing.trust.rwandaBuilt')}
            </span>
          </div>
          <p className="text-sm max-w-2xl mx-auto" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            {t('landing.trust.rwandaBuiltDesc')}
          </p>
        </div>
      </div>
    </section>
  );
}

export default TrustBadgesSection;
