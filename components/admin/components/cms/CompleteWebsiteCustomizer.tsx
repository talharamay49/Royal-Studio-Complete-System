import React, { useState, useEffect } from 'react';
import {
  Save,
  Sparkles,
  Layout,
  Video,
  Users,
  Film,
  ListChecks,
  HelpCircle,
  Navigation,
  Plus,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import type { WebsiteCustomizationConfig } from '@/types';
import { defaultWebsiteCustomization } from '@/lib/data';

interface CompleteWebsiteCustomizerProps {
  value: WebsiteCustomizationConfig;
  isSaving: boolean;
  onSave: (updated: WebsiteCustomizationConfig, sectionLabel: string) => Promise<void>;
  onUploadImage: (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (url: string) => void
  ) => void;
}

type CustomizerSectionTab =
  | 'VISIBILITY'
  | 'HERO'
  | 'ABOUT'
  | 'FILMS'
  | 'SECTIONS_PROCESS'
  | 'FAQ_CTA'
  | 'NAV_FOOTER';

export const CompleteWebsiteCustomizer: React.FC<CompleteWebsiteCustomizerProps> = ({
  value,
  isSaving,
  onSave,
  onUploadImage,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<CustomizerSectionTab>('VISIBILITY');
  const [draft, setDraft] = useState<WebsiteCustomizationConfig>(() => ({
    ...defaultWebsiteCustomization,
    ...value,
  }));
  const [newCityInput, setNewCityInput] = useState('');

  useEffect(() => {
    if (value) {
      setDraft({
        ...defaultWebsiteCustomization,
        ...value,
        sectionVisibility: {
          ...defaultWebsiteCustomization.sectionVisibility,
          ...(value.sectionVisibility || {}),
        },
        hero: {
          ...defaultWebsiteCustomization.hero,
          ...(value.hero || {}),
        },
        about: {
          ...defaultWebsiteCustomization.about,
          ...(value.about || {}),
        },
        films: {
          ...defaultWebsiteCustomization.films,
          ...(value.films || {}),
        },
        sections: {
          ...defaultWebsiteCustomization.sections,
          ...(value.sections || {}),
        },
        navigation: {
          ...defaultWebsiteCustomization.navigation,
          ...(value.navigation || {}),
        },
      });
    }
  }, [value]);

  const handleSaveCurrent = async (label = 'Complete Website Customization') => {
    await onSave(draft, label);
  };

  const toggleSectionVisibility = (
    key: keyof WebsiteCustomizationConfig['sectionVisibility']
  ) => {
    if (key === 'homePortfolioLimit') return;
    setDraft((prev) => ({
      ...prev,
      sectionVisibility: {
        ...prev.sectionVisibility,
        [key]: !prev.sectionVisibility[key],
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Complete Public Website &amp; Page Customizer</span>
          </div>
          <h3 className="text-base font-bold text-gray-900">
            Customize Every Section, Page, Headline, Video, Image, Navigation &amp; Footer
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Every change saved here updates the live public portfolio website (Home, About, Portfolio, Services, Wedding Films, Pricing, FAQ, Header &amp; Footer) immediately.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveCurrent('Complete Website Customization')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Website...' : 'Save All Website Changes'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Pills */}
      <div className="flex flex-wrap gap-2 bg-white p-3 rounded-2xl border border-gray-200">
        {[
          { id: 'VISIBILITY', label: '1. Section Visibility & Layout', icon: Layout },
          { id: 'HERO', label: '2. Hero Banner & Video', icon: Video },
          { id: 'ABOUT', label: '3. About Story & Founders', icon: Users },
          { id: 'FILMS', label: '4. Wedding Films & Showreel', icon: Film },
          { id: 'SECTIONS_PROCESS', label: '5. Services, Process & Stats', icon: ListChecks },
          { id: 'FAQ_CTA', label: '6. FAQs & Contact CTA', icon: HelpCircle },
          { id: 'NAV_FOOTER', label: '7. Navbar, Footer & Cities', icon: Navigation },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveSubTab(t.id as CustomizerSectionTab)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-amber-500 text-slate-950 shadow-2xs'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= 1. SECTION VISIBILITY & HOMEPAGE LAYOUT ================= */}
      {activeSubTab === 'VISIBILITY' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                Homepage Section Visibility &amp; Display Controls
              </h4>
              <p className="text-xs text-gray-500">
                Show or hide any section on the public portfolio website with a single click.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-700">
                Homepage Portfolio Photo Limit:
              </label>
              <input
                type="number"
                min={3}
                max={24}
                value={draft.sectionVisibility.homePortfolioLimit || 6}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    sectionVisibility: {
                      ...prev.sectionVisibility,
                      homePortfolioLimit: Math.max(3, Math.min(24, Number(e.target.value) || 6)),
                    },
                  }))
                }
                className="w-20 px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[
              { key: 'showHero', title: 'Hero Video & Headline Banner', desc: 'Full-screen top hero with YouTube reel & CTAs' },
              { key: 'showAboutPreview', title: 'About Studio Preview', desc: 'Story overview, highlights & co-founder portrait' },
              { key: 'showServicesPreview', title: 'Services Grid Showcase', desc: '8 signature wedding & commercial service cards' },
              { key: 'showPortfolioSection', title: 'Curated Portfolio Gallery', desc: 'Interactive filterable wedding photo grid on Home' },
              { key: 'showFeaturedFilm', title: 'Featured Cinema Film', desc: 'Full-width 4K wedding highlight film player' },
              { key: 'showWeddingProcess', title: '5-Step Wedding Process', desc: 'Step-by-step client journey timeline' },
              { key: 'showTestimonials', title: 'Client Testimonials Carousel', desc: '5-star Google review badge & couple quotes' },
              { key: 'showStatistics', title: 'Studio Statistics Bar', desc: '3000+ weddings, cities served & experience counters' },
              { key: 'showFaq', title: 'Frequently Asked Questions', desc: 'Expandable booking & deliverables FAQ accordion' },
              { key: 'showContactCta', title: 'Bottom Booking CTA Banner', desc: 'Send inquiry, WhatsApp & direct phone call bar' },
            ].map((item) => {
              const enabled = Boolean(
                draft.sectionVisibility[item.key as keyof typeof draft.sectionVisibility]
              );
              return (
                <div
                  key={item.key}
                  onClick={() =>
                    toggleSectionVisibility(item.key as keyof typeof draft.sectionVisibility)
                  }
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    enabled
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                      : 'bg-gray-50 border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-gray-900">{item.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{item.desc}</div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                      enabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{enabled ? 'Visible' : 'Hidden'}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 2. HERO BANNER & BACKGROUND VIDEO ================= */}
      {activeSubTab === 'HERO' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-5">
          <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
            Hero Section — Headlines, Background Reel, Poster Image &amp; Floating Counters
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Top Eyebrow Text
              </label>
              <input
                type="text"
                value={draft.hero.eyebrowText}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, hero: { ...p.hero, eyebrowText: e.target.value } }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Background YouTube Video ID
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draft.hero.youtubeVideoId}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      hero: { ...p.hero, youtubeVideoId: e.target.value.trim() },
                    }))
                  }
                  placeholder="QF3BmojTrKQ"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.hero.showBackgroundVideo}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        hero: { ...p.hero, showBackgroundVideo: e.target.checked },
                      }))
                    }
                  />
                  <span>Play Video</span>
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Main Hero Headline
              </label>
              <input
                type="text"
                value={draft.hero.headline}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, hero: { ...p.hero, headline: e.target.value } }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Hero Subheadline / Tagline
              </label>
              <textarea
                rows={2}
                value={draft.hero.subheadline}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, hero: { ...p.hero, subheadline: e.target.value } }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Hero Fallback / Poster Image URL or Upload
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft.hero.posterImage}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, hero: { ...p.hero, posterImage: e.target.value } }))
                  }
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
                <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Poster</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      onUploadImage(e, (url) =>
                        setDraft((p) => ({ ...p, hero: { ...p.hero, posterImage: url } }))
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Primary CTA Button Text &amp; Link
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={draft.hero.primaryCtaLabel}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      hero: { ...p.hero, primaryCtaLabel: e.target.value },
                    }))
                  }
                  placeholder="Check Availability"
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={draft.hero.primaryCtaHref}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      hero: { ...p.hero, primaryCtaHref: e.target.value },
                    }))
                  }
                  placeholder="/contact"
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Secondary CTA Button Text &amp; Link
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={draft.hero.secondaryCtaLabel}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      hero: { ...p.hero, secondaryCtaLabel: e.target.value },
                    }))
                  }
                  placeholder="View Portfolio"
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={draft.hero.secondaryCtaHref}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      hero: { ...p.hero, secondaryCtaHref: e.target.value },
                    }))
                  }
                  placeholder="/portfolio"
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Floating Hero Stats */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.hero.showFloatingStats}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      hero: { ...p.hero, showFloatingStats: e.target.checked },
                    }))
                  }
                />
                <span>Show Bottom Floating Stat Cards on Hero</span>
              </label>
              <button
                type="button"
                onClick={() =>
                  setDraft((p) => ({
                    ...p,
                    hero: {
                      ...p.hero,
                      floatingStats: [
                        ...(p.hero.floatingStats || []),
                        { value: '100%', label: 'Satisfaction' },
                      ],
                    },
                  }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-900 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Hero Stat</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(draft.hero.floatingStats || []).map((st, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={st.value}
                    onChange={(e) => {
                      const next = [...draft.hero.floatingStats];
                      next[idx] = { ...next[idx], value: e.target.value };
                      setDraft((p) => ({ ...p, hero: { ...p.hero, floatingStats: next } }));
                    }}
                    placeholder="3000+"
                    className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={st.label}
                    onChange={(e) => {
                      const next = [...draft.hero.floatingStats];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setDraft((p) => ({ ...p, hero: { ...p.hero, floatingStats: next } }));
                    }}
                    placeholder="Weddings"
                    className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = draft.hero.floatingStats.filter((_, i) => i !== idx);
                      setDraft((p) => ({ ...p, hero: { ...p.hero, floatingStats: next } }));
                    }}
                    className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= 3. ABOUT STORY & FOUNDERS ================= */}
      {activeSubTab === 'ABOUT' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-6">
          <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
            About Section (Home Preview) &amp; Complete /about Page Customization
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Home About Label &amp; Title
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={draft.about.homeLabel}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, about: { ...p.about, homeLabel: e.target.value } }))
                  }
                  placeholder="Our Story"
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={draft.about.homeTitle}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, about: { ...p.about, homeTitle: e.target.value } }))
                  }
                  placeholder="Timeless Visual Stories Since 2018"
                  className="col-span-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Floating Badge Value &amp; Label
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={draft.about.badgeValue}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, about: { ...p.about, badgeValue: e.target.value } }))
                  }
                  placeholder="3000+"
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
                />
                <input
                  type="text"
                  value={draft.about.badgeLabel}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, about: { ...p.about, badgeLabel: e.target.value } }))
                  }
                  placeholder="Weddings Captured"
                  className="col-span-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Home About Summary Description
              </label>
              <textarea
                rows={2}
                value={draft.about.homeDescription}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    about: { ...p.about, homeDescription: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Main About Portrait Image
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft.about.mainImage}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, about: { ...p.about, mainImage: e.target.value } }))
                  }
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
                <label className="inline-flex items-center gap-1 px-3 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      onUploadImage(e, (url) =>
                        setDraft((p) => ({ ...p, about: { ...p.about, mainImage: url } }))
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Secondary Inset Image (/about Page)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft.about.secondaryImage}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      about: { ...p.about, secondaryImage: e.target.value },
                    }))
                  }
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
                <label className="inline-flex items-center gap-1 px-3 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      onUploadImage(e, (url) =>
                        setDraft((p) => ({ ...p, about: { ...p.about, secondaryImage: url } }))
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                /about Page Full Story Paragraphs (One paragraph per line)
              </label>
              <textarea
                rows={4}
                value={(draft.about.storyParagraphs || []).join('\n')}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    about: {
                      ...p.about,
                      storyParagraphs: e.target.value.split('\n').filter((s) => s.trim() !== ''),
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Key Studio Highlights (One per line)
              </label>
              <textarea
                rows={3}
                value={(draft.about.highlights || []).join('\n')}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    about: {
                      ...p.about,
                      highlights: e.target.value.split('\n').filter((s) => s.trim() !== ''),
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          {/* Founders Editor */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Founders &amp; Leadership Profiles (/about)
              </h5>
              <button
                type="button"
                onClick={() =>
                  setDraft((p) => ({
                    ...p,
                    about: {
                      ...p.about,
                      founders: [
                        ...(p.about.founders || []),
                        {
                          name: 'New Team Leader',
                          role: 'Creative Director',
                          image: '/team/muhammad-ramzan.webp',
                          bio: '',
                        },
                      ],
                    },
                  }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Founder / Leader</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(draft.about.founders || []).map((f, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={f.name}
                      onChange={(e) => {
                        const next = [...draft.about.founders];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setDraft((p) => ({ ...p, about: { ...p.about, founders: next } }));
                      }}
                      placeholder="Founder Name"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={f.role}
                      onChange={(e) => {
                        const next = [...draft.about.founders];
                        next[idx] = { ...next[idx], role: e.target.value };
                        setDraft((p) => ({ ...p, about: { ...p.about, founders: next } }));
                      }}
                      placeholder="Co-Founder"
                      className="w-40 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = draft.about.founders.filter((_, i) => i !== idx);
                        setDraft((p) => ({ ...p, about: { ...p.about, founders: next } }));
                      }}
                      className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={f.image}
                      onChange={(e) => {
                        const next = [...draft.about.founders];
                        next[idx] = { ...next[idx], image: e.target.value };
                        setDraft((p) => ({ ...p, about: { ...p.about, founders: next } }));
                      }}
                      placeholder="Photo URL"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                    />
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-amber-400 rounded-lg text-[11px] font-bold cursor-pointer">
                      <Upload className="w-3 h-3" />
                      <span>Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          onUploadImage(e, (url) => {
                            const next = [...draft.about.founders];
                            next[idx] = { ...next[idx], image: url };
                            setDraft((p) => ({ ...p, about: { ...p.about, founders: next } }));
                          })
                        }
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    value={f.bio || ''}
                    onChange={(e) => {
                      const next = [...draft.about.founders];
                      next[idx] = { ...next[idx], bio: e.target.value };
                      setDraft((p) => ({ ...p, about: { ...p.about, founders: next } }));
                    }}
                    placeholder="Short bio or specialization..."
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. WEDDING FILMS & FEATURED SHOWREEL ================= */}
      {activeSubTab === 'FILMS' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-6">
          <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
            Featured Film (Home) &amp; /wedding-films Page Showcase
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Featured Film Section Title
              </label>
              <input
                type="text"
                value={draft.films.featuredSectionTitle}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    films: { ...p.films, featuredSectionTitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Featured Film Caption Title
              </label>
              <input
                type="text"
                value={draft.films.featuredFilmTitle}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    films: { ...p.films, featuredFilmTitle: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Featured YouTube Video ID
              </label>
              <input
                type="text"
                value={draft.films.featuredYoutubeId}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    films: { ...p.films, featuredYoutubeId: e.target.value.trim() },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Featured Film Description
              </label>
              <textarea
                rows={2}
                value={draft.films.featuredDescription}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    films: { ...p.films, featuredDescription: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Wedding Films Gallery (/wedding-films)
              </h5>
              <button
                type="button"
                onClick={() =>
                  setDraft((p) => ({
                    ...p,
                    films: {
                      ...p.films,
                      weddingFilms: [
                        ...(p.films.weddingFilms || []),
                        {
                          id: Date.now(),
                          title: 'New Royal Wedding Highlight Film',
                          youtubeId: 'QF3BmojTrKQ',
                          location: 'Burewala',
                          duration: '5:30',
                        },
                      ],
                    },
                  }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Wedding Film</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(draft.films.weddingFilms || []).map((film, idx) => (
                <div
                  key={film.id || idx}
                  className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={film.title}
                      onChange={(e) => {
                        const next = [...draft.films.weddingFilms];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setDraft((p) => ({ ...p, films: { ...p.films, weddingFilms: next } }));
                      }}
                      placeholder="Film Title"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = draft.films.weddingFilms.filter((_, i) => i !== idx);
                        setDraft((p) => ({ ...p, films: { ...p.films, weddingFilms: next } }));
                      }}
                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={film.youtubeId}
                      onChange={(e) => {
                        const next = [...draft.films.weddingFilms];
                        next[idx] = { ...next[idx], youtubeId: e.target.value.trim() };
                        setDraft((p) => ({ ...p, films: { ...p.films, weddingFilms: next } }));
                      }}
                      placeholder="YouTube ID"
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={film.location}
                      onChange={(e) => {
                        const next = [...draft.films.weddingFilms];
                        next[idx] = { ...next[idx], location: e.target.value };
                        setDraft((p) => ({ ...p, films: { ...p.films, weddingFilms: next } }));
                      }}
                      placeholder="City"
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      value={film.duration}
                      onChange={(e) => {
                        const next = [...draft.films.weddingFilms];
                        next[idx] = { ...next[idx], duration: e.target.value };
                        setDraft((p) => ({ ...p, films: { ...p.films, weddingFilms: next } }));
                      }}
                      placeholder="4:45"
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. SERVICES CARDS, WEDDING PROCESS & STATISTICS ================= */}
      {activeSubTab === 'SECTIONS_PROCESS' && (
        <div className="space-y-6">
          {/* Home Services Cards */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Home Services Preview Cards &amp; Portfolio Heading
                </h4>
                <p className="text-xs text-gray-500">
                  Customize the 8 service cards and portfolio headings displayed on the Homepage.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft((p) => ({
                    ...p,
                    sections: {
                      ...p.sections,
                      homeServices: [
                        ...(p.sections.homeServices || []),
                        {
                          id: `hs-${Date.now()}`,
                          title: 'New Custom Service',
                          description: 'Bespoke coverage tailored to your celebration.',
                          icon: 'camera',
                        },
                      ],
                    },
                  }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Home Service Card</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={draft.sections.servicesLabel}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    sections: { ...p.sections, servicesLabel: e.target.value },
                  }))
                }
                placeholder="Section Label"
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
              <input
                type="text"
                value={draft.sections.servicesTitle}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    sections: { ...p.sections, servicesTitle: e.target.value },
                  }))
                }
                placeholder="Section Title"
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
              />
              <input
                type="text"
                value={draft.sections.servicesDescription}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    sections: { ...p.sections, servicesDescription: e.target.value },
                  }))
                }
                placeholder="Section Description"
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(draft.sections.homeServices || []).map((srv, idx) => (
                <div
                  key={srv.id || idx}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <input
                      type="text"
                      value={srv.title}
                      onChange={(e) => {
                        const next = [...draft.sections.homeServices];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setDraft((p) => ({
                          ...p,
                          sections: { ...p.sections, homeServices: next },
                        }));
                      }}
                      className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = draft.sections.homeServices.filter((_, i) => i !== idx);
                        setDraft((p) => ({
                          ...p,
                          sections: { ...p.sections, homeServices: next },
                        }));
                      }}
                      className="text-rose-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={srv.description}
                    onChange={(e) => {
                      const next = [...draft.sections.homeServices];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setDraft((p) => ({
                        ...p,
                        sections: { ...p.sections, homeServices: next },
                      }));
                    }}
                    className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-[11px]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Wedding Process & Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Process Steps */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="text-sm font-bold text-gray-900">Wedding Process Timeline Steps</h4>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      sections: {
                        ...p.sections,
                        weddingProcess: [
                          ...(p.sections.weddingProcess || []),
                          {
                            step: (p.sections.weddingProcess?.length || 0) + 1,
                            title: 'New Step',
                            description: 'Step description...',
                          },
                        ],
                      },
                    }))
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {(draft.sections.weddingProcess || []).map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-amber-700">Step {st.step}</span>
                      <input
                        type="text"
                        value={st.title}
                        onChange={(e) => {
                          const next = [...draft.sections.weddingProcess];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setDraft((p) => ({
                            ...p,
                            sections: { ...p.sections, weddingProcess: next },
                          }));
                        }}
                        className="flex-1 px-2.5 py-1 bg-white border border-gray-300 rounded text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = draft.sections.weddingProcess
                            .filter((_, i) => i !== idx)
                            .map((item, i) => ({ ...item, step: i + 1 }));
                          setDraft((p) => ({
                            ...p,
                            sections: { ...p.sections, weddingProcess: next },
                          }));
                        }}
                        className="text-rose-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={st.description}
                      onChange={(e) => {
                        const next = [...draft.sections.weddingProcess];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setDraft((p) => ({
                          ...p,
                          sections: { ...p.sections, weddingProcess: next },
                        }));
                      }}
                      className="w-full px-2.5 py-1 bg-white border border-gray-300 rounded text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Statistics Bar */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="text-sm font-bold text-gray-900">Statistics Counter Bar</h4>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      sections: {
                        ...p.sections,
                        statistics: [
                          ...(p.sections.statistics || []),
                          { value: '100%', label: 'Client Satisfaction' },
                        ],
                      },
                    }))
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Counter</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {(draft.sections.statistics || []).map((stat, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={stat.value}
                      onChange={(e) => {
                        const next = [...draft.sections.statistics];
                        next[idx] = { ...next[idx], value: e.target.value };
                        setDraft((p) => ({
                          ...p,
                          sections: { ...p.sections, statistics: next },
                        }));
                      }}
                      className="w-28 px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => {
                        const next = [...draft.sections.statistics];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setDraft((p) => ({
                          ...p,
                          sections: { ...p.sections, statistics: next },
                        }));
                      }}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = draft.sections.statistics.filter((_, i) => i !== idx);
                        setDraft((p) => ({
                          ...p,
                          sections: { ...p.sections, statistics: next },
                        }));
                      }}
                      className="text-rose-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. FAQs & CONTACT CTA BANNER ================= */}
      {activeSubTab === 'FAQ_CTA' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Frequently Asked Questions (FAQ Accordion)
                </h4>
                <p className="text-xs text-gray-500">
                  Add, edit, or remove questions and answers displayed on the public website.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDraft((p) => ({
                    ...p,
                    sections: {
                      ...p.sections,
                      faqItems: [
                        {
                          question: 'How do we reserve our wedding dates with Royal Studio?',
                          answer:
                            'A 50% advance booking deposit confirms your dates and locks our senior camera crew.',
                        },
                        ...(p.sections.faqItems || []),
                      ],
                    },
                  }))
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAQ Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {(draft.sections.faqItems || []).map((faq, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const next = [...draft.sections.faqItems];
                        next[idx] = { ...next[idx], question: e.target.value };
                        setDraft((p) => ({
                          ...p,
                          sections: { ...p.sections, faqItems: next },
                        }));
                      }}
                      placeholder="Question"
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = draft.sections.faqItems.filter((_, i) => i !== idx);
                        setDraft((p) => ({
                          ...p,
                          sections: { ...p.sections, faqItems: next },
                        }));
                      }}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) => {
                      const next = [...draft.sections.faqItems];
                      next[idx] = { ...next[idx], answer: e.target.value };
                      setDraft((p) => ({
                        ...p,
                        sections: { ...p.sections, faqItems: next },
                      }));
                    }}
                    placeholder="Answer"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
            <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
              Bottom Contact &amp; Inquiry Call-to-Action Banner
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Eyebrow Label</label>
                <input
                  type="text"
                  value={draft.sections.ctaLabel}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      sections: { ...p.sections, ctaLabel: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Main Heading</label>
                <input
                  type="text"
                  value={draft.sections.ctaTitle}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      sections: { ...p.sections, ctaTitle: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Primary Button Label
                </label>
                <input
                  type="text"
                  value={draft.sections.ctaPrimaryButtonText}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      sections: { ...p.sections, ctaPrimaryButtonText: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={draft.sections.ctaDescription}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      sections: { ...p.sections, ctaDescription: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. NAVBAR, FOOTER & CITIES SERVED ================= */}
      {activeSubTab === 'NAV_FOOTER' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-6">
          <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
            Header Navigation Menu, Footer Content &amp; Cities Served
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Header CTA Button Label &amp; Link
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={draft.navigation.headerCtaLabel}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      navigation: { ...p.navigation, headerCtaLabel: e.target.value },
                    }))
                  }
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
                />
                <input
                  type="text"
                  value={draft.navigation.headerCtaHref}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      navigation: { ...p.navigation, headerCtaHref: e.target.value },
                    }))
                  }
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Footer Bottom Subtext
              </label>
              <input
                type="text"
                value={draft.navigation.footerSubtext}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    navigation: { ...p.navigation, footerSubtext: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Footer Brand Description / Tagline
              </label>
              <textarea
                rows={2}
                value={draft.navigation.footerTagline}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    navigation: { ...p.navigation, footerTagline: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Navigation Links Manager */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Navigation Bar &amp; Quick Links
              </h5>
              <button
                type="button"
                onClick={() =>
                  setDraft((p) => ({
                    ...p,
                    navigation: {
                      ...p.navigation,
                      navLinks: [
                        ...(p.navigation.navLinks || []),
                        { label: 'New Link', href: '/portfolio', visible: true },
                      ],
                    },
                  }))
                }
                className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Menu Link</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(draft.navigation.navLinks || []).map((link, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={link.visible !== false}
                    onChange={(e) => {
                      const next = [...draft.navigation.navLinks];
                      next[idx] = { ...next[idx], visible: e.target.checked };
                      setDraft((p) => ({
                        ...p,
                        navigation: { ...p.navigation, navLinks: next },
                      }));
                    }}
                    title="Toggle visibility"
                  />
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const next = [...draft.navigation.navLinks];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setDraft((p) => ({
                        ...p,
                        navigation: { ...p.navigation, navLinks: next },
                      }));
                    }}
                    className="w-28 px-2 py-1 bg-white border border-gray-300 rounded text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => {
                      const next = [...draft.navigation.navLinks];
                      next[idx] = { ...next[idx], href: e.target.value };
                      setDraft((p) => ({
                        ...p,
                        navigation: { ...p.navigation, navLinks: next },
                      }));
                    }}
                    className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = draft.navigation.navLinks.filter((_, i) => i !== idx);
                      setDraft((p) => ({
                        ...p,
                        navigation: { ...p.navigation, navLinks: next },
                      }));
                    }}
                    className="text-rose-500 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cities Served Manager */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-4">
                <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Cities Served Badges (Footer)
                </h5>
                <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.navigation.showCitiesInFooter}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        navigation: {
                          ...p.navigation,
                          showCitiesInFooter: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>Show in Footer</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCityInput}
                  onChange={(e) => setNewCityInput(e.target.value)}
                  placeholder="Add city (e.g. Karachi)"
                  className="px-2.5 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCityInput.trim()) return;
                    setDraft((p) => ({
                      ...p,
                      navigation: {
                        ...p.navigation,
                        citiesServed: [...(p.navigation.citiesServed || []), newCityInput.trim()],
                      },
                    }));
                    setNewCityInput('');
                  }}
                  className="px-3 py-1 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Add City
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(draft.navigation.citiesServed || []).map((city, idx) => (
                <span
                  key={`${city}-${idx}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-800"
                >
                  <span>{city}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = draft.navigation.citiesServed.filter((_, i) => i !== idx);
                      setDraft((p) => ({
                        ...p,
                        navigation: { ...p.navigation, citiesServed: next },
                      }));
                    }}
                    className="text-gray-400 hover:text-rose-600 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
