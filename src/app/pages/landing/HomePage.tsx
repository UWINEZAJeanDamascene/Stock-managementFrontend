import { useEffect } from 'react';
import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { HowItWorksSection } from './HowItWorksSection';
import { TestimonialSection } from './TestimonialSection';
import { PricingSection } from './PricingSection';
import { LandingFooter } from './LandingFooter';

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
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialSection />
      <PricingSection />
      <LandingFooter />
    </div>
  );
}
