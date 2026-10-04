import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Save,
  RotateCcw,
  Check,
  Sliders,
  Type,
  Layout,
  Eye,
  Globe,
  ShieldCheck
} from 'lucide-react';
import {
  useStudioTheme,
  DEFAULT_STUDIO_THEME,
  STUDIO_THEME_PRESETS
} from '@/components/shared/StudioProfileContext';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useStudioData } from '../context/StudioDataContext';
import { useAuth } from '../context/AuthContext';
import { StudioThemeConfig } from '../types';

interface ThemeCustomizerPageProps {
  navigate?: (path: string) => void;
}

const ACCENT_SWATCHES = [
  { label: 'Champagne Gold', hex: '#c9a76a', light: '#d4b87a', dark: '#b08f4f' },
  { label: 'Imperial Emerald', hex: '#2a7b5c', light: '#3b9975', dark: '#1e5c44' },
  { label: 'Velvet Rose', hex: '#a3485b', light: '#bd5d71', dark: '#823444' },
  { label: 'Royal Sapphire', hex: '#3b6e9c', light: '#5289ba', dark: '#2a5278' },
  { label: 'Warm Titanium', hex: '#8f8577', light: '#a89e8f', dark: '#6e6559' },
  { label: 'Antique Bronze', hex: '#b87d4b', light: '#cf9563', dark: '#966134' }
];

const PRIMARY_SWATCHES = [
  { label: 'Signature Obsidian', hex: '#111111' },
  { label: 'Deep Forest', hex: '#0f241c' },
  { label: 'Burgundy Noir', hex: '#211014' },
  { label: 'Midnight Navy', hex: '#0f1b29' },
  { label: 'Warm Espresso', hex: '#1c1613' },
  { label: 'Pure Charcoal', hex: '#1f2937' }
];

