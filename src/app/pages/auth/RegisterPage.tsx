import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Building2, UserPlus, CheckCircle2 } from 'lucide-react';
import { companyService } from '@/services';
import { PUBLIC_ROUTES } from '@/config/routes';

// Combined schema for the entire form
const registerSchema = z.object({
  // Company Information
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  companyEmail: z.string().email('Please enter a valid company email'),
  companyTin: z.string().optional(),
  companyPhone: z.string().optional(),
  // Admin Account Information
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

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const handleContinue = async () => {
    // Validate only company fields
    const isValid = await trigger(['companyName', 'companyEmail', 'companyTin', 'companyPhone']);
    if (isValid) {
      setStep(2);
    }
  };

  const onSubmit = async () => {
    // Get all form data
    const data = getValues();
    
    setIsLoading(true);
    setError(null);
    setEmailError(null);
    setSuccessMessage(null);

    try {
      // Prepare company data
      const companyData = {
        name: data.companyName,
        email: data.companyEmail,
        tin: data.companyTin || undefined,
        phone: data.companyPhone || undefined,
      };

      // Prepare admin user data
      const adminData = {
        name: data.adminName,
        email: data.adminEmail,
        password: data.password,
      };

      // Call company registration endpoint
      await companyService.register(companyData, adminData);

      // Show success message about pending approval
      setSuccessMessage(
        'Registration submitted successfully! A platform administrator will review your company application. You will be notified once your company is approved or rejected.'
      );
      
      // Optionally navigate to login after a delay
      setTimeout(() => {
        navigate(PUBLIC_ROUTES.LOGIN, {
          state: { message: 'Registration submitted. Please wait for company approval before logging in.' },
        });
      }, 5000);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      
      // Handle specific error cases
      if (errorMessage.toLowerCase().includes('email')) {
        setEmailError('This email is already registered. Please use a different email or contact support.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderProgressBar = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center">
        {/* Step 1 */}
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
            step > 1 ? 'bg-green-500 text-white' : step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
          </div>
          <span className="text-xs mt-2 text-slate-400">Company</span>
        </div>
        
        {/* Connector */}
        <div className={`w-16 h-0.5 mx-2 ${step > 1 ? 'bg-green-500' : 'bg-slate-700'}`}></div>
        
        {/* Step 2 */}
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
            step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
          }`}>
            2
          </div>
          <span className="text-xs mt-2 text-slate-400">Admin Account</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
      
      <div className="relative w-full max-w-md">
        <Link
          to={PUBLIC_ROUTES.HOME}
          className="absolute -top-12 left-0 flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              {step === 1 ? 'Register Your Company' : 'Create Admin Account'}
            </h1>
            <p className="text-slate-400 text-sm">
              {step === 1 ? 'Step 1 of 2: Enter your company details' : 'Step 2 of 2: Create your admin login'}
            </p>
          </div>

          {renderProgressBar()}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              {successMessage}
            </div>
          )}

          {/* Single form for both steps */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Step 1: Company Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-slate-300 mb-2">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    {...register('companyName')}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Your Company Name"
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-400">{errors.companyName.message as string}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="companyEmail" className="block text-sm font-medium text-slate-300 mb-2">
                    Company Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="companyEmail"
                    type="email"
                    {...register('companyEmail')}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="company@example.com"
                  />
                  {errors.companyEmail && (
                    <p className="mt-1 text-sm text-red-400">{errors.companyEmail.message as string}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="companyTin" className="block text-sm font-medium text-slate-300 mb-2">
                      TIN (Tax ID)
                    </label>
                    <input
                      id="companyTin"
                      type="text"
                      {...register('companyTin')}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="123456789"
                    />
                  </div>

                  <div>
                    <label htmlFor="companyPhone" className="block text-sm font-medium text-slate-300 mb-2">
                      Phone
                    </label>
                    <input
                      id="companyPhone"
                      type="tel"
                      {...register('companyPhone')}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            )}

            {/* Step 2: Admin Account */}
            {step === 2 && (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center text-slate-400 hover:text-white transition-colors text-sm mb-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to company info
                </button>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="adminName" className="block text-sm font-medium text-slate-300 mb-2">
                      Your Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="adminName"
                      type="text"
                      {...register('adminName')}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="John Doe"
                    />
                    {errors.adminName && (
                      <p className="mt-1 text-sm text-red-400">{errors.adminName.message as string}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="adminEmail" className="block text-sm font-medium text-slate-300 mb-2">
                      Your Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="adminEmail"
                      type="email"
                      {...register('adminEmail')}
                      className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${emailError ? 'border-red-500' : 'border-slate-600/50'}`}
                      placeholder="you@example.com"
                    />
                    {errors.adminEmail && (
                      <p className="mt-1 text-sm text-red-400">{errors.adminEmail.message as string}</p>
                    )}
                    {emailError && (
                      <p className="mt-1 text-sm text-red-400">{emailError}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                      Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        {...register('password')}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-400">{errors.password.message as string}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                      Confirm Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...register('confirmPassword')}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message as string}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Complete Registration
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link
                to={PUBLIC_ROUTES.LOGIN}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}