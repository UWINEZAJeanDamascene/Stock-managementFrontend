import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Building2, UserPlus, CheckCircle2, Mail, Phone, ShieldCheck, Check } from 'lucide-react';
import { companyService } from '@/services';
import { companyApi } from '@/lib/api';
import { PUBLIC_ROUTES } from '@/config/routes';

const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  companyEmail: z.string().email('Please enter a valid company email'),
  companyTin: z.string().optional(),
  companyPhone: z.string().optional(),
  subscriptionPlan: z.string().optional(),
  adminName: z.string().min(2, 'Your name must be at least 2 characters'),
  adminEmail: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [plans, setPlans] = useState<{ key: string; name: string; description: string; features: string[]; modules: string[]; badge: string; default_billing_amount: number; default_billing_cycle: string; featured: boolean }[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>('trial');

  useEffect(() => {
    companyApi.getPublicSubscriptionPlans()
      .then((res) => {
        if (res.success && res.data) {
          const activePlans = res.data.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order);
          setPlans(activePlans);
          if (activePlans.length > 0) {
            setSelectedPlan(activePlans[0].key);
          }
        }
      })
      .catch(() => {
        // fallback: no plans available
      })
      .finally(() => setPlansLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { subscriptionPlan: 'trial' },
  });

  const handleContinue = async () => {
    const isValid = await trigger(['companyName', 'companyEmail', 'companyTin', 'companyPhone']);
    if (isValid) setStep(2);
  };

  const handleSelectPlan = (key: string) => {
    setSelectedPlan(key);
    setValue('subscriptionPlan', key);
  };

  const onSubmit = async () => {
    const data = getValues();

    setIsLoading(true);
    setError(null);
    setEmailError(null);
    setSuccessMessage(null);

    try {
      await companyService.register(
        {
          name: data.companyName,
          email: data.companyEmail,
          tin: data.companyTin || undefined,
          phone: data.companyPhone || undefined,
          subscription_plan: data.subscriptionPlan || selectedPlan,
        },
        {
          name: data.adminName,
          email: data.adminEmail,
          password: data.password,
        },
      );

      setSuccessMessage('Registration submitted successfully. A platform administrator will review your company application.');
      setTimeout(() => {
        navigate(PUBLIC_ROUTES.LOGIN, {
          state: { message: 'Registration submitted. Please wait for company approval before logging in.' },
        });
      }, 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      if (errorMessage.toLowerCase().includes('email')) {
        setEmailError('This email is already registered. Please use a different email or contact support.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = 'h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-white/[0.06] dark:text-white';
  const iconInputClass = `${inputClass} pl-10`;

  return (
    <div className="min-h-screen bg-[#ecf5f2] text-slate-950 dark:bg-[#03110f] dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="hidden bg-slate-950 p-10 text-white dark:bg-white dark:text-slate-950 lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link to={PUBLIC_ROUTES.HOME} className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.2em]">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
                <Building2 className="h-5 w-5" />
              </span>
              STOCKMANAGER
            </Link>
            <h1 className="mt-20 max-w-xl text-6xl font-semibold leading-[0.98] tracking-tight">
              Open a new operating workspace.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-slate-300 dark:text-slate-600">
              Company identity, admin ownership and approval workflow in one crisp onboarding surface.
            </p>
          </div>
          <div className="grid gap-3">
            {['Company approval queue', 'Admin owner creation', 'Tenant-ready setup'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/8 p-4 dark:border-slate-200 dark:bg-slate-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-300 dark:text-emerald-600" />
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(34,211,238,.22),transparent_28%),radial-gradient(circle_at_90%_20%,rgba(52,211,153,.22),transparent_22%)] dark:bg-[radial-gradient(circle_at_12%_12%,rgba(34,211,238,.12),transparent_28%),radial-gradient(circle_at_90%_20%,rgba(52,211,153,.12),transparent_22%)]" />
          <div className="relative w-full max-w-2xl 2xl:max-w-[1100px]">
            <Link to={PUBLIC_ROUTES.HOME} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>

            <div className="overflow-hidden rounded-lg border border-white/80 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
              <div className="border-b border-slate-200 bg-slate-50 p-6 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">New workspace</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight">{step === 1 ? 'Company setup console' : 'Admin owner console'}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {step === 1 ? 'Capture the company record before approval.' : 'Create the first secure administrator for this workspace.'}
                </p>
              </div>
              <div className="p-6 sm:p-8">
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg text-sm font-semibold ${step > 1 ? 'bg-emerald-500 text-white' : 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'}`}>
                {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : '1'}
              </div>
              <span className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Company</span>
            </div>
            <div className={`mx-3 h-0.5 w-16 ${step > 1 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`} />
            <div className="flex flex-col items-center">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg text-sm font-semibold ${step === 2 ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                2
              </div>
              <span className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Admin</span>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>}
      {successMessage && <div className="mb-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Company name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="companyName" type="text" {...register('companyName')} className={iconInputClass} placeholder="Company Ltd" />
              </div>
              {errors.companyName && <p className="mt-1 text-sm text-red-500">{errors.companyName.message as string}</p>}
            </div>

            <div>
              <label htmlFor="companyEmail" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Company email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="companyEmail" type="email" {...register('companyEmail')} className={iconInputClass} placeholder="finance@company.com" />
              </div>
              {errors.companyEmail && <p className="mt-1 text-sm text-red-500">{errors.companyEmail.message as string}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="companyTin" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">TIN</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="companyTin" type="text" {...register('companyTin')} className={iconInputClass} placeholder="Tax ID" />
                </div>
              </div>
              <div>
                <label htmlFor="companyPhone" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="companyPhone" type="tel" {...register('companyPhone')} className={iconInputClass} placeholder="+250..." />
                </div>
              </div>
            </div>

            {/* Plan Selector */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Select a plan</label>
              {plansLoading ? (
                <div className="flex h-20 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.06]">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : plans.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No plans available. You will be assigned the default trial plan.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => handleSelectPlan(plan.key)}
                      className={`relative rounded-xl border p-4 text-left transition-all ${
                        selectedPlan === plan.key
                          ? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-500 dark:border-cyan-400 dark:bg-cyan-950/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-white/20'
                      }`}
                    >
                      {selectedPlan === plan.key && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      {plan.badge && (
                        <span className="mb-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {plan.badge}
                        </span>
                      )}
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{plan.description}</p>
                      <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {plan.default_billing_amount > 0 ? `$${plan.default_billing_amount.toLocaleString()}` : 'Free'} / {plan.default_billing_cycle}
                      </p>
                      {plan.modules && plan.modules.length > 0 && (
                        <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                          {plan.modules.slice(0, 3).join(', ')}{plan.modules.length > 3 ? '...' : ''}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <input type="hidden" {...register('subscriptionPlan')} value={selectedPlan} />
            </div>

            <button type="button" onClick={handleContinue} className="flex h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-4 font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Company details
            </button>

            <div>
              <label htmlFor="adminName" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name</label>
              <input id="adminName" type="text" {...register('adminName')} className={inputClass} placeholder="Jane Operator" />
              {errors.adminName && <p className="mt-1 text-sm text-red-500">{errors.adminName.message as string}</p>}
            </div>

            <div>
              <label htmlFor="adminEmail" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Admin email</label>
              <input id="adminEmail" type="email" {...register('adminEmail')} className={`${inputClass} ${emailError ? 'border-red-500' : ''}`} placeholder="admin@company.com" />
              {errors.adminEmail && <p className="mt-1 text-sm text-red-500">{errors.adminEmail.message as string}</p>}
              {emailError && <p className="mt-1 text-sm text-red-500">{emailError}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} {...register('password')} className={`${inputClass} pr-12`} placeholder="Minimum 8 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message as string}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirm password</label>
              <div className="relative">
                <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword')} className={`${inputClass} pr-12`} placeholder="Repeat password" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message as string}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Submitting...</> : <><UserPlus className="mr-2 h-5 w-5" />Complete registration</>}
            </button>
          </div>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Already approved?{' '}
        <Link to={PUBLIC_ROUTES.LOGIN} className="font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">Sign in</Link>
      </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