export const ThemeCustomizerPage: React.FC<ThemeCustomizerPageProps> = ({ navigate }) => {
  const { isAdmin } = useAuth();
  const { addToast, refreshAll } = useStudioData();
  const {
    themeConfig,
    resolvedMode,
    isSavingTheme,
    setThemeMode,
    previewThemeConfig,
    saveThemePreferences
  } = useStudioTheme();

  const [draft, setDraft] = useState<StudioThemeConfig>(() => ({
    ...DEFAULT_STUDIO_THEME,
    ...themeConfig
  }));

  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      ...themeConfig
    }));
  }, [themeConfig]);

  const updateDraftField = <K extends keyof StudioThemeConfig>(
    key: K,
    value: StudioThemeConfig[K]
  ) => {
    const next: StudioThemeConfig = {
      ...draft,
      [key]: value
    };
    setDraft(next);
    previewThemeConfig(next);
  };

  const handleAccentSelect = (hex: string, light?: string, dark?: string) => {
    const next: StudioThemeConfig = {
      ...draft,
      presetId: 'custom',
      accentColor: hex,
      accentLight: light || hex,
      accentDark: dark || hex
    };
    setDraft(next);
    previewThemeConfig(next);
  };

  const handleRadiusChange = (px: number) => {
    const bucket: StudioThemeConfig['borderRadius'] =
      px <= 4 ? 'sharp' : px <= 14 ? 'editorial' : 'rounded';
    const next: StudioThemeConfig = {
      ...draft,
      borderRadius: bucket,
      borderRadiusPx: px
    };
    setDraft(next);
    previewThemeConfig(next);
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = STUDIO_THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const next: StudioThemeConfig = {
      ...draft,
      ...preset.config,
      presetId: preset.id
    };
    setDraft(next);
    previewThemeConfig(next);
    addToast(`Previewing '${preset.name}'. Click Save Global Theme to persist for all users.`, 'info');
  };

  const handleResetDefaults = async () => {
    setDraft(DEFAULT_STUDIO_THEME);
    previewThemeConfig(DEFAULT_STUDIO_THEME);
    try {
      await saveThemePreferences(DEFAULT_STUDIO_THEME);
      await refreshAll();
      addToast('Restored Royal Studio default Champagne Gold theme for all users.');
    } catch (err: any) {
      addToast(err.message || 'Failed to reset theme', 'error');
    }
  };

  const handleSaveTheme = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      addToast('Only administrators can persist global theme settings.', 'error');
      return;
    }
    try {
      await saveThemePreferences(draft);
      await refreshAll();
      addToast('Global theme preferences saved to database and applied across Admin & Public Website.');
    } catch (err: any) {
      addToast(err.message || 'Failed to save theme settings', 'error');
    }
  };

  const currentRadiusPx =
    typeof draft.borderRadiusPx === 'number'
      ? draft.borderRadiusPx
      : draft.borderRadius === 'sharp'
      ? 2
      : draft.borderRadius === 'rounded'
      ? 18
      : 12;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="p-6 bg-[#111111] text-white rounded-2xl border border-white/10 shadow-premium-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Palette className="w-5 h-5 text-accent" />
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-wide text-white">
              Admin Theme Customizer
            </h2>
            <span className="text-xs text-accent font-medium">
              · Synchronized ERP & Public Portfolio
            </span>
          </div>
          <p className="text-xs text-white/70 max-w-2xl leading-relaxed">
            Dynamically customize the studio&apos;s Accent Color, Primary Color, Border-Radius, Typography, and Light/Dark Mode. All changes are persisted in the unified ERP database and applied globally for all users on reload.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <ThemeToggle className="bg-white/10 text-white border-white/20 hover:bg-white/15" />

          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isSavingTheme || !isAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5 text-accent" />
            <span>Reset Default</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveTheme()}
            disabled={isSavingTheme || !isAdmin}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light text-[#111111] rounded-xl text-xs font-bold tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingTheme ? 'Persisting...' : 'Save Global Theme'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveTheme} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Primary Customizer Controls (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Accent Color, Primary Color & Border-Radius */}
          <div className="p-6 bg-surface rounded-2xl border border-border shadow-premium space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Sliders className="w-4 h-4 text-accent" />
                <span>1. Core Design Tokens — Accent Color, Primary Color & Border-Radius</span>
              </div>
              <span className="text-[11px] text-text-muted font-mono">
                Live CSS Variable Sync
              </span>
            </div>

            {/* Accent Color Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-primary">
                  Site Accent Color (<code className="text-accent font-mono">--color-accent</code>)
                </label>
                <span className="text-xs font-mono text-text-muted uppercase">
                  {draft.accentColor}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2.5 flex-1 p-2.5 bg-background rounded-xl border border-border">
                  <input
                    type="color"
                    aria-label="Accent Color Picker"
                    value={draft.accentColor}
                    onChange={(e) => handleAccentSelect(e.target.value)}
                    disabled={!isAdmin}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-primary">Primary Accent Hex</div>
                    <input
                      type="text"
                      value={draft.accentColor}
                      onChange={(e) => handleAccentSelect(e.target.value)}
                      disabled={!isAdmin}
                      placeholder="#c9a76a"
                      className="w-full mt-0.5 px-2.5 py-1 bg-surface border border-border rounded-lg text-xs font-mono uppercase text-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 flex-1">
                  <div className="p-2.5 bg-background rounded-xl border border-border">
                    <label className="block text-[10px] font-semibold text-text-muted">
                      Accent Light
                    </label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="color"
                        value={draft.accentLight}
                        onChange={(e) => updateDraftField('accentLight', e.target.value)}
                        disabled={!isAdmin}
                        className="w-6 h-6 rounded border border-border cursor-pointer bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={draft.accentLight}
                        onChange={(e) => updateDraftField('accentLight', e.target.value)}
                        disabled={!isAdmin}
                        className="w-full px-2 py-1 bg-surface border border-border rounded text-[11px] font-mono uppercase text-primary"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-background rounded-xl border border-border">
                    <label className="block text-[10px] font-semibold text-text-muted">
                      Accent Dark
                    </label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="color"
                        value={draft.accentDark}
                        onChange={(e) => updateDraftField('accentDark', e.target.value)}
                        disabled={!isAdmin}
                        className="w-6 h-6 rounded border border-border cursor-pointer bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={draft.accentDark}
                        onChange={(e) => updateDraftField('accentDark', e.target.value)}
                        disabled={!isAdmin}
                        className="w-full px-2 py-1 bg-surface border border-border rounded text-[11px] font-mono uppercase text-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Accent Swatches */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {ACCENT_SWATCHES.map((sw) => {
                  const active = draft.accentColor.toLowerCase() === sw.hex.toLowerCase();
                  return (
                    <button
                      key={sw.hex}
                      type="button"
                      onClick={() => handleAccentSelect(sw.hex, sw.light, sw.dark)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        active
                          ? 'border-accent bg-accent/15 text-primary font-semibold'
                          : 'border-border bg-background text-text-muted hover:text-primary'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <span>{sw.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Color Control */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-primary">
                  Site Primary Color (<code className="text-accent font-mono">--color-primary</code>)
                </label>
                <span className="text-xs font-mono text-text-muted uppercase">
                  {draft.primaryColor}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2.5 p-2.5 bg-background rounded-xl border border-border">
                  <input
                    type="color"
                    aria-label="Primary Color Picker"
                    value={draft.primaryColor}
                    onChange={(e) => {
                      updateDraftField('presetId', 'custom');
                      updateDraftField('primaryColor', e.target.value);
                    }}
                    disabled={!isAdmin}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-primary">Primary Hex</div>
                    <input
                      type="text"
                      value={draft.primaryColor}
                      onChange={(e) => {
                        updateDraftField('presetId', 'custom');
                        updateDraftField('primaryColor', e.target.value);
                      }}
                      disabled={!isAdmin}
                      placeholder="#111111"
                      className="w-full mt-0.5 px-2.5 py-1 bg-surface border border-border rounded-lg text-xs font-mono uppercase text-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 bg-background rounded-xl border border-border">
                  <input
                    type="color"
                    aria-label="Light Canvas Background"
                    value={draft.backgroundLight}
                    onChange={(e) => updateDraftField('backgroundLight', e.target.value)}
                    disabled={!isAdmin}
                    className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-primary">Light Canvas</div>
                    <input
                      type="text"
                      value={draft.backgroundLight}
                      onChange={(e) => updateDraftField('backgroundLight', e.target.value)}
                      disabled={!isAdmin}
                      className="w-full mt-0.5 px-2 py-1 bg-surface border border-border rounded-lg text-xs font-mono uppercase text-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 bg-background rounded-xl border border-border">
                  <input
                    type="color"
                    aria-label="Dark Canvas Background"
                    value={draft.backgroundDark}
                    onChange={(e) => updateDraftField('backgroundDark', e.target.value)}
                    disabled={!isAdmin}
                    className="w-9 h-9 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
                  />
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-primary">Dark Canvas</div>
                    <input
                      type="text"
                      value={draft.backgroundDark}
                      onChange={(e) => updateDraftField('backgroundDark', e.target.value)}
                      disabled={!isAdmin}
                      className="w-full mt-0.5 px-2 py-1 bg-surface border border-border rounded-lg text-xs font-mono uppercase text-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {PRIMARY_SWATCHES.map((sw) => {
                  const active = draft.primaryColor.toLowerCase() === sw.hex.toLowerCase();
                  return (
                    <button
                      key={sw.hex}
                      type="button"
                      onClick={() => {
                        updateDraftField('presetId', 'custom');
                        updateDraftField('primaryColor', sw.hex);
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        active
                          ? 'border-accent bg-accent/15 text-primary font-semibold'
                          : 'border-border bg-background text-text-muted hover:text-primary'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/25"
                        style={{ backgroundColor: sw.hex }}
                      />
                      <span>{sw.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Border-Radius Control */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-primary">
                  Global Border-Radius (<code className="text-accent font-mono">--studio-radius</code>)
                </label>
                <span className="text-xs font-mono font-semibold text-accent">
                  {currentRadiusPx}px ({draft.borderRadius})
                </span>
              </div>

              <div className="p-4 bg-background rounded-xl border border-border space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-text-muted">0px</span>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={2}
                    value={currentRadiusPx}
                    onChange={(e) => handleRadiusChange(Number(e.target.value))}
                    disabled={!isAdmin}
                    className="flex-1 accent-[#c9a76a] cursor-pointer"
                  />
                  <span className="text-xs font-mono text-text-muted">24px</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'sharp', label: 'Architectural Sharp', px: 2 },
                      { id: 'editorial', label: 'Editorial Classic', px: 12 },
                      { id: 'rounded', label: 'Soft Modern', px: 18 }
                    ] as const
                  ).map((opt) => {
                    const active = draft.borderRadius === opt.id && currentRadiusPx === opt.px;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleRadiusChange(opt.px)}
                        className={`p-3 border text-left transition-all cursor-pointer ${
                          active
                            ? 'border-accent bg-accent/15 text-primary font-semibold'
                            : 'border-border bg-surface text-text-muted hover:text-primary'
                        }`}
                        style={{ borderRadius: `${opt.px}px` }}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-primary">
                          <span>{opt.label}</span>
                          <span className="font-mono text-[11px] text-accent">{opt.px}px</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Light / Dark Mode Strategy & Curated Studio Palettes */}
          <div className="p-6 bg-surface rounded-2xl border border-border shadow-premium space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Palette className="w-4 h-4 text-accent" />
                <span>2. Color Mode & Curated Luxury Palettes</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  { id: 'light', label: 'Light Mode', desc: 'Warm Alabaster & Ivory', icon: Sun },
                  { id: 'dark', label: 'Dark Mode', desc: 'Obsidian Cinema Studio', icon: Moon },
                  { id: 'system', label: 'System Sync', desc: 'Follow OS Preference', icon: Monitor }
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const active = draft.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      updateDraftField('mode', m.id);
                      setThemeMode(m.id);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-accent bg-accent/15 text-primary'
                        : 'border-border bg-background text-text-muted hover:text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                        <Icon className="w-4 h-4 text-accent" />
                        <span>{m.label}</span>
                      </span>
                      {active && <Check className="w-4 h-4 text-accent" />}
                    </div>
                    <p className="text-[11px] text-text-muted">{m.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
              {STUDIO_THEME_PRESETS.map((preset) => {
                const active = draft.presetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'border-accent bg-accent/15'
                        : 'border-border bg-background hover:bg-surface'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: preset.config.accentColor }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: preset.config.primaryColor }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: preset.config.backgroundLight }}
                        />
                      </div>
                      <div className="text-xs font-semibold text-primary">{preset.name}</div>
                      <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">
                        {preset.subtitle}
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-border flex items-center justify-between text-[10px] font-semibold text-accent">
                      <span>{active ? 'Active' : 'Select'}</span>
                      {active && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Typography & Sidebar Layout */}
          <div className="p-6 bg-surface rounded-2xl border border-border shadow-premium space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-border text-primary font-semibold text-sm">
              <Type className="w-4 h-4 text-accent" />
              <span>3. Editorial Typography & Sidebar Architecture</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Display Heading Font
                </label>
                <select
                  value={draft.headingFont}
                  onChange={(e) => updateDraftField('headingFont', e.target.value as any)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-primary"
                >
                  <option value="Cormorant Garamond">Cormorant Garamond (Portfolio Serif)</option>
                  <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                  <option value="Cinzel">Cinzel (Classical Luxury)</option>
                  <option value="Inter">Inter (Modern Sans)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Body & UI Font
                </label>
                <select
                  value={draft.bodyFont}
                  onChange={(e) => updateDraftField('bodyFont', e.target.value as any)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-primary"
                >
                  <option value="Inter">Inter (Clean Studio Sans)</option>
                  <option value="Poppins">Poppins (Geometric Modern)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1.5">
                  Admin Sidebar Surface
                </label>
                <select
                  value={draft.sidebarStyle}
                  onChange={(e) => updateDraftField('sidebarStyle', e.target.value as any)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-semibold text-primary"
                >
                  <option value="obsidian">Signature Obsidian (Always Dark)</option>
                  <option value="editorial">Adaptive Editorial Surface</option>
                  <option value="glass">Translucent Studio Glass</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Dual Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 bg-surface rounded-2xl border border-border shadow-premium space-y-5 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Eye className="w-4 h-4 text-accent" />
                <span>Live Synchronized Preview</span>
              </div>
              <span className="text-[11px] font-mono text-accent uppercase">
                {resolvedMode} mode
              </span>
            </div>

            {/* Public Portfolio Preview Card */}
            <div
              className="p-5 border border-border bg-background space-y-3 transition-all"
              style={{ borderRadius: `${currentRadiusPx}px` }}
            >
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span className="inline-flex items-center gap-1 font-medium text-accent">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public Portfolio Preview</span>
                </span>
                <span>Burewala · Pakistan</span>
              </div>
              <h3 className="font-display text-2xl font-semibold text-primary leading-snug">
                Timeless Wedding Artistry &amp; Cinema
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Crafted with signature editorial lighting and bespoke storytelling across Pakistan.
              </p>
              <div className="pt-1 flex items-center gap-2.5">
                <span
                  className="px-4 py-2 text-xs font-semibold tracking-wider uppercase text-[#111111] shadow-xs"
                  style={{
                    backgroundColor: draft.accentColor,
                    borderRadius: `${Math.max(2, Math.round(currentRadiusPx * 0.75))}px`
                  }}
                >
                  Book Consultation
                </span>
                <span
                  className="px-3.5 py-2 text-xs font-medium border border-border text-primary"
                  style={{
                    borderRadius: `${Math.max(2, Math.round(currentRadiusPx * 0.75))}px`
                  }}
                >
                  View Films
                </span>
              </div>
            </div>

            {/* Admin ERP Preview Card */}
            <div
              className="p-5 border border-border bg-background space-y-3 transition-all"
              style={{ borderRadius: `${currentRadiusPx}px` }}
            >
              <div className="flex items-center justify-between text-[11px] text-text-muted">
                <span className="inline-flex items-center gap-1 font-medium text-accent">
                  <Layout className="w-3.5 h-3.5" />
                  <span>Admin ERP Surface Preview</span>
                </span>
                <span className="font-mono">PKR · Tabular</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-text-muted">Royal Signature Package</div>
                  <div className="font-display text-2xl font-semibold text-primary font-mono tabular-nums mt-0.5">
                    Rs. 285,000
                  </div>
                </div>
                <span
                  className="text-xs font-semibold"
                  style={{ color: draft.accentColor }}
                >
                  Confirmed · Paid 50%
                </span>
              </div>
              <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border">
                <div
                  className="h-full w-3/4 transition-all"
                  style={{ backgroundColor: draft.accentColor }}
                />
              </div>
            </div>

            {/* Persistence Status Summary */}
            <div className="p-3.5 bg-background rounded-xl border border-border flex items-start gap-2.5 text-xs text-text-muted">
              <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-primary">Database-Backed Theme State</div>
                <p className="text-[11px] leading-relaxed">
                  Saving stores <code className="font-mono text-accent">themeConfig</code> inside the unified ERP database so every visitor and admin reload inherits these exact settings.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingTheme || !isAdmin}
              className="w-full py-3 bg-accent hover:bg-accent-light text-[#111111] rounded-xl text-xs font-bold tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingTheme ? 'Saving to Database...' : 'Save Global Theme'}</span>
            </button>

            {navigate && (
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="w-full py-2 text-xs font-medium text-text-muted hover:text-accent transition-colors cursor-pointer"
              >
                Open Full Studio Profile &amp; Business Settings →
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ThemeCustomizerPage;
