import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStudioData } from '../context/StudioDataContext';
import { Camera, Lock, User as UserIcon, AlertCircle, Loader2, HelpCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { profile } = useStudioData();
  const studioName = profile?.studioName || 'Royal Studio';
  const tagline = profile?.tagline || 'Luxury wedding photography, cinematic films, and brand shoots.';
  const displayAddress = profile?.publicDisplayAddress || profile?.address || 'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan';
  const phone1 = profile?.phone || '0308-4877073';
  const phone2 = profile?.phone2 || '0303-2213806';
  const supportEmail = profile?.supportEmail || profile?.email || 'royalstudio089@gmail.com';
  const logoSrc = profile?.primaryLogo || profile?.logo || '/RoyalLogo.png';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both your Email / Username and Password.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col justify-center items-center p-4 bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-950 to-slate-950 -z-10" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          {logoSrc ? (
            <div className="flex justify-center mb-3">
              <img
                src={logoSrc}
                alt={studioName}
                className="h-14 w-auto object-contain rounded-xl"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/RoyalLogo.png';
                }}
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 mb-3">
              <Camera className="w-8 h-8 stroke-[2.2]" />
            </div>
          )}
          <h1 className="text-2xl font-black tracking-wider text-white uppercase">{studioName}</h1>
          <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold mt-1">
            {studioName} Manager
          </p>
          <p className="text-xs text-slate-400 mt-2">
            {tagline}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email / Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                autoComplete="username"
                placeholder="Enter email or username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <span>LOGIN</span>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="text-xs text-slate-400 hover:text-amber-400 transition-colors underline cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-[11px] text-slate-500 space-y-1">
          <div>{displayAddress}</div>
          <div>{phone1}{phone2 ? ` • ${phone2}` : ''}</div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Reset Account Password</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              To reset your credentials, please contact the <strong>{studioName} Administrator</strong> or reach out via official phone numbers:
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-amber-400 space-y-1">
              <div>{phone1}</div>
              {phone2 && <div>{phone2}</div>}
              <div className="text-[11px] text-slate-400">{supportEmail}</div>
            </div>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

