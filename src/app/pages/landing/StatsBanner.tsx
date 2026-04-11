import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Building2, Users, Package, TrendingUp, Receipt, RotateCcw } from 'lucide-react';

interface StatItemProps {
  icon: React.ElementType;
  value: number;
  suffix: string;
  label: string;
  isDark: boolean;
  delay: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(0) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'K';
  }
  return num.toString();
}

function StatItem({ icon: Icon, value, suffix, label, isDark, delay }: StatItemProps) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const timeout = setTimeout(() => {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isVisible, value, delay]);

  const displayValue = count >= 1000 ? formatNumber(count) : count.toLocaleString();

  return (
    <div
      ref={ref}
      className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl transition-all duration-500 hover:scale-105 text-center sm:text-left w-full overflow-hidden"
      style={{
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.8)',
        border: `1px solid ${isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.1)'}`,
        backdropFilter: 'blur(10px)',
      }}
    >
      <div 
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: isDark ? 'rgba(124, 58, 237, 0.2)' : 'rgba(124, 58, 237, 0.1)' }}
      >
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
          {displayValue}{suffix}
        </p>
        <p className="text-xs sm:text-sm leading-tight" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
          {label}
        </p>
      </div>
    </div>
  );
}

export function StatsBanner() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const stats = [
    { icon: Building2, value: 500, suffix: '+', label: t('landing.stats.businesses') },
    { icon: Users, value: 2500, suffix: '+', label: t('landing.stats.users') },
    { icon: Package, value: 1000000, suffix: '+', label: t('landing.stats.productsTracked') },
    { icon: Receipt, value: 500000, suffix: '+', label: t('landing.stats.invoicesGenerated') },
    { icon: RotateCcw, value: 99, suffix: '%', label: t('landing.stats.accuracy') },
    { icon: TrendingUp, value: 40, suffix: '%', label: t('landing.stats.efficiencyGain') },
  ];

  return (
    <section 
      className="py-12 relative overflow-hidden"
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e1b4b 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #ede9fe 100%)',
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}
        />
        <div 
          className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-3xl animate-pulse"
          style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', animationDelay: '2s' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10">
          <p 
            className="text-sm font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#7c3aed' }}
          >
            {t('landing.stats.trustedBy')}
          </p>
          <h2 className="text-2xl md:text-3xl font-bold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {t('landing.stats.joinTheMovement')}
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {stats.map((stat, index) => (
            <StatItem
              key={index}
              icon={stat.icon}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              isDark={isDark}
              delay={index * 100}
            />
          ))}
        </div>

        {/* Live Activity Indicator */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            {t('landing.stats.liveTracking')}
          </p>
        </div>
      </div>
    </section>
  );
}

export default StatsBanner;
