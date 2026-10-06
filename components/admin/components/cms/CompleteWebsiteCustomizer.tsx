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
  Youtube,
  Share2,
  RefreshCw,
  Play,
  ExternalLink,
  Link2,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type {
  WebsiteCustomizationConfig,
  ConnectedSocialAccount,
  SocialMediaPostItem,
  PortfolioItem,
} from '@/types';
import {
  defaultWebsiteCustomization,
  defaultConnectedSocialAccounts,
  defaultSocialMediaPosts,
  extractYoutubeId,
} from '@/lib/data';
import { apiRequest } from '../../services/api';
import { Modal } from '../common/Modal';
import { SocialMediaPortfolioSelector } from './SocialMediaPortfolioSelector';

interface CompleteWebsiteCustomizerProps {
  value: WebsiteCustomizationConfig;
  connectedAccounts?: ConnectedSocialAccount[];
  socialPosts?: SocialMediaPostItem[];
  portfolioItems?: PortfolioItem[];
  isSaving: boolean;
  onSave: (updated: WebsiteCustomizationConfig, sectionLabel: string) => Promise<void>;
  onSaveSocialState?: (
    nextAccounts: ConnectedSocialAccount[],
    nextPosts: SocialMediaPostItem[],
    nextPortfolio: PortfolioItem[],
    toastMessage: string,
    nextWebsiteCustomization?: WebsiteCustomizationConfig
  ) => Promise<void>;
  onUploadImage: (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (url: string, aspect?: 'tall' | 'wide' | 'square') => void
  ) => void;
}

type CustomizerSectionTab =
  | 'VISIBILITY'
  | 'HERO'
  | 'ABOUT'
  | 'FILMS'
  | 'SOCIAL_CONNECTED'
  | 'SECTIONS_PROCESS'
  | 'FAQ_CTA'
  | 'NAV_FOOTER';

