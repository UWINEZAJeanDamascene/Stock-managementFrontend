import { useEffect } from 'react';
import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { TrustBadgesSection } from './TrustBadgesSection';
import { StatsBanner } from './StatsBanner';
import { FeaturesSectionEnhanced } from './FeaturesSectionEnhanced';
import { HowItWorksSection } from './HowItWorksSection';
import { TestimonialSection } from './TestimonialSection';
import { PricingSection } from './PricingSection';
import { FAQSection } from './FAQSection';
import { LandingFooterEnhanced } from './LandingFooterEnhanced';
// Live chat widget removed per user request

export default function HomePage() {
  useEffect(() => {
    // Clear any residual modal states on mount
    if (typeof window !== 'undefined') {
      delete (window as any).openLoginModal;
      delete (window as any).openRegisterModal;
    }
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <LandingNavbar />
      <HeroSection />
      <TrustBadgesSection />
      <StatsBanner />
      <FeaturesSectionEnhanced />
      <HowItWorksSection />
      <TestimonialSection />
      <PricingSection />
      <FAQSection />
      <LandingFooterEnhanced />
    </div>
  );
}
