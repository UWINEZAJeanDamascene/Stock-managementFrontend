import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  
  // Get redirect from location state or default to dashboard
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
      // Call authService.login which makes the API call
      const response = await authService.login({ email, password });
      
      if (response.success) {
        // Backend returns: { token, access_token, refresh_token, userId, memberships }
        // We need to fetch user details using the token
        
        // Store token temporarily and fetch user details
        const token = response.token || '';
        
        // IMPORTANT: Store token in localStorage BEFORE calling getMe()
        // because api.ts reads token from localStorage
        if (token) {
          localStorage.setItem('token', token);
        }
        
        // Get user details
        const userResponse = await authService.getMe();
        
        if (userResponse.success && userResponse.data) {
          const user = userResponse.data;
          
          // Create user object for store
          const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            company: user.company,
            permissions: user.permissions,
            lastLogin: user.lastLogin,
            mustChangePassword: user.mustChangePassword,
          };
          
          // Call the store's login with all required arguments
          login(
            userData, 
            token, 
            (response.refreshToken || ''), 
            response.memberships || []
          );
          
          toast.success('Welcome back!');
          
          // Handle password change requirement
          if (user.mustChangePassword) {
            navigate('/change-password', { replace: true });
            return;
          }
          
          // If platform admin, redirect to platform admin page
          if (user.role === 'platform_admin') {
            navigate('/platform-admin', { replace: true });
            return;
          }
          
          // If multiple companies, redirect to company selector
          if (response.memberships && response.memberships.length > 1) {
            navigate('/company', { replace: true });
          } else {
            navigate(from, { replace: true });
          }
        } else {
          toast.error('Failed to get user details');
        }
      } else {
        // Handle specific error codes
        if (response.errorCode === 'INVALID_CREDENTIALS') {
          setErrorCode('INVALID_CREDENTIALS');
          toast.error('Invalid email or password');
        } else if (response.errorCode === 'ACCOUNT_LOCKED') {
          setErrorCode('ACCOUNT_LOCKED');
          const minutesLeft = response.lockedUntil 
            ? Math.ceil((response.lockedUntil - Date.now()) / 60000)
            : 30;
          toast.error(`Account is locked. Please try again in ${minutesLeft} minutes.`);
        } else {
          setErrorCode(null);
          toast.error(response.error || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
      
      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="absolute -top-12 left-0 text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Home
        </Link>

        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>
            
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 pr-12 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col sm:flex-row gap-4 text-sm justify-between">
            <Link 
              to="/forgot-password" 
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              Forgot password?
            </Link>
            <Link 
              to="/register" 
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              Don't have an account? Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}