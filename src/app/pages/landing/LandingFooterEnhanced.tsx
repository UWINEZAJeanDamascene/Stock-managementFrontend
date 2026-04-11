import { useState } from 'react';
import { Link } from 'react-router';
import { 
  Package, Facebook, Twitter, Linkedin, Github, 
  Mail, MapPin, Phone, Send
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';

export function LandingFooterEnhanced() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error(t('landing.footer.invalidEmail'));
      return;
    }
    
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success(t('landing.footer.newsletterSuccess'));
    setEmail('');
    setIsSubmitting(false);
  };

  const footerLinks = {
    product: [
      { label: t('landing.footer.features'), href: '#features' },
      { label: t('landing.footer.pricingLink'), href: '#pricing' },
      { label: t('landing.footer.changelog'), href: '#' },
      { label: t('landing.footer.roadmap'), href: '#' },
    ],
    company: [
      { label: t('landing.footer.about'), href: '#' },
      { label: t('landing.footer.blog'), href: '#' },
      { label: t('landing.footer.careers'), href: '#' },
      { label: t('landing.footer.press'), href: '#' },
    ],
    resources: [
      { label: t('landing.footer.documentation'), href: '#' },
      { label: t('landing.footer.apiReference'), href: '#' },
      { label: t('landing.footer.guides'), href: '#' },
      { label: t('landing.footer.webinars'), href: '#' },
    ],
    support: [
      { label: t('landing.footer.contactUs'), href: '#contact' },
      { label: t('landing.footer.faq'), href: '#faq' },
      { label: t('landing.footer.status'), href: '#' },
      { label: t('landing.footer.security'), href: '#' },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: '#', label: 'Twitter', color: '#1DA1F2' },
    { icon: Facebook, href: '#', label: 'Facebook', color: '#4267B2' },
    { icon: Linkedin, href: '#', label: 'LinkedIn', color: '#0077b5' },
    { icon: Github, href: '#', label: 'GitHub', color: '#333' },
  ];

  return (
    <footer id="contact" className="bg-slate-950 text-slate-300">
      {/* Newsletter Section */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {t('landing.newsletter.title')}
              </h3>
              <p className="text-slate-400">
                {t('landing.newsletter.subtitle')}
              </p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('landing.newsletter.placeholder')}
                  className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Button 
                type="submit" 
                className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <>
                    {t('landing.newsletter.subscribe')}
                    <Send className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4 group">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg group-hover:shadow-purple-500/25 transition-shadow">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-100">StockManager</span>
            </Link>
            <p className="text-slate-400 leading-relaxed mb-6">
              {t('landing.footer.tagline')}
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-purple-500" />
                <span>Kigali, Rwanda</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-purple-500" />
                <a href="mailto:uwinezajd2@gmail.com" className="hover:text-purple-400 transition-colors">
                  uwinezajd2@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-purple-500" />
                <a href="tel:+250780936645" className="hover:text-purple-400 transition-colors">
                  +250 780 936 645
                </a>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-slate-100 font-semibold mb-4">{t('landing.footer.product')}</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-sm text-slate-400 hover:text-purple-400 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-slate-100 font-semibold mb-4">{t('landing.footer.company')}</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-sm text-slate-400 hover:text-purple-400 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-slate-100 font-semibold mb-4">{t('landing.footer.resources')}</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-sm text-slate-400 hover:text-purple-400 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-slate-100 font-semibold mb-4">{t('landing.footer.support')}</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-sm text-slate-400 hover:text-purple-400 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} StockManager. {t('landing.footer.allRightsReserved')}
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  style={{ 
                    border: `1px solid ${social.color}30`,
                  }}
                >
                  <social.icon className="w-4 h-4" style={{ color: social.color }} />
                </a>
              ))}
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-4 text-sm">
              <a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">
                {t('landing.footer.privacyPolicy')}
              </a>
              <span className="text-slate-700">|</span>
              <a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">
                {t('landing.footer.termsOfService')}
              </a>
              <span className="text-slate-700">|</span>
              <Link to="/home" className="text-purple-400 hover:text-purple-300 transition-colors">
                {t('landing.footer.backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Rwanda Flag Badge */}
      <div className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <span>🇷🇼</span>
            <span>{t('landing.footer.madeInRwanda')}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{t('landing.footer.forAfrica')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooterEnhanced;
