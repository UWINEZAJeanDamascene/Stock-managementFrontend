import { useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { ArrowRight, Package, BarChart3, Users, TrendingUp, ScanLine, Database, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HeroSection() {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Slow motion: 0.4x speed for cinematic feel
    const setSlowMotion = () => {
      video.playbackRate = 0.4;
    };

    video.addEventListener('loadedmetadata', setSlowMotion);
    video.addEventListener('play', setSlowMotion);

    // Also set immediately in case already loaded
    if (video.readyState >= 1) {
      setSlowMotion();
    }

    return () => {
      video.removeEventListener('loadedmetadata', setSlowMotion);
      video.removeEventListener('play', setSlowMotion);
    };
  }, []);

  return (
    <section className="relative isolate min-h-[50vh] md:min-h-screen flex items-center pt-8 md:pt-12 overflow-hidden">

      {/* ── Slow-Motion Video Background ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ zIndex: -20 }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        {/* Primary: young worker writing inventory data in warehouse shelves */}
        <source src="https://assets.mixkit.co/videos/4705/4705-720.mp4" type="video/mp4" />
        {/* Fallback: business people walking through warehouse */}
        <source src="https://assets.mixkit.co/videos/23550/23550-720.mp4" type="video/mp4" />
      </video>

      {/* ── Dark navy overlay — preserves brand look & readability ── */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-900/92 via-slate-900/82 to-slate-900/90"
        style={{ zIndex: -15 }}
      />
      {/* Purple brand tint */}
      <div
        className="absolute inset-0 bg-gradient-to-tr from-purple-950/40 via-transparent to-indigo-950/30"
        style={{ zIndex: -14 }}
      />
      {/* Cinematic vignette */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: -13,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(2,6,23,0.7) 100%)',
        }}
      />

      {/* ── Animated Data Entry Background ── */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: -5 }}>
        {/* Animated Grid Lines */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(139, 92, 246, 0.2) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(139, 92, 246, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            animation: 'gridMove 20s linear infinite',
          }} />
        </div>

        {/* Floating Inventory Icons */}
        <div className="absolute inset-0">
          <div className="absolute top-[15%] left-[5%] animate-float-slow opacity-30">
            <Package className="w-20 h-20 text-purple-400" />
          </div>
          <div className="absolute top-[25%] right-[10%] animate-float-slow-delayed opacity-30">
            <ScanLine className="w-24 h-24 text-indigo-400" />
          </div>
          <div className="absolute bottom-[25%] left-[15%] animate-pulse-slow opacity-30">
            <Database className="w-20 h-20 text-blue-400" />
          </div>
          <div className="absolute bottom-[20%] right-[20%] animate-float-slow opacity-30">
            <BarChart3 className="w-20 h-20 text-violet-400" />
          </div>
          <div className="absolute top-[45%] left-[8%] animate-float-medium opacity-25">
            <FileText className="w-16 h-16 text-purple-300" />
          </div>
          <div className="absolute top-[35%] right-[5%] animate-float-slow-delayed-2 opacity-25">
            <Users className="w-[4.5rem] h-[4.5rem] text-indigo-300" />
          </div>
          <div className="absolute bottom-[35%] left-[30%] animate-pulse-slow opacity-25">
            <TrendingUp className="w-16 h-16 text-green-400" />
          </div>
        </div>

        {/* Simulated Data Entry Numbers */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[18%] left-[55%] flex gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="text-purple-400/35 font-mono text-2xl animate-count"
                style={{ animationDelay: `${i * 0.3}s` }}>
                {String(Math.floor(Math.random() * 9))}
              </div>
            ))}
          </div>
          <div className="absolute top-[40%] left-[65%] flex gap-2">
            <span className="text-indigo-400/35 font-mono text-lg">PRD-</span>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-indigo-400/35 font-mono text-lg animate-count"
                style={{ animationDelay: `${i * 0.4 + 1}s` }}>
                {String(Math.floor(Math.random() * 9))}
              </div>
            ))}
          </div>
          <div className="absolute bottom-[30%] left-[50%] flex gap-1 items-center">
            <span className="text-green-400/35 font-mono text-xl">+</span>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-green-400/35 font-mono text-2xl animate-count"
                style={{ animationDelay: `${i * 0.35 + 2}s` }}>
                {String(Math.floor(Math.random() * 9))}
              </div>
            ))}
          </div>
          <div className="absolute top-[28%] right-[35%] flex gap-1">
            <span className="text-yellow-400/35 font-mono text-xl">$</span>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="text-yellow-400/35 font-mono text-xl animate-count"
                style={{ animationDelay: `${i * 0.45 + 0.5}s` }}>
                {String(Math.floor(Math.random() * 9))}
              </div>
            ))}
          </div>
          <div className="absolute bottom-[45%] right-[30%] flex gap-1">
            <span className="text-pink-400/35 font-mono text-sm">SKU:</span>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="text-pink-400/35 font-mono text-sm animate-count"
                style={{ animationDelay: `${i * 0.25 + 1.5}s` }}>
                {String(Math.floor(Math.random() * 9))}
              </div>
            ))}
          </div>
        </div>

        {/* Scan Lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute left-[25%] top-0 w-[3px] h-full bg-gradient-to-b from-transparent via-purple-500/35 to-transparent animate-scan-slow" />
          <div className="absolute left-[55%] top-0 w-[2px] h-full bg-gradient-to-b from-transparent via-indigo-500/25 to-transparent animate-scan-slow-delayed" />
          <div className="absolute left-[75%] top-0 w-[2px] h-full bg-gradient-to-b from-transparent via-violet-500/25 to-transparent animate-scan-slow-delayed-2" />
        </div>

        {/* Glowing orbs */}
        <div className="absolute top-[30%] left-[40%] w-64 h-64 bg-purple-500/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[30%] right-[30%] w-80 h-80 bg-indigo-500/8 rounded-full blur-3xl animate-pulse-delayed" />
      </div>

      {/* ── Subtle pattern overlay ── */}
      <div className="absolute inset-0 opacity-10" style={{ zIndex: -4 }}>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4 text-slate-900 dark:text-white">
              {t('landing.hero.title1')}
              <br />
              <span className="text-purple-400">{t('landing.hero.title2')}</span>
              <br />
              {t('landing.hero.title3')}
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 mb-6 max-w-xl mx-auto lg:mx-0">
              {t('landing.hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Button
                asChild
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 h-12 text-base shadow-lg shadow-purple-600/30 transition-all group"
              >
                <Link to="/register">
                  {t('landing.hero.startFreeTrial')}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-slate-300 text-slate-800 hover:bg-slate-100 hover:border-slate-400 dark:border-slate-600 dark:text-white dark:hover:bg-slate-800 dark:hover:border-slate-500 font-semibold px-8 h-12 text-base"
              >
                <a href="#how-it-works">
                  {t('landing.hero.seeHowItWorks')}
                </a>
              </Button>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-slate-400">
              {[
                t('landing.hero.noCreditCard'),
                t('landing.hero.freeTrial'),
                t('landing.hero.cancelAnytime'),
              ].map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative hidden lg:block">
            <div className="relative rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-800">
              {/* Dashboard Header Mockup */}
              <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="ml-4 flex-1 bg-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-400">
                  dashboard.stockmanager.com
                </div>
              </div>

              {/* Dashboard Content Mockup */}
              <div className="p-4 space-y-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 font-medium">{t('landing.hero.totalProducts')}</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">2,847</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-green-400 font-medium">{t('landing.hero.inStock')}</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">2,156</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-orange-400 font-medium">{t('landing.hero.lowStock')}</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">42</div>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="bg-slate-700/30 rounded-lg p-4 h-40 flex items-end justify-between gap-2">
                  {[40, 65, 45, 80, 55, 70, 90, 75, 60, 85, 95, 80].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                {/* Table Area */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t('landing.hero.recentActivity')}</span>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700" />
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">Product #{1000 + i}</div>
                          <div className="text-xs text-slate-500">{t('landing.hero.updatedAgo')}</div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-green-400">+{50 + i * 10}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CSS Animations ── */}
      <style>{`
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }

        @keyframes float-medium {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.05); }
        }

        @keyframes scan-slow {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes count {
          0% { opacity: 0.25; }
          50% { opacity: 0.7; }
          100% { opacity: 0.25; }
        }

        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }

        .animate-float-slow-delayed {
          animation: float-slow 10s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-float-slow-delayed-2 {
          animation: float-slow 9s ease-in-out infinite;
          animation-delay: 4s;
        }

        .animate-float-medium {
          animation: float-medium 6s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 5s ease-in-out infinite;
        }

        .animate-pulse-delayed {
          animation: pulse-slow 7s ease-in-out infinite;
          animation-delay: 3s;
        }

        .animate-scan-slow {
          animation: scan-slow 8s linear infinite;
        }

        .animate-scan-slow-delayed {
          animation: scan-slow 12s linear infinite;
          animation-delay: 4s;
        }

        .animate-scan-slow-delayed-2 {
          animation: scan-slow 10s linear infinite;
          animation-delay: 6s;
        }

        .animate-count {
          animation: count 2s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