export const CompleteWebsiteCustomizer: React.FC<CompleteWebsiteCustomizerProps> = ({
  value,
  connectedAccounts = defaultConnectedSocialAccounts,
  socialPosts = defaultSocialMediaPosts,
  portfolioItems = [],
  isSaving,
  onSave,
  onSaveSocialState,
  onUploadImage,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<CustomizerSectionTab>('VISIBILITY');
  const [draft, setDraft] = useState<WebsiteCustomizationConfig>(() => ({
    ...defaultWebsiteCustomization,
    ...value,
  }));
  const [newCityInput, setNewCityInput] = useState('');

  // YouTube Channel & Video Linker State for Wedding Films & Showreel
  const [channelInput, setChannelInput] = useState(
    value?.films?.connectedYoutubeChannelUrl ||
      value?.films?.connectedYoutubeChannelHandle ||
      'https://www.youtube.com/@royalstudio089'
  );
  const [quickYoutubeUrl, setQuickYoutubeUrl] = useState('');
  const [quickYoutubeLocation, setQuickYoutubeLocation] = useState('Burewala');
  const [isSyncingYoutube, setIsSyncingYoutube] = useState(false);
  const [isLinkingVideo, setIsLinkingVideo] = useState(false);
  const [playingYoutubeId, setPlayingYoutubeId] = useState<string | null>(null);
  const [ytPickerTarget, setYtPickerTarget] = useState<
    | { mode: 'SHOWREEL' }
    | { mode: 'HERO' }
    | { mode: 'NEW_WEDDING_FILM' }
    | { mode: 'REPLACE_WEDDING_FILM'; index: number }
    | null
  >(null);

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
          { id: 'FILMS', label: '4. Wedding Films & Showreel (YouTube)', icon: Film },
          { id: 'SOCIAL_CONNECTED', label: '5. Social Media Connected & Portfolio', icon: Share2 },
          { id: 'SECTIONS_PROCESS', label: '6. Services, Process & Stats', icon: ListChecks },
          { id: 'FAQ_CTA', label: '7. FAQs & Contact CTA', icon: HelpCircle },
          { id: 'NAV_FOOTER', label: '8. Navbar, Footer & Cities', icon: Navigation },
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
                Background YouTube Video ID or Link
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={draft.hero.youtubeVideoId}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      hero: { ...p.hero, youtubeVideoId: extractYoutubeId(e.target.value) },
                    }))
                  }
                  placeholder="QF3BmojTrKQ or YouTube URL"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setYtPickerTarget({ mode: 'HERO' })}
                  className="inline-flex items-center gap-1 px-2.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold cursor-pointer shrink-0"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>Select from YouTube</span>
                </button>
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

      {/* ================= 4. WEDDING FILMS & FEATURED SHOWREEL (YOUTUBE CHANNEL LINKER) ================= */}
      {activeSubTab === 'FILMS' && (
        <div className="space-y-6">
          {/* Card 1: Connected YouTube Channel & Instant Video Linker */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold mb-1.5">
                  <Youtube className="w-3.5 h-3.5" />
                  <span>Connected YouTube Channel Integration</span>
                </div>
                <h4 className="text-base font-bold text-gray-900">
                  Select &amp; Link Videos from Your YouTube Channel to Wedding Films &amp; Showreel
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select any video from your connected YouTube channel below (or paste any YouTube video URL) to link and display it on your <strong>Featured Showreel</strong> and <strong>/wedding-films</strong> page.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  placeholder="https://www.youtube.com/@royalstudio089"
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono w-64"
                />
                <button
                  type="button"
                  disabled={isSyncingYoutube || isSaving}
                  onClick={async () => {
                    setIsSyncingYoutube(true);
                    try {
                      const res = await apiRequest<{
                        channelHandle: string;
                        discoveredCount: number;
                        socialMediaPosts: SocialMediaPostItem[];
                        connectedSocialAccounts: ConnectedSocialAccount[];
                      }>('/cms/youtube/resolve', {
                        method: 'POST',
                        body: JSON.stringify({ channelUrlOrHandle: channelInput }),
                      });
                      const nextCustom: WebsiteCustomizationConfig = {
                        ...draft,
                        films: {
                          ...draft.films,
                          connectedYoutubeChannelHandle: res.channelHandle || '@royalstudio089',
                          connectedYoutubeChannelUrl: channelInput.startsWith('http')
                            ? channelInput
                            : `https://www.youtube.com/${channelInput.startsWith('@') ? channelInput : `@${channelInput}`}`,
                        },
                      };
                      setDraft(nextCustom);
                      if (onSaveSocialState && res.socialMediaPosts) {
                        await onSaveSocialState(
                          res.connectedSocialAccounts || connectedAccounts,
                          res.socialMediaPosts,
                          portfolioItems,
                          `Synced YouTube Channel (${res.channelHandle}) videos!`,
                          nextCustom
                        );
                      } else {
                        await onSave(nextCustom, 'Connected YouTube Channel');
                      }
                    } finally {
                      setIsSyncingYoutube(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingYoutube ? 'animate-spin' : ''}`} />
                  <span>{isSyncingYoutube ? 'Syncing Channel...' : 'Sync YouTube Channel'}</span>
                </button>
              </div>
            </div>

            {/* Quick Link by YouTube Video URL Bar */}
            <div className="p-4 bg-slate-950 text-white rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Link2 className="w-4 h-4" />
                  <span>Quick Link Video from YouTube URL or Video ID</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Supports youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/..., or 11-char ID
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                <input
                  type="text"
                  value={quickYoutubeUrl}
                  onChange={(e) => setQuickYoutubeUrl(e.target.value)}
                  placeholder="Paste YouTube video link (e.g. https://www.youtube.com/watch?v=QF3BmojTrKQ)..."
                  className="md:col-span-6 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder:text-slate-500"
                />
                <input
                  type="text"
                  value={quickYoutubeLocation}
                  onChange={(e) => setQuickYoutubeLocation(e.target.value)}
                  placeholder="Location (e.g. Burewala, Lahore)"
                  className="md:col-span-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500"
                />
                <button
                  type="button"
                  disabled={!quickYoutubeUrl.trim() || isLinkingVideo || isSaving}
                  onClick={async () => {
                    if (!quickYoutubeUrl.trim()) return;
                    setIsLinkingVideo(true);
                    try {
                      const cleanId = extractYoutubeId(quickYoutubeUrl);
                      const resolved = await apiRequest<{
                        youtubeId: string;
                        title: string;
                        authorName: string;
                        thumbnailUrl: string;
                        permalink: string;
                        duration: string;
                      }>('/cms/youtube/resolve', {
                        method: 'POST',
                        body: JSON.stringify({ urlOrId: quickYoutubeUrl }),
                      }).catch(() => ({
                        youtubeId: cleanId,
                        title: `Royal Studio 4K Wedding Film (${cleanId})`,
                        authorName: '@royalstudio089',
                        thumbnailUrl: `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
                        permalink: `https://www.youtube.com/watch?v=${cleanId}`,
                        duration: '2:15',
                      }));

                      const newFilmItem = {
                        id: Date.now(),
                        title: resolved.title || `Royal Studio Wedding Film (${resolved.youtubeId})`,
                        youtubeId: resolved.youtubeId,
                        location: quickYoutubeLocation.trim() || 'Burewala',
                        duration: resolved.duration || '2:15',
                        channelHandle: resolved.authorName || '@royalstudio089',
                        youtubeUrl: `https://www.youtube.com/watch?v=${resolved.youtubeId}`,
                        thumbnailUrl: resolved.thumbnailUrl,
                      };

                      const nextFilmsList = [newFilmItem, ...(draft.films.weddingFilms || [])];
                      const nextDraft: WebsiteCustomizationConfig = {
                        ...draft,
                        films: {
                          ...draft.films,
                          weddingFilms: nextFilmsList,
                        },
                      };
                      setDraft(nextDraft);

                      // Also ensure it is in socialPosts under YouTube channel
                      const existsInSocial = socialPosts.some(
                        (p) => (p.youtubeId || extractYoutubeId(p.permalink)) === resolved.youtubeId
                      );
                      const nextSocialPosts: SocialMediaPostItem[] = existsInSocial
                        ? socialPosts.map((p) =>
                            (p.youtubeId || extractYoutubeId(p.permalink)) === resolved.youtubeId
                              ? { ...p, selectedForWeddingFilms: true }
                              : p
                          )
                        : [
                            {
                              id: `yt-post-${resolved.youtubeId}`,
                              platform: 'youtube',
                              accountHandle: resolved.authorName || '@royalstudio089',
                              title: newFilmItem.title,
                              caption: `${newFilmItem.title} — Linked from YouTube channel`,
                              image: resolved.thumbnailUrl,
                              permalink: `https://www.youtube.com/watch?v=${resolved.youtubeId}`,
                              postedAt: new Date().toISOString().split('T')[0],
                              location: newFilmItem.location,
                              likesCount: 1850,
                              viewsCount: '24.5K',
                              mediaType: 'video',
                              youtubeId: resolved.youtubeId,
                              duration: newFilmItem.duration,
                              category: 'walima',
                              aspect: 'wide',
                              selectedForPortfolio: false,
                              selectedForWeddingFilms: true,
                            },
                            ...socialPosts,
                          ];

                      setQuickYoutubeUrl('');
                      if (onSaveSocialState) {
                        await onSaveSocialState(
                          connectedAccounts,
                          nextSocialPosts,
                          portfolioItems,
                          `Linked YouTube video "${newFilmItem.title}" and published to Wedding Films!`,
                          nextDraft
                        );
                      } else {
                        await onSave(nextDraft, 'Wedding Films YouTube Link');
                      }
                    } finally {
                      setIsLinkingVideo(false);
                    }
                  }}
                  className="md:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isLinkingVideo ? 'Linking...' : 'Link to Wedding Films'}</span>
                </button>
                <button
                  type="button"
                  disabled={!quickYoutubeUrl.trim() || isLinkingVideo || isSaving}
                  onClick={async () => {
                    if (!quickYoutubeUrl.trim()) return;
                    setIsLinkingVideo(true);
                    try {
                      const cleanId = extractYoutubeId(quickYoutubeUrl);
                      const resolved = await apiRequest<{
                        youtubeId: string;
                        title: string;
                      }>('/cms/youtube/resolve', {
                        method: 'POST',
                        body: JSON.stringify({ urlOrId: quickYoutubeUrl }),
                      }).catch(() => ({
                        youtubeId: cleanId,
                        title: draft.films.featuredFilmTitle,
                      }));

                      const nextDraft: WebsiteCustomizationConfig = {
                        ...draft,
                        films: {
                          ...draft.films,
                          featuredYoutubeId: resolved.youtubeId,
                          featuredFilmTitle: resolved.title || draft.films.featuredFilmTitle,
                        },
                      };
                      setDraft(nextDraft);
                      setQuickYoutubeUrl('');
                      await onSave(
                        nextDraft,
                        `Linked "${resolved.title}" as Featured Showreel`
                      );
                    } finally {
                      setIsLinkingVideo(false);
                    }
                  }}
                  className="md:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>Link as Showreel</span>
                </button>
              </div>
            </div>

            {/* Connected YouTube Channel Video Selector Grid */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-600" />
                    <span>
                      Connected YouTube Channel Videos (Click to Link to Showreel or Wedding Films)
                    </span>
                  </h5>
                  <p className="text-[11px] text-gray-500">
                    Select any video from your connected YouTube channel to immediately link and show it on your Featured Showreel, Wedding Films page, or Portfolio.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-gray-100 px-3 py-1 rounded-full">
                  {
                    socialPosts.filter(
                      (p) => p.platform === 'youtube' || p.mediaType === 'video' || Boolean(p.youtubeId)
                    ).length
                  }{' '}
                  Channel Videos Available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {socialPosts
                  .filter(
                    (p) => p.platform === 'youtube' || p.mediaType === 'video' || Boolean(p.youtubeId)
                  )
                  .map((videoPost) => {
                    const ytId = videoPost.youtubeId || extractYoutubeId(videoPost.permalink);
                    const isFeaturedShowreel =
                      extractYoutubeId(draft.films.featuredYoutubeId) === ytId;
                    const isInWeddingFilms = (draft.films.weddingFilms || []).some(
                      (f) => extractYoutubeId(f.youtubeId) === ytId
                    );
                    const isPlaying = playingYoutubeId === ytId;

                    return (
                      <div
                        key={videoPost.id}
                        className={`rounded-2xl border overflow-hidden transition-all flex flex-col justify-between ${
                          isFeaturedShowreel
                            ? 'bg-red-50/30 border-red-400 ring-2 ring-red-500/15'
                            : isInWeddingFilms
                            ? 'bg-amber-50/20 border-amber-400 ring-2 ring-amber-500/15'
                            : 'bg-gray-50/70 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div className="relative aspect-video bg-slate-950 overflow-hidden group">
                            {isPlaying ? (
                              <div className="relative w-full h-full">
                                <iframe
                                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                                  title={videoPost.title}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full"
                                />
                                <button
                                  type="button"
                                  onClick={() => setPlayingYoutubeId(null)}
                                  className="absolute top-2 right-2 p-1 rounded-full bg-slate-950/85 text-white hover:bg-rose-600 cursor-pointer z-10"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <img
                                  src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
                                  alt={videoPost.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => setPlayingYoutubeId(ytId)}
                                  className="absolute inset-0 flex items-center justify-center bg-slate-950/30 group-hover:bg-slate-950/45 transition-colors cursor-pointer"
                                  title="Preview YouTube video"
                                >
                                  <span className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Play className="w-5 h-5 fill-white ml-0.5" />
                                  </span>
                                </button>
                                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                  <span className="px-2 py-0.5 rounded bg-slate-950/85 text-white text-[10px] font-mono font-bold">
                                    {videoPost.duration || '2:15'}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">
                                    {videoPost.accountHandle}
                                  </span>
                                </div>
                                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                  {isFeaturedShowreel && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-xs">
                                      ★ Active Showreel
                                    </span>
                                  )}
                                  {isInWeddingFilms && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                                      ✓ In Wedding Films
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          <div className="p-3 space-y-1">
                            <div className="font-bold text-xs text-gray-900 line-clamp-1">
                              {videoPost.title}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-500">
                              <span>{videoPost.location || 'Burewala'}</span>
                              <span className="font-mono text-[10px]">ID: {ytId}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 pt-0 grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={async () => {
                              let nextWeddingFilms = [...(draft.films.weddingFilms || [])];
                              if (isInWeddingFilms) {
                                nextWeddingFilms = nextWeddingFilms.filter(
                                  (f) => extractYoutubeId(f.youtubeId) !== ytId
                                );
                              } else {
                                nextWeddingFilms = [
                                  {
                                    id: Date.now(),
                                    title: videoPost.title,
                                    youtubeId: ytId,
                                    location: videoPost.location || 'Burewala',
                                    duration: videoPost.duration || '2:15',
                                    description: videoPost.caption,
                                    channelHandle: videoPost.accountHandle,
                                    youtubeUrl: `https://www.youtube.com/watch?v=${ytId}`,
                                  },
                                  ...nextWeddingFilms,
                                ];
                              }
                              const nextDraft: WebsiteCustomizationConfig = {
                                ...draft,
                                films: {
                                  ...draft.films,
                                  weddingFilms: nextWeddingFilms,
                                },
                              };
                              setDraft(nextDraft);
                              await onSave(
                                nextDraft,
                                !isInWeddingFilms
                                  ? `Linked "${videoPost.title}" to Wedding Films (/wedding-films)`
                                  : `Removed "${videoPost.title}" from Wedding Films`
                              );
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                              isInWeddingFilms
                                ? 'bg-emerald-600 text-white hover:bg-rose-600'
                                : 'bg-slate-900 text-amber-400 hover:bg-amber-500 hover:text-slate-950'
                            }`}
                          >
                            <Film className="w-3 h-3" />
                            <span>
                              {isInWeddingFilms ? 'Shown on Wedding Films ✓' : 'Link to Wedding Films'}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isSaving || isFeaturedShowreel}
                            onClick={async () => {
                              const nextDraft: WebsiteCustomizationConfig = {
                                ...draft,
                                films: {
                                  ...draft.films,
                                  featuredYoutubeId: ytId,
                                  featuredFilmTitle: videoPost.title,
                                  featuredDescription:
                                    videoPost.caption || draft.films.featuredDescription,
                                },
                              };
                              setDraft(nextDraft);
                              await onSave(
                                nextDraft,
                                `Linked "${videoPost.title}" as Featured Showreel`
                              );
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                              isFeaturedShowreel
                                ? 'bg-red-600 text-white'
                                : 'bg-white hover:bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            <Youtube className="w-3 h-3" />
                            <span>{isFeaturedShowreel ? 'Active Showreel ✓' : 'Set as Showreel'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Card 2: Featured Showreel (Homepage) & Currently Linked Wedding Films (/wedding-films) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  Featured Showreel (Home) &amp; Linked Wedding Films (/wedding-films)
                </h4>
                <p className="text-xs text-gray-500">
                  Customize the main Featured Showreel and reorder or edit the linked videos displayed on the Wedding Films page.
                </p>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveCurrent('Wedding Films & Showreel')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold cursor-pointer shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Showreel & Wedding Films'}</span>
              </button>
            </div>

            {/* Featured Showreel Configuration + Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700">
                    <Video className="w-4 h-4" />
                    <span>Featured Showreel Configuration (Homepage Cinema Player)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setYtPickerTarget({ mode: 'SHOWREEL' })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    <span>Select Video from YouTube Channel</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Showreel Section Heading
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
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Showreel Film Title
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
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Linked YouTube Video URL or ID
                    </label>
                    <input
                      type="text"
                      value={draft.films.featuredYoutubeId}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          films: {
                            ...p.films,
                            featuredYoutubeId: extractYoutubeId(e.target.value),
                          },
                        }))
                      }
                      placeholder="Paste YouTube URL or Video ID (e.g. QF3BmojTrKQ)"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Showreel Description
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
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Live Showreel Video Player Preview */}
              <div className="lg:col-span-5 space-y-2">
                <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Live Linked Showreel Preview
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-gray-300 shadow-sm">
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYoutubeId(
                      draft.films.featuredYoutubeId
                    )}?rel=0`}
                    title={draft.films.featuredFilmTitle}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-800 truncate">
                    {draft.films.featuredFilmTitle}
                  </span>
                  <a
                    href={`https://www.youtube.com/watch?v=${extractYoutubeId(
                      draft.films.featuredYoutubeId
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-red-600 font-bold hover:underline shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open on YouTube</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Wedding Films Showcase List (/wedding-films) */}
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h5 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Wedding Films Gallery (/wedding-films) — {(draft.films.weddingFilms || []).length} Linked Films
                  </h5>
                  <p className="text-[11px] text-gray-500">
                    Each film below is linked to a YouTube video and shown on the public <strong>/wedding-films</strong> page.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setYtPickerTarget({ mode: 'NEW_WEDDING_FILM' })}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-2xs"
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    <span>Select Video from YouTube Channel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        films: {
                          ...p.films,
                          weddingFilms: [
                            {
                              id: Date.now(),
                              title: 'New Royal Wedding Highlight Film',
                              youtubeId: 'QF3BmojTrKQ',
                              location: 'Burewala',
                              duration: '5:30',
                              channelHandle: '@royalstudio089',
                            },
                            ...(p.films.weddingFilms || []),
                          ],
                        },
                      }))
                    }
                    className="inline-flex items-center gap-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Film Slot</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(draft.films.weddingFilms || []).map((film, idx) => {
                  const cleanFilmYtId = extractYoutubeId(film.youtubeId);
                  return (
                    <div
                      key={film.id || idx}
                      className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3"
                    >
                      <div className="flex gap-3">
                        <div className="relative w-36 aspect-video rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-gray-300">
                          <img
                            src={`https://i.ytimg.com/vi/${cleanFilmYtId}/hqdefault.jpg`}
                            alt={film.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <a
                            href={`https://www.youtube.com/watch?v=${cleanFilmYtId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 flex items-center justify-center bg-slate-950/30 hover:bg-slate-950/50 transition-colors"
                            title="Watch on YouTube"
                          >
                            <span className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                            </span>
                          </a>
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 text-[10px] font-bold font-mono">
                              Film #{idx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setYtPickerTarget({ mode: 'REPLACE_WEDDING_FILM', index: idx })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-md text-[10px] font-bold cursor-pointer"
                                title="Pick a video from your connected YouTube channel"
                              >
                                <Youtube className="w-3 h-3" />
                                <span>Pick Channel Video</span>
                              </button>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const next = [...draft.films.weddingFilms];
                                  const [moved] = next.splice(idx, 1);
                                  next.splice(idx - 1, 0, moved);
                                  setDraft((p) => ({
                                    ...p,
                                    films: { ...p.films, weddingFilms: next },
                                  }));
                                }}
                                className="p-1 text-gray-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === draft.films.weddingFilms.length - 1}
                                onClick={() => {
                                  const next = [...draft.films.weddingFilms];
                                  const [moved] = next.splice(idx, 1);
                                  next.splice(idx + 1, 0, moved);
                                  setDraft((p) => ({
                                    ...p,
                                    films: { ...p.films, weddingFilms: next },
                                  }));
                                }}
                                className="p-1 text-gray-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = draft.films.weddingFilms.filter((_, i) => i !== idx);
                                  setDraft((p) => ({
                                    ...p,
                                    films: { ...p.films, weddingFilms: next },
                                  }));
                                }}
                                className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                                title="Remove Film"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={film.title}
                            onChange={(e) => {
                              const next = [...draft.films.weddingFilms];
                              next[idx] = { ...next[idx], title: e.target.value };
                              setDraft((p) => ({
                                ...p,
                                films: { ...p.films, weddingFilms: next },
                              }));
                            }}
                            placeholder="Film Title"
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                            YouTube URL or Video ID
                          </label>
                          <input
                            type="text"
                            value={film.youtubeId}
                            onChange={(e) => {
                              const next = [...draft.films.weddingFilms];
                              next[idx] = {
                                ...next[idx],
                                youtubeId: extractYoutubeId(e.target.value),
                              };
                              setDraft((p) => ({
                                ...p,
                                films: { ...p.films, weddingFilms: next },
                              }));
                            }}
                            placeholder="YouTube URL or ID"
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                            Wedding Location / City
                          </label>
                          <input
                            type="text"
                            value={film.location}
                            onChange={(e) => {
                              const next = [...draft.films.weddingFilms];
                              next[idx] = { ...next[idx], location: e.target.value };
                              setDraft((p) => ({
                                ...p,
                                films: { ...p.films, weddingFilms: next },
                              }));
                            }}
                            placeholder="City"
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                            Duration
                          </label>
                          <input
                            type="text"
                            value={film.duration}
                            onChange={(e) => {
                              const next = [...draft.films.weddingFilms];
                              next[idx] = { ...next[idx], duration: e.target.value };
                              setDraft((p) => ({
                                ...p,
                                films: { ...p.films, weddingFilms: next },
                              }));
                            }}
                            placeholder="4:45"
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. CONNECTED SOCIAL MEDIA & PORTFOLIO SELECTOR ================= */}
      {activeSubTab === 'SOCIAL_CONNECTED' && onSaveSocialState && (
        <SocialMediaPortfolioSelector
          connectedAccounts={connectedAccounts}
          socialPosts={socialPosts}
          portfolioItems={portfolioItems}
          websiteCustomization={draft}
          isSaving={isSaving}
          onSaveSocialState={async (
            nextAccounts,
            nextPosts,
            nextPortfolio,
            toastMsg,
            nextCustom
          ) => {
            if (nextCustom) {
              setDraft(nextCustom);
            }
            await onSaveSocialState(
              nextAccounts,
              nextPosts,
              nextPortfolio,
              toastMsg,
              nextCustom
            );
          }}
          onUploadImage={onUploadImage}
        />
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

      {/* Modal: Select Video from Connected YouTube Channel */}
      <Modal
        isOpen={Boolean(ytPickerTarget)}
        onClose={() => setYtPickerTarget(null)}
        title={
          ytPickerTarget?.mode === 'SHOWREEL'
            ? 'Select Video from YouTube Channel for Featured Showreel'
            : ytPickerTarget?.mode === 'HERO'
            ? 'Select Video from YouTube Channel for Hero Background'
            : 'Select Video from Connected YouTube Channel for Wedding Films'
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-red-900">
              <Youtube className="w-4 h-4 text-red-600" />
              <span>
                Connected Channel: {draft.films.connectedYoutubeChannelHandle || '@royalstudio089'}
              </span>
            </div>
            <span className="text-[11px] text-red-700 font-semibold">
              Click any video below to link it immediately
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {socialPosts
              .filter(
                (p) => p.platform === 'youtube' || p.mediaType === 'video' || Boolean(p.youtubeId)
              )
              .map((vid) => {
                const ytId = vid.youtubeId || extractYoutubeId(vid.permalink);
                return (
                  <div
                    key={vid.id}
                    className="p-3 rounded-xl border border-gray-200 hover:border-red-400 bg-white flex flex-col justify-between gap-2.5 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950">
                        <img
                          src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
                          alt={vid.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/85 text-white text-[10px] font-mono">
                          {vid.duration || '2:15'}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-gray-900 line-clamp-1">{vid.title}</div>
                      <div className="text-[11px] text-gray-500 flex items-center justify-between">
                        <span>{vid.location || 'Burewala'}</span>
                        <span className="font-mono text-[10px]">{ytId}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!ytPickerTarget) return;
                        let nextDraft = { ...draft };
                        let label = 'YouTube Video Linked';

                        if (ytPickerTarget.mode === 'SHOWREEL') {
                          nextDraft = {
                            ...draft,
                            films: {
                              ...draft.films,
                              featuredYoutubeId: ytId,
                              featuredFilmTitle: vid.title,
                              featuredDescription: vid.caption || draft.films.featuredDescription,
                            },
                          };
                          label = `Linked "${vid.title}" as Featured Showreel`;
                        } else if (ytPickerTarget.mode === 'HERO') {
                          nextDraft = {
                            ...draft,
                            hero: {
                              ...draft.hero,
                              youtubeVideoId: ytId,
                              showBackgroundVideo: true,
                            },
                          };
                          label = `Linked "${vid.title}" as Hero Background Video`;
                        } else if (ytPickerTarget.mode === 'NEW_WEDDING_FILM') {
                          nextDraft = {
                            ...draft,
                            films: {
                              ...draft.films,
                              weddingFilms: [
                                {
                                  id: Date.now(),
                                  title: vid.title,
                                  youtubeId: ytId,
                                  location: vid.location || 'Burewala',
                                  duration: vid.duration || '2:15',
                                  description: vid.caption,
                                  channelHandle: vid.accountHandle,
                                  youtubeUrl: `https://www.youtube.com/watch?v=${ytId}`,
                                },
                                ...(draft.films.weddingFilms || []),
                              ],
                            },
                          };
                          label = `Added "${vid.title}" to Wedding Films (/wedding-films)`;
                        } else if (ytPickerTarget.mode === 'REPLACE_WEDDING_FILM') {
                          const nextList = [...(draft.films.weddingFilms || [])];
                          if (nextList[ytPickerTarget.index]) {
                            nextList[ytPickerTarget.index] = {
                              ...nextList[ytPickerTarget.index],
                              title: vid.title,
                              youtubeId: ytId,
                              location: vid.location || nextList[ytPickerTarget.index].location,
                              duration: vid.duration || nextList[ytPickerTarget.index].duration,
                              channelHandle: vid.accountHandle,
                              youtubeUrl: `https://www.youtube.com/watch?v=${ytId}`,
                            };
                          }
                          nextDraft = {
                            ...draft,
                            films: {
                              ...draft.films,
                              weddingFilms: nextList,
                            },
                          };
                          label = `Linked "${vid.title}" to Wedding Film #${ytPickerTarget.index + 1}`;
                        }

                        setDraft(nextDraft);
                        setYtPickerTarget(null);
                        await onSave(nextDraft, label);
                      }}
                      className="w-full py-2 bg-slate-900 hover:bg-red-600 text-amber-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Select &amp; Link This Video
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      </Modal>
    </div>
  );
};
