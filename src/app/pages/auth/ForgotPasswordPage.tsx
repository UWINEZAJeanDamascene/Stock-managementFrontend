import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { authService } from '@/services';
import { PUBLIC_ROUTES } from '@/config/routes';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(data.email);
      setSuccess(true);
    } catch {
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#edf6f3] text-slate-950 dark:bg-[#03110f] dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden bg-slate-950 p-10 text-white dark:bg-white dark:text-slate-950 lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link to={PUBLIC_ROUTES.LOGIN} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 dark:text-slate-600">
              <ArrowLeft className="h-4 w-4" />
              Login
            </Link>
            <h1 className="mt-20 max-w-xl text-6xl font-semibold leading-[0.98] tracking-tight">
              Recover access without exposing accounts.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-slate-300 dark:text-slate-600">
              A clean recovery console with secure, enumeration-safe reset handling for workspace users.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/8 p-5 dark:border-slate-200 dark:bg-slate-50">
            <ShieldCheck className="h-7 w-7 text-cyan-300 dark:text-cyan-700" />
            <p className="mt-6 text-2xl font-semibold">Private by design</p>
            <p className="mt-2 text-sm text-slate-300 dark:text-slate-600">The same response appears whether or not an email exists.</p>
          </div>
        </aside>

        <main className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(34,211,238,.22),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(52,211,153,.2),transparent_24%)] dark:bg-[radial-gradient(circle_at_14%_16%,rgba(34,211,238,.12),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(52,211,153,.1),transparent_24%)]" />
          <div className="relative w-full max-w-xl">
            <Link to={PUBLIC_ROUTES.LOGIN} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Login
            </Link>

            <div className="overflow-hidden rounded-lg border border-white/80 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
              <div className="border-b border-slate-200 bg-slate-950 p-6 text-white dark:border-white/10">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">Recovery console</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight">{success ? 'Reset request received' : 'Request secure reset'}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {success ? 'If an account exists, reset instructions are on the way.' : 'Enter your workspace email to receive password reset instructions.'}
                </p>
              </div>

              <div className="p-6 sm:p-8">
                {success ? (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-emerald-500 text-white">
                      <CheckCircle2 className="h-7 w-7" />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Check your inbox and keep the reset link private.
                    </p>
                    <Link to={PUBLIC_ROUTES.LOGIN} className="mt-5 inline-flex items-center font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
                      Return to login
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                      <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Workspace email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          id="email"
                          type="email"
                          {...register('email')}
                          className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                          placeholder="you@company.com"
                        />
                      </div>
                      {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message as string}</p>}
                    </div>

                    <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
                      {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Sending...</> : <><Mail className="mr-2 h-5 w-5" />Send secure reset</>}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
