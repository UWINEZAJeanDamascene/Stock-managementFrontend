import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ArrowLeft, CheckCircle, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { authService } from '@/services';
import { PUBLIC_ROUTES } from '@/config/routes';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!token) setInvalidToken(true);
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid reset token');
      setInvalidToken(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.resetPassword(token, data.password);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(PUBLIC_ROUTES.LOGIN, {
            state: { message: 'Password reset successful! Please log in.' },
          });
        }, 3000);
      } else if (response.errorCode === 'INVALID_OR_EXPIRED_TOKEN') {
        setInvalidToken(true);
        setError(response.error || 'This reset link has expired. Please request a new one.');
      } else if (response.errorCode === 'PASSWORD_TOO_SHORT') {
        setError(response.error || 'Password must be at least 8 characters');
      } else {
        setError(response.error || 'Failed to reset password. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const status = invalidToken ? 'invalid' : success ? 'success' : 'form';
  const inputClass = 'h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-12 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 dark:border-white/10 dark:bg-white/[0.06] dark:text-white';

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
              Set a stronger key for the command center.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-6 text-slate-300 dark:text-slate-600">
              Reset access through a focused security surface built for protected business workspaces.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/8 p-5 dark:border-slate-200 dark:bg-slate-50">
            <ShieldCheck className="h-7 w-7 text-cyan-300 dark:text-cyan-700" />
            <p className="mt-6 text-2xl font-semibold">Token protected</p>
            <p className="mt-2 text-sm text-slate-300 dark:text-slate-600">A valid reset token is required before the new password can be saved.</p>
          </div>
        </aside>

        <main className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(34,211,238,.22),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(52,211,153,.2),transparent_24%)] dark:bg-[radial-gradient(circle_at_14%_16%,rgba(34,211,238,.12),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(52,211,153,.1),transparent_24%)]" />
          <div className="relative w-full max-w-xl 2xl:max-w-[1100px]">
            <Link to={PUBLIC_ROUTES.LOGIN} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Login
            </Link>

            <div className="overflow-hidden rounded-lg border border-white/80 bg-white/90 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
              <div className="border-b border-slate-200 bg-slate-50 p-6 text-slate-950 dark:border-white/10 dark:bg-slate-950 dark:text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">Password security</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight">
                  {status === 'invalid' ? 'Reset link expired' : status === 'success' ? 'Password updated' : 'Create a new password'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {status === 'invalid' ? 'Request a fresh token before continuing.' : status === 'success' ? 'You will be redirected to login.' : 'Choose a secure new password for your workspace.'}
                </p>
              </div>

              <div className="p-6 sm:p-8">
                {status === 'invalid' && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-6 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-amber-400 text-slate-950">
                      <AlertTriangle className="h-7 w-7" />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">This reset link is invalid, missing or expired.</p>
                    <Link to={PUBLIC_ROUTES.FORGOT_PASSWORD} className="mt-5 inline-flex font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
                      Request new reset link
                    </Link>
                  </div>
                )}

                {status === 'success' && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-emerald-500 text-white">
                      <CheckCircle className="h-7 w-7" />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Redirecting to login...</p>
                  </div>
                )}

                {status === 'form' && (
                  <>
                    {error && <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</div>}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                      <div>
                        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">New password</label>
                        <div className="relative">
                          <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input id="password" type={showPassword ? 'text' : 'password'} {...register('password')} className={inputClass} placeholder="Minimum 8 characters" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message as string}</p>}
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirm password</label>
                        <div className="relative">
                          <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword')} className={inputClass} placeholder="Repeat new password" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message as string}</p>}
                      </div>

                      <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
                        {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Updating...</> : 'Reset password'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
