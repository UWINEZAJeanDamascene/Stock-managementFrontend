import { useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Mail, Lock, User, Building, Phone, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/app/components/ui/button';

type BaseModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginModal({ open, onClose }: BaseModalProps) {
  const { theme } = useTheme();
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onClose();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('landing.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-5 md:p-6 border border-slate-200 dark:border-slate-700">
        <button className="absolute top-3 right-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </button>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{t('landing.signIn')}</h2>
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('landing.email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all"
                placeholder="admin@stock.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('landing.password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading ? t('landing.signingIn') : t('landing.signInButton')}
          </Button>
        </form>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">{t('landing.contactAdmin')}</p>
      </div>
    </div>
  );
}

export function RegisterModal({ open, onClose }: BaseModalProps) {
  const { registerCompany } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const [company, setCompany] = useState({ name: '', email: '', tin: '', phone: '' });
  const [admin, setAdmin] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  const goNext = () => {
    if (!company.name || !company.email) {
      setError(t('landing.fillCompanyFields'));
      return;
    }
    setError('');
    setStep(2);
  };
  const goBack = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!company.name || !company.email || !admin.name || !admin.email || !admin.password) {
      setError(t('landing.fillRequiredFields'));
      return;
    }
    if (admin.password !== admin.confirmPassword) {
      setError(t('landing.passwordsNoMatch'));
      return;
    }
    if (admin.password.length < 6) {
      setError(t('landing.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      await registerCompany(company, { name: admin.name, email: admin.email, password: admin.password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('landing.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-5 md:p-6 border border-slate-200 dark:border-slate-700">
        <button className="absolute top-3 right-3 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </button>
        {success ? (
          <div className="text-center py-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t('landing.registrationSuccess')}</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">{t('landing.registrationMessage')}</p>
            <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">{t('common.close')}</Button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{t('landing.registerTitle')}</h2>
            {error && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">{error}</div>
            )}
            {step === 1 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('landing.companyName')} *</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input type="text" value={company.name} onChange={(e)=>setCompany({...company, name: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all" placeholder="Your Company" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('landing.companyEmail')} *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input type="email" value={company.email} onChange={(e)=>setCompany({...company, email: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all" placeholder="company@example.com" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('landing.tin')}</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input type="text" value={company.tin} onChange={(e)=>setCompany({...company, tin: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all" placeholder={t('landing.taxIdNumber')} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('landing.companyPhone')}</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input type="tel" value={company.phone} onChange={(e)=>setCompany({...company, phone: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all" placeholder="+250 ..." />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" onClick={onClose} variant="outline" className="border-slate-300 dark:border-slate-600">{t('common.cancel')}</Button>
                  <Button type="button" onClick={goNext} className="bg-indigo-600 hover:bg-indigo-700 text-white">{t('landing.continue')}</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('landing.adminName')} *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input type="text" value={admin.name} onChange={(e)=>setAdmin({...admin, name: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all" placeholder="Your Full Name" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('landing.adminEmail')} *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input type="email" value={admin.email} onChange={(e)=>setAdmin({...admin, email: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all" placeholder="admin@company.com" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('landing.adminPassword')} *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input type="password" value={admin.password} onChange={(e)=>setAdmin({...admin, password: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all" placeholder="••••••••" required minLength={6} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('landing.confirmPassword')} *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input type="password" value={admin.confirmPassword} onChange={(e)=>setAdmin({...admin, confirmPassword: e.target.value})} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all" placeholder="••••••••" required minLength={6} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between gap-3 pt-2">
                  <Button type="button" onClick={goBack} variant="outline" className="border-slate-300 dark:border-slate-600">{t('common.back')}</Button>
                  <div className="flex gap-3">
                    <Button type="button" onClick={onClose} variant="outline" className="border-slate-300 dark:border-slate-600">{t('common.cancel')}</Button>
                    <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {loading ? t('landing.submitting') : t('landing.createAccount')}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
