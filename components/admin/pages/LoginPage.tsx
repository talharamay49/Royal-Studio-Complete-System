import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useStudioData } from '../context/StudioDataContext';
import { AUTHORIZED_ADMIN_EMAIL } from '../services/secureAuthStorage';
import { useStudioTheme } from '@/components/shared/StudioProfileContext';
import {
  Camera,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  HelpCircle,
  Sun,
  Moon,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';

interface FormErrors {
  email?: string;
  password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginPage: React.FC = () => {
  const { login, autoLogoutReason, clearAutoLogoutReason } = useAuth();
  const { profile } = useStudioData();
  const { resolvedMode, toggleThemeMode } = useStudioTheme();

  const studioName = profile?.studioName || 'Royal Studio';
  const tagline = profile?.tagline || 'Luxury wedding photography, cinematic films, and brand shoots.';
  const displayAddress =
    profile?.publicDisplayAddress ||
    profile?.address ||
    'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan';
  const phone1 = profile?.phone || '0308-4877073';
  const phone2 = profile?.phone2 || '0303-2213806';
  const supportEmail = profile?.supportEmail || profile?.email || 'royalstudio089@gmail.com';
  const logoSrc = profile?.primaryLogo || profile?.logo || '/RoyalLogo.png';

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      errors.email = 'Studio email address is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters long.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Invalid email or password. Please verify your credentials and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-portal-root min-h-screen w-screen flex flex-col justify-center items-center p-4 bg-background text-text relative overflow-hidden transition-colors duration-300">
      {/* Top Navigation Bar: Return to Portfolio + Light/Dark Toggle */}
      <div className="fixed top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-accent" />
          <span>Back to Portfolio</span>
        </Link>

        <button
          type="button"
          onClick={toggleThemeMode}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-surface/90 text-xs font-medium text-primary hover:border-accent hover:text-accent shadow-xs transition-all cursor-pointer"
          title={resolvedMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {resolvedMode === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-accent" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-accent" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      <div className="w-full max-w-md bg-surface rounded-2xl border border-border p-8 shadow-premium-lg relative z-10">
        {/* Brand Header matching Portfolio Luxury Typography */}
        <div className="text-center mb-8">
          {logoSrc ? (
            <div className="flex justify-center mb-3">
              <img
                src={logoSrc}
                alt={studioName}
                className="h-14 w-auto object-contain rounded-xl bg-[#111111] p-1.5 border border-border"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/RoyalLogo.png';
                }}
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent text-[#111111] shadow-md mb-3">
              <Camera className="w-8 h-8 stroke-[2.2]" />
            </div>
          )}
          <h1 className="font-display text-3xl font-semibold tracking-wide text-primary">
            {studioName}
          </h1>
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent font-semibold mt-1">
            Executive ERP · Staff · Client Portal
          </p>
          <p className="text-xs text-text-muted mt-2">{tagline}</p>
        </div>

        {/* Portal Access Security Notice (No Public Sign-Up) */}
        <div className="mb-6 px-3.5 py-2.5 rounded-xl bg-background border border-border flex items-center justify-between text-[11px] text-text-muted">
          <span className="font-semibold uppercase tracking-wider">Portal Access</span>
          <span className="text-accent font-semibold">Admin-Provisioned Accounts Only</span>
        </div>

        {autoLogoutReason && !error && (
          <div
            role="status"
            className="mb-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start justify-between gap-3 text-amber-700 dark:text-amber-300 text-xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <span>{autoLogoutReason}</span>
            </div>
            <button
              type="button"
              onClick={clearAutoLogoutReason}
              className="text-[10px] font-semibold uppercase tracking-wider underline opacity-80 hover:opacity-100 shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-600 dark:text-rose-300 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-semibold text-primary mb-1.5">
              Login Email (Admin, Staff, or Booked Client)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                required
                autoComplete="email"
                placeholder="Enter your studio-assigned login email"
                className={`w-full pl-10 pr-4 py-2.5 bg-background border rounded-xl text-sm text-primary placeholder-text-muted/60 focus:outline-none focus:ring-1 transition-colors ${
                  fieldErrors.email
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-border focus:border-accent focus:ring-accent'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-rose-500">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-semibold text-primary mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                required
                autoComplete="current-password"
                placeholder="Enter administrator password"
                className={`w-full pl-10 pr-4 py-2.5 bg-background border rounded-xl text-sm text-primary placeholder-text-muted/60 focus:outline-none focus:ring-1 transition-colors ${
                  fieldErrors.password
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-border focus:border-accent focus:ring-accent'
                }`}
              />
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-rose-500">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-accent hover:bg-accent-light text-[#111111] font-button font-semibold text-xs tracking-widest uppercase rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <span>Sign In to Studio Portal</span>
            )}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 text-text-muted text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>Encrypted Session Vault</span>
          </span>
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="text-xs text-text-muted hover:text-accent transition-colors underline cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>

        <div className="mt-7 pt-5 border-t border-border text-center text-[11px] text-text-muted space-y-1">
          <div>{displayAddress}</div>
          <div>
            {phone1}
            {phone2 ? ` · ${phone2}` : ''}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 text-center space-y-4 shadow-premium-lg">
            <div className="w-12 h-12 rounded-full bg-accent/15 text-accent mx-auto flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-semibold text-primary">
              Reset Administrator Password
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Only the official administrator account (<strong>{AUTHORIZED_ADMIN_EMAIL}</strong>) is authorized. For credential recovery, contact <strong>{studioName}</strong>:
            </p>
            <div className="p-3 bg-background rounded-xl border border-border text-xs font-mono text-accent space-y-1">
              <div>{phone1}</div>
              {phone2 && <div>{phone2}</div>}
              <div className="text-[11px] text-text-muted">{supportEmail}</div>
            </div>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 bg-primary text-secondary rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
