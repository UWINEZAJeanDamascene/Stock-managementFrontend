import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services';
import { Loader2, Eye, EyeOff, Mail, LockKeyhole, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { AuthFrame } from './AuthFrame';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const from = (location.state as { from?: string })?.from || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    setErrorCode(null);

    try {
      const response = await authService.login({ email, password });

      if (response.success) {
        const token = response.token || '';

        if (token) {
          localStorage.setItem('token', token);
        }

        const userResponse = await authService.getMe();

        if (userResponse.success && userResponse.data) {
          const user = userResponse.data;

          login(
            {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              company: user.company,
              permissions: user.permissions,
              lastLogin: user.lastLogin,
              mustChangePassword: user.mustChangePassword,
            },
            token,
            response.refreshToken || '',
            response.memberships || [],
          );

          toast.success('Welcome back!');

          if (user.mustChangePassword) {
            navigate('/change-password', { replace: true });
            return;
          }

          if (user.role === 'platform_admin') {
            navigate('/platform-admin', { replace: true });
            return;
          }

          if (response.memberships && response.memberships.length > 1) {
            navigate('/company', { replace: true });
          } else {
            navigate(from, { replace: true });
          }
        } else {
          toast.error('Failed to get user details');
        }
      } else if (response.errorCode === 'INVALID_CREDENTIALS') {
        setErrorCode('INVALID_CREDENTIALS');
        toast.error('Invalid email or password');
      } else if (response.errorCode === 'ACCOUNT_LOCKED') {
        setErrorCode('ACCOUNT_LOCKED');
        const minutesLeft = response.lockedUntil
          ? Math.ceil((response.lockedUntil - Date.now()) / 60000)
          : 30;
        toast.error(`Account is locked. Please try again in ${minutesLeft} minutes.`);
      } else {
        setErrorCode('LOGIN_FAILED');
        toast.error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorCode('LOGIN_FAILED');
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Sign in to command center"
      subtitle="Enter the workspace where inventory, finance, payroll and governance move together."
      sideItems={['Live company context', 'Secure session handling', 'Fast access to every module']}
    >
      {errorCode && (
        <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {errorCode === 'ACCOUNT_LOCKED' ? 'This account is temporarily locked.' : 'Invalid email or password.'}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Password
            </label>
            <Link to="/forgot-password" className="text-sm font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-12 text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-slate-950 px-4 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        New company workspace?{' '}
        <Link to="/register" className="font-semibold text-cyan-700 hover:text-cyan-600 dark:text-cyan-300">
          Create account
        </Link>
      </p>
    </AuthFrame>
  );
}
