import { useState } from 'react';
import { LandingNavbar } from './LandingNavbar';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { HowItWorksSection } from './HowItWorksSection';
import { PricingSection } from './PricingSection';
import { TestimonialSection } from './TestimonialSection';
import { LandingFooter } from './LandingFooter';
import { useTheme } from '@/contexts/ThemeContext';
import { LoginModal, RegisterModal } from './AuthModals';
import ChatBot from '@/app/components/ChatBot';

export default function HomePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Provide callbacks via custom events to open modals from navbar/buttons
  // Dispatch events listened by LandingNavbar or other sections to open modals
  if (typeof window !== 'undefined') {
    (window as any).openLoginModal = () => setShowLogin(true);
    (window as any).openRegisterModal = () => setShowRegister(true);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: isDark ? '#0f172a' : '#f2f2f2' }}>
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialSection />
      </main>
      <LandingFooter />
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
      <RegisterModal open={showRegister} onClose={() => setShowRegister(false)} />
      <ChatBot />
    </div>
  );
}
