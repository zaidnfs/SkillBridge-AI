import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { KoboyoSparkle } from '@/components/icons/Koboyo';
import { AIThinkingOrb } from '@/components/shared/AIThinkingOrb';
import authHeroImg from '@/assets/auth-hero.jpg';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const SIGNUP_HERO_SLIDES = [
  {
    title: 'Start your career, backed by live data',
    description:
      'Connect your university projects to verified industry requirements. Pinpoint skill gaps and accelerate your placement journey.',
  },
  {
    title: 'GraphRAG resume intelligence',
    description:
      'Analyze your resume against top tech job criteria and receive prioritized, actionable course and project recommendations.',
  },
  {
    title: 'Verified student placement credentials',
    description:
      'Stand out to campus hiring partners with transparent, graph-verified proficiency scores across software and AI stacks.',
  },
];

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-advance hero slides smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SIGNUP_HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const handleGoogleSignUp = () => {
    setFirstName('Zaid');
    setLastName('Alam');
    setEmail('zaid@university.edu');
    setPassword('password123');
    setConfirmPassword('password123');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email || !password) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const startTime = Date.now();

    try {
      await register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      });
      // Ensure the user clearly sees and perceives the AI synthesis sequence
      const elapsed = Date.now() - startTime;
      if (elapsed < 850) {
        await new Promise((resolve) => setTimeout(resolve, 850 - elapsed));
      }
      navigate('/');
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 400) {
        await new Promise((resolve) => setTimeout(resolve, 400 - elapsed));
      }
      const data = err.response?.data;
      let msg = 'Registration failed. Please check your information and try again.';
      if (typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        if (Array.isArray(data[firstKey])) {
          msg = `${firstKey}: ${data[firstKey][0]}`;
        } else if (typeof data[firstKey] === 'string') {
          msg = data[firstKey];
        }
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isPasswordMatch = Boolean(password && confirmPassword && password === confirmPassword);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F3F5F4] text-[#111827] font-sans antialiased selection:bg-[#008855]/20 selection:text-[#004D2F]">
      {/* Central 55-45 Split Card Layout */}
      <div className="w-full max-w-[1080px] min-h-[660px] bg-white rounded-3xl border border-[#E2E8E5] shadow-[0_20px_50px_-15px_rgba(0,35,20,0.06)] overflow-hidden flex flex-col lg:flex-row">
        
        {/* =========================================================================
            LEFT 55% PANEL: Clean Minimalist Signup Form with AI Loading Overlay
            ========================================================================= */}
        <div className="w-full lg:w-[55%] flex flex-col justify-between p-8 sm:p-12 xl:p-14 bg-white relative">
          {/* Active AI Signup Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-30 bg-white/95 backdrop-blur-md rounded-3xl lg:rounded-r-none flex flex-col items-center justify-center p-8 text-center animate-in fade-in-50 duration-200">
              <div className="mb-6 flex items-center justify-center">
                <AIThinkingOrb state="weaving" size={115} color="#008855" dotSize={1.4} />
              </div>

              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-xl font-bold text-[#0A1A12] tracking-tight">
                  Synthesizing Candidate Profile
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Initializing your personal skill vector and setting up Knowledge Graph workspace...
                </p>

                <div className="pt-2 flex items-center justify-center gap-2 text-[11px] font-mono font-semibold text-[#008855] bg-[#EEF7F1] border border-[#D6E8DD] py-1 px-3.5 rounded-full mx-auto w-fit">
                  <span className="h-2 w-2 rounded-full bg-[#008855] animate-ping" />
                  <span>Preparing placement intelligence</span>
                </div>
              </div>
            </div>
          )}

          {/* Top Brand Header & Switch Link */}
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-xl bg-[#008855] flex items-center justify-center text-white shadow-sm shadow-[#008855]/20 group-hover:scale-105 transition-transform">
                <KoboyoSparkle size={17} strokeWidth={2} />
              </div>
              <span className="font-semibold tracking-tight text-base text-[#0A1A12]">
                SkillBridge <span className="font-mono text-xs text-[#008855] font-bold">AI</span>
              </span>
            </Link>

            <Link
              to="/login"
              className="text-xs sm:text-sm font-medium text-[#008855] hover:text-[#006B42] hover:underline underline-offset-4 transition-colors"
            >
              Sign in
            </Link>
          </div>

          {/* Center Form Section */}
          <div className="my-auto py-6 max-w-[420px] w-full mx-auto space-y-5">
            {/* Title & Subtitle */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0A1A12]">
                Create an account
              </h1>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Join SkillBridge AI to build your verified career & skill graph.
              </p>
            </div>

            {/* Quick Google Sign-Up Option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="w-full h-11 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50/80 active:bg-neutral-100 text-neutral-700 text-sm font-medium flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm shadow-black/[0.02]"
              >
                <GoogleIcon className="w-4 h-4" />
                <span>Sign up with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center py-0.5">
              <div className="flex-grow border-t border-neutral-200" />
              <span className="px-3 text-xs text-neutral-400 font-normal select-none">
                or continue with email
              </span>
              <div className="flex-grow border-t border-neutral-200" />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50/90 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in-50">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Name Fields (2 Columns) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="firstName"
                    className="text-xs font-semibold text-neutral-700 block"
                  >
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    required
                    autoFocus
                    className="w-full h-10 px-3.5 rounded-xl text-sm border border-neutral-200 bg-white text-[#111827] placeholder:text-neutral-400 focus:outline-none focus:border-[#008855] focus:ring-2 focus:ring-[#008855]/15 transition-all shadow-sm shadow-black/[0.01]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="lastName"
                    className="text-xs font-semibold text-neutral-700 block"
                  >
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Chen"
                    className="w-full h-10 px-3.5 rounded-xl text-sm border border-neutral-200 bg-white text-[#111827] placeholder:text-neutral-400 focus:outline-none focus:border-[#008855] focus:ring-2 focus:ring-[#008855]/15 transition-all shadow-sm shadow-black/[0.01]"
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="signupEmail"
                  className="text-xs font-semibold text-neutral-700 block"
                >
                  University or work email
                </label>
                <input
                  id="signupEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  required
                  autoComplete="email"
                  className="w-full h-10 px-3.5 rounded-xl text-sm border border-neutral-200 bg-white text-[#111827] placeholder:text-neutral-400 focus:outline-none focus:border-[#008855] focus:ring-2 focus:ring-[#008855]/15 transition-all shadow-sm shadow-black/[0.01]"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="signupPassword"
                  className="text-xs font-semibold text-neutral-700 block"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signupPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    autoComplete="new-password"
                    className="w-full h-10 px-3.5 pr-10 rounded-xl text-sm border border-neutral-200 bg-white text-[#111827] placeholder:text-neutral-400 focus:outline-none focus:border-[#008855] focus:ring-2 focus:ring-[#008855]/15 transition-all shadow-sm shadow-black/[0.01]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="confirmPassword"
                    className="text-xs font-semibold text-neutral-700 block"
                  >
                    Confirm password
                  </label>
                  {isPasswordMatch && (
                    <span className="text-[11px] font-medium text-[#008855] flex items-center gap-1">
                      <Check className="h-3 w-3" /> Passwords match
                    </span>
                  )}
                </div>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                  className="w-full h-10 px-3.5 rounded-xl text-sm border border-neutral-200 bg-white text-[#111827] placeholder:text-neutral-400 focus:outline-none focus:border-[#008855] focus:ring-2 focus:ring-[#008855]/15 transition-all shadow-sm shadow-black/[0.01]"
                />
              </div>

              {/* Submit Pill Button (Matching Reference Image) */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-full text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer mt-2 bg-[#008855] text-white hover:bg-[#007347] shadow-md shadow-[#008855]/20 hover:shadow-lg hover:shadow-[#008855]/25"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <AIThinkingOrb state="weaving" size={20} color="#FFFFFF" />
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-neutral-400 text-center leading-normal pt-1">
                By creating an account, you agree to our{' '}
                <span className="underline cursor-pointer hover:text-neutral-600">Terms</span> and{' '}
                <span className="underline cursor-pointer hover:text-neutral-600">Privacy Policy</span>.
              </p>
            </form>
          </div>

          {/* Minimalist Bottom Footer */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>SkillBridge AI © 2026</span>
            <div className="flex items-center gap-3">
              <Link to="/login" className="hover:text-neutral-700 transition-colors">
                Sign in
              </Link>
              <span>•</span>
              <span className="text-neutral-400">Student Placement System</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT 45% PANEL: Atmospheric Visual Showcase (Matching Reference Image)
            ========================================================================= */}
        <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-end p-10 xl:p-12 overflow-hidden select-none bg-[#02180F]">
          {/* Background Illustration Asset */}
          <img
            src={authHeroImg}
            alt="SkillBridge AI Career Graph Celestial Illustration"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-transform duration-1000 ease-out hover:scale-105"
          />

          {/* Subtle Atmospheric Gradient Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(2, 24, 15, 0.95) 0%, rgba(2, 24, 15, 0.72) 35%, rgba(2, 24, 15, 0.2) 70%, transparent 100%)',
            }}
          />

          {/* Hero Bottom Content & Interactive Carousel Indicator */}
          <div className="relative z-10 space-y-5 text-white max-w-sm">
            <div className="space-y-2.5">
              <h2 className="text-2xl xl:text-3xl font-semibold tracking-[-0.02em] leading-tight text-white transition-opacity duration-300">
                {SIGNUP_HERO_SLIDES[activeSlide].title}
              </h2>
              <p className="text-xs xl:text-sm text-neutral-300/90 leading-relaxed transition-opacity duration-300">
                {SIGNUP_HERO_SLIDES[activeSlide].description}
              </p>
            </div>

            {/* Slide Pagination Indicator (Pill + Dots matching reference image) */}
            <div className="flex items-center gap-2 pt-2">
              {SIGNUP_HERO_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${
                    activeSlide === idx
                      ? 'w-7 bg-white'
                      : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
