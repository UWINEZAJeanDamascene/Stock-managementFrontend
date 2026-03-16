import { Link } from 'react-router';
import { Package, Facebook, Twitter, Linkedin, Github } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LandingFooter() {
  const { t } = useTranslation();

  const footerLinks = {
    product: [
      { label: t('landing.footer.features'), href: '#features' },
      { label: t('landing.footer.pricingLink'), href: '#pricing' },
      { label: t('landing.footer.changelog'), href: '#' },
    ],
    company: [
      { label: t('landing.footer.about'), href: '#' },
      { label: t('landing.footer.blog'), href: '#' },
      { label: t('landing.footer.careers'), href: '#' },
    ],
    support: [
      { label: t('landing.footer.contactUs'), href: '#contact' },
      { label: t('landing.footer.documentation'), href: '#' },
      { label: t('landing.footer.faq'), href: '#' },
    ],
  };

  return (
    <footer id="contact" className="bg-slate-950 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4 group">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg group-hover:shadow-purple-500/25 transition-shadow">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-100">StockManager</span>
            </Link>
            <p className="text-slate-400 leading-relaxed">
              {t('landing.footer.tagline')}
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors" aria-label="LinkedIn">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors" aria-label="GitHub">
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-slate-100 font-semibold mb-4">{t('landing.footer.product')}</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-slate-400 hover:text-purple-400 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-slate-100 font-semibold mb-4">{t('landing.footer.company')}</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-slate-400 hover:text-purple-400 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-slate-100 font-semibold mb-4">{t('landing.footer.support')}</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="text-slate-400 hover:text-purple-400 transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} StockManager. {t('landing.footer.allRightsReserved')}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">
                {t('landing.footer.privacyPolicy')}
              </a>
              <span className="text-slate-700">|</span>
              <a href="#" className="text-slate-500 hover:text-purple-400 transition-colors">
                {t('landing.footer.termsOfService')}
              </a>
              <span className="hidden md:inline text-slate-700">|</span>
              <Link to="/home" className="text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                {t('landing.footer.backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
