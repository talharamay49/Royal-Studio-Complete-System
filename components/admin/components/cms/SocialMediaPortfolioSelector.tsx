import React, { useState } from 'react';
import {
  Instagram,
  Facebook,
  Youtube,
  Share2,
  CheckCircle2,
  Plus,
  RefreshCw,
  ExternalLink,
  Check,
  Sparkles,
  Link2,
  Heart,
  MapPin,
  Filter,
  Upload,
  Eye,
  EyeOff,
  Settings2,
} from 'lucide-react';
import type {
  ConnectedSocialAccount,
  PortfolioCategory,
  PortfolioItem,
  SocialMediaPostItem,
  SocialPlatformId,
} from '@/types';
import { Modal } from '../common/Modal';

interface SocialMediaPortfolioSelectorProps {
  connectedAccounts: ConnectedSocialAccount[];
  socialPosts: SocialMediaPostItem[];
  portfolioItems: PortfolioItem[];
  isSaving: boolean;
  onSaveSocialState: (
    nextAccounts: ConnectedSocialAccount[],
    nextPosts: SocialMediaPostItem[],
    nextPortfolio: PortfolioItem[],
    toastMessage: string
  ) => Promise<void>;
  onUploadImage: (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (url: string, aspect?: 'tall' | 'wide' | 'square') => void
  ) => void;
}

const CATEGORIES: Exclude<PortfolioCategory, 'all'>[] = [
  'bridal',
  'barat',
  'walima',
  'mehndi',
  'nikah',
  'couple',
  'groom',
  'bride',
  'fashion',
  'corporate',
  'indoor',
  'outdoor',
  'boys',
  'birthday',
  'expo',
];

const PLATFORM_META: Record<
  SocialPlatformId,
  { label: string; color: string; bgBadge: string; border: string }
> = {
  instagram: {
    label: 'Instagram',
    color: 'text-pink-600',
    bgBadge: 'bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 text-white',
    border: 'border-pink-200',
  },
  facebook: {
    label: 'Facebook Page',
    color: 'text-blue-600',
    bgBadge: 'bg-blue-600 text-white',
    border: 'border-blue-200',
  },
  tiktok: {
    label: 'TikTok',
    color: 'text-slate-900',
    bgBadge: 'bg-slate-900 text-amber-400',
    border: 'border-slate-300',
  },
  youtube: {
    label: 'YouTube',
    color: 'text-red-600',
    bgBadge: 'bg-red-600 text-white',
    border: 'border-red-200',
  },
};

export const SocialMediaPortfolioSelector: React.FC<SocialMediaPortfolioSelectorProps> = ({
  connectedAccounts,
  socialPosts,
  portfolioItems,
  isSaving,
  onSaveSocialState,
  onUploadImage,
}) => {
  const [platformFilter, setPlatformFilter] = useState<'all' | SocialPlatformId>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [searchText, setSearchText] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Account configuration modal
  const [editingAccount, setEditingAccount] = useState<ConnectedSocialAccount | null>(null);
  const [accountForm, setAccountForm] = useState<{
    handle: string;
    profileUrl: string;
    accessTokenHint: string;
    followersLabel: string;
    connected: boolean;
    autoSyncToGallery: boolean;
  }>({
    handle: '',
    profileUrl: '',
    accessTokenHint: '',
    followersLabel: '',
    connected: true,
    autoSyncToGallery: false,
  });

  // Add / Fetch post from social media modal
  const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
  const [newPostForm, setNewPostForm] = useState<{
    platform: SocialPlatformId;
    title: string;
    caption: string;
    image: string;
    permalink: string;
    location: string;
    category: Exclude<PortfolioCategory, 'all'>;
    aspect: 'tall' | 'wide' | 'square';
    addToPortfolioImmediately: boolean;
  }>({
    platform: 'instagram',
    title: '',
    caption: '',
    image: '/portfolio/bridal-01-crimson-lehenga.jpg',
    permalink: 'https://www.instagram.com/p/',
    location: 'Burewala',
    category: 'bridal',
    aspect: 'tall',
    addToPortfolioImmediately: true,
  });

  const isPostInPortfolio = (post: SocialMediaPostItem) => {
    return (
      post.selectedForPortfolio ||
      portfolioItems.some(
        (p) =>
          (p.socialPermalink && p.socialPermalink === post.permalink) ||
          (p.image === post.image && p.title === post.title)
      )
    );
  };

  const filteredPosts = socialPosts.filter((post) => {
    const account = connectedAccounts.find((a) => a.platform === post.platform);
    if (account && !account.connected) return false;
    if (platformFilter !== 'all' && post.platform !== platformFilter) return false;
    const inGallery = isPostInPortfolio(post);
    if (statusFilter === 'selected' && !inGallery) return false;
    if (statusFilter === 'unselected' && inGallery) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return (
        post.title.toLowerCase().includes(q) ||
        post.caption.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        (post.location || '').toLowerCase().includes(q) ||
        post.accountHandle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleCheckbox = (postId: string) => {
    setCheckedIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const handleSelectAllFiltered = () => {
    if (checkedIds.length === filteredPosts.length) {
      setCheckedIds([]);
    } else {
      setCheckedIds(filteredPosts.map((p) => p.id));
    }
  };

  // Toggle single social media photo into / out of the Public Portfolio Gallery
  const handleToggleSinglePostPortfolio = async (post: SocialMediaPostItem) => {
    const currentlyIn = isPostInPortfolio(post);
    const nextPosts = socialPosts.map((p) =>
      p.id === post.id ? { ...p, selectedForPortfolio: !currentlyIn } : p
    );

    let nextPortfolio = [...portfolioItems];
    if (!currentlyIn) {
      // Add to portfolioItems if not already present
      const maxId = Math.max(0, ...nextPortfolio.map((i) => i.id));
      const newItem: PortfolioItem = {
        id: maxId + 1,
        title: post.title,
        category: post.category,
        image: post.image,
        aspect: post.aspect,
        location: post.location || 'Burewala',
        visible: true,
        sourcePlatform: post.platform,
        socialPermalink: post.permalink,
        socialHandle: post.accountHandle,
        exif: {
          camera: 'Sony A7R V',
          lens: '85mm f/1.4 GM',
          aperture: 'f/1.8',
          shutter: '1/250s',
          iso: '200',
        },
      };
      nextPortfolio = [newItem, ...nextPortfolio];
    } else {
      nextPortfolio = nextPortfolio.filter(
        (item) =>
          !(
            (item.socialPermalink && item.socialPermalink === post.permalink) ||
            (item.image === post.image && item.title === post.title)
          )
      );
    }

    await onSaveSocialState(
      connectedAccounts,
      nextPosts,
      nextPortfolio,
      !currentlyIn
        ? `Added "${post.title}" from ${PLATFORM_META[post.platform].label} to Public Portfolio Gallery!`
        : `Removed "${post.title}" from Public Portfolio Gallery.`
    );
  };

  // Batch add or remove checked social posts to/from Public Portfolio Gallery
  const handleBatchShowInPortfolio = async (show: boolean) => {
    if (checkedIds.length === 0) return;
    const selectedSet = new Set(checkedIds);

    const nextPosts = socialPosts.map((p) =>
      selectedSet.has(p.id) ? { ...p, selectedForPortfolio: show } : p
    );

    let nextPortfolio = [...portfolioItems];
    let maxId = Math.max(0, ...nextPortfolio.map((i) => i.id));

    if (show) {
      const toAdd: PortfolioItem[] = [];
      for (const post of socialPosts) {
        if (!selectedSet.has(post.id)) continue;
        const alreadyExists = nextPortfolio.some(
          (p) =>
            (p.socialPermalink && p.socialPermalink === post.permalink) ||
            (p.image === post.image && p.title === post.title)
        );
        if (!alreadyExists) {
          maxId += 1;
          toAdd.push({
            id: maxId,
            title: post.title,
            category: post.category,
            image: post.image,
            aspect: post.aspect,
            location: post.location || 'Burewala',
            visible: true,
            sourcePlatform: post.platform,
            socialPermalink: post.permalink,
            socialHandle: post.accountHandle,
            exif: {
              camera: 'Sony A7R V',
              lens: '85mm f/1.4 GM',
              aperture: 'f/1.8',
              shutter: '1/250s',
              iso: '200',
            },
          });
        }
      }
      nextPortfolio = [...toAdd, ...nextPortfolio];
    } else {
      const postsToRemove = socialPosts.filter((p) => selectedSet.has(p.id));
      nextPortfolio = nextPortfolio.filter(
        (item) =>
          !postsToRemove.some(
            (post) =>
              (item.socialPermalink && item.socialPermalink === post.permalink) ||
              (item.image === post.image && item.title === post.title)
          )
      );
    }

    await onSaveSocialState(
      connectedAccounts,
      nextPosts,
      nextPortfolio,
      show
        ? `Published ${checkedIds.length} social media photo(s) to the Public Portfolio Gallery!`
        : `Hidden ${checkedIds.length} social media photo(s) from the Public Portfolio Gallery.`
    );
    setCheckedIds([]);
  };

  // Update category or aspect ratio on a social post (and sync to portfolio if already shown)
  const handleUpdatePostField = async (
    postId: string,
    updates: Partial<Pick<SocialMediaPostItem, 'category' | 'aspect' | 'title' | 'location'>>
  ) => {
    const target = socialPosts.find((p) => p.id === postId);
    if (!target) return;

    const updatedPost = { ...target, ...updates };
    const nextPosts = socialPosts.map((p) => (p.id === postId ? updatedPost : p));

    const nextPortfolio = portfolioItems.map((item) => {
      const matches =
        (item.socialPermalink && item.socialPermalink === target.permalink) ||
        (item.image === target.image && item.title === target.title);
      if (!matches) return item;
      return {
        ...item,
        ...(updates.category ? { category: updates.category } : {}),
        ...(updates.aspect ? { aspect: updates.aspect } : {}),
        ...(updates.title ? { title: updates.title } : {}),
        ...(updates.location ? { location: updates.location } : {}),
      };
    });

    await onSaveSocialState(
      connectedAccounts,
      nextPosts,
      nextPortfolio,
      `Updated social photo settings for "${updatedPost.title}".`
    );
  };

  const handleOpenEditAccount = (acc: ConnectedSocialAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      handle: acc.handle,
      profileUrl: acc.profileUrl,
      accessTokenHint: acc.accessTokenHint || '',
      followersLabel: acc.followersLabel || '',
      connected: acc.connected,
      autoSyncToGallery: !!acc.autoSyncToGallery,
    });
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const nextAccounts = connectedAccounts.map((a) =>
      a.id === editingAccount.id
        ? {
            ...a,
            handle: accountForm.handle.trim() || a.handle,
            profileUrl: accountForm.profileUrl.trim() || a.profileUrl,
            accessTokenHint: accountForm.accessTokenHint.trim(),
            followersLabel: accountForm.followersLabel.trim(),
            connected: accountForm.connected,
            autoSyncToGallery: accountForm.autoSyncToGallery,
            lastSyncedAt: new Date().toISOString(),
          }
        : a
    );
    await onSaveSocialState(
      nextAccounts,
      socialPosts,
      portfolioItems,
      `${PLATFORM_META[editingAccount.platform].label} connection updated!`
    );
    setEditingAccount(null);
  };

  const handleSyncFeedsNow = async () => {
    setIsSyncing(true);
    try {
      const nowIso = new Date().toISOString();
      const nextAccounts = connectedAccounts.map((a) =>
        a.connected ? { ...a, lastSyncedAt: nowIso } : a
      );
      await onSaveSocialState(
        nextAccounts,
        socialPosts,
        portfolioItems,
        'Synced latest media posts from all connected social media accounts!'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddSocialPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostForm.title.trim() || !newPostForm.image.trim()) return;

    const acc = connectedAccounts.find((a) => a.platform === newPostForm.platform);
    const newPost: SocialMediaPostItem = {
      id: `${newPostForm.platform}-post-${Date.now().toString().slice(-5)}`,
      platform: newPostForm.platform,
      accountHandle: acc?.handle || `@royalstudio.${newPostForm.platform}`,
      title: newPostForm.title.trim(),
      caption: newPostForm.caption.trim() || newPostForm.title.trim(),
      image: newPostForm.image.trim(),
      permalink: newPostForm.permalink.trim() || 'https://www.instagram.com/',
      postedAt: new Date().toISOString().split('T')[0],
      location: newPostForm.location.trim() || 'Burewala',
      likesCount: Math.floor(400 + Math.random() * 1500),
      category: newPostForm.category,
      aspect: newPostForm.aspect,
      selectedForPortfolio: newPostForm.addToPortfolioImmediately,
    };

    const nextPosts = [newPost, ...socialPosts];
    let nextPortfolio = [...portfolioItems];

    if (newPostForm.addToPortfolioImmediately) {
      const maxId = Math.max(0, ...nextPortfolio.map((i) => i.id));
      nextPortfolio = [
        {
          id: maxId + 1,
          title: newPost.title,
          category: newPost.category,
          image: newPost.image,
          aspect: newPost.aspect,
          location: newPost.location,
          visible: true,
          sourcePlatform: newPost.platform,
          socialPermalink: newPost.permalink,
          socialHandle: newPost.accountHandle,
          exif: {
            camera: 'Sony A7R V',
            lens: '85mm f/1.4 GM',
            aperture: 'f/1.8',
            shutter: '1/250s',
            iso: '200',
          },
        },
        ...nextPortfolio,
      ];
    }

    await onSaveSocialState(
      connectedAccounts,
      nextPosts,
      nextPortfolio,
      newPostForm.addToPortfolioImmediately
        ? `Imported "${newPost.title}" from ${PLATFORM_META[newPost.platform].label} and published to Portfolio Gallery!`
        : `Fetched "${newPost.title}" into Social Media Feed.`
    );
    setIsAddPostModalOpen(false);
    setNewPostForm({
      platform: 'instagram',
      title: '',
      caption: '',
      image: '/portfolio/bridal-01-crimson-lehenga.jpg',
      permalink: 'https://www.instagram.com/p/',
      location: 'Burewala',
      category: 'bridal',
      aspect: 'tall',
      addToPortfolioImmediately: true,
    });
  };

  const renderPlatformIcon = (platform: SocialPlatformId, className = 'w-4 h-4') => {
    if (platform === 'instagram') return <Instagram className={className} />;
    if (platform === 'facebook') return <Facebook className={className} />;
    if (platform === 'youtube') return <Youtube className={className} />;
    return <Share2 className={className} />;
  };

  const totalSelectedCount = socialPosts.filter((p) => isPostInPortfolio(p)).length;

  return (
    <div className="space-y-6">
      {/* Connected Social Accounts Strip */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-1">
              <Share2 className="w-3.5 h-3.5" />
              <span>Connected Social Media Accounts &amp; Direct Gallery Importer</span>
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Select &amp; Show Photos in Portfolio Gallery from Connected Social Accounts
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Connect your studio&apos;s Instagram, Facebook Page, TikTok, and YouTube accounts, then select individual or multiple photos below to show them directly in the public <strong>/portfolio</strong> gallery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSyncNow => handleSyncFeedsNow()}
              disabled={isSyncing || isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Feed...' : 'Sync Connected Accounts'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddPostModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import by Social Post URL</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {connectedAccounts.map((acc) => {
            const meta = PLATFORM_META[acc.platform];
            const platformPosts = socialPosts.filter((p) => p.platform === acc.platform);
            const shownCount = platformPosts.filter((p) => isPostInPortfolio(p)).length;

            return (
              <div
                key={acc.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  acc.connected
                    ? 'bg-slate-50/70 border-slate-200'
                    : 'bg-gray-50/40 border-dashed border-gray-300 opacity-75'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${meta.bgBadge}`}
                    >
                      {renderPlatformIcon(acc.platform, 'w-3.5 h-3.5')}
                      <span>{meta.label}</span>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        acc.connected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {acc.connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-xs text-gray-900 truncate">{acc.handle}</div>
                    <div className="text-[11px] text-gray-500">
                      {acc.followersLabel || 'Official Studio Account'} ·{' '}
                      <strong className="text-slate-800">{shownCount}</strong>/{platformPosts.length} in Gallery
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditAccount(acc)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-amber-700 cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>{acc.connected ? 'Manage Account' : 'Connect Now'}</span>
                  </button>
                  <a
                    href={acc.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-slate-900"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Profile</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Multi-Select Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All Connected (${socialPosts.length})` },
              { id: 'instagram', label: 'Instagram' },
              { id: 'facebook', label: 'Facebook' },
              { id: 'tiktok', label: 'TikTok' },
              { id: 'youtube', label: 'YouTube' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPlatformFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  platformFilter === tab.id
                    ? 'bg-slate-900 text-amber-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

            {[
              { id: 'all', label: 'All Posts' },
              { id: 'selected', label: `Shown in Portfolio (${totalSelectedCount})` },
              { id: 'unselected', label: 'Not in Portfolio Yet' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-amber-500/20 text-amber-900 border border-amber-500/40 font-bold'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search caption, hashtag, city..."
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs w-full sm:w-56"
            />
          </div>
        </div>

        {/* Batch Selection Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              <input
                type="checkbox"
                readOnly
                checked={filteredPosts.length > 0 && checkedIds.length === filteredPosts.length}
                className="rounded border-gray-300"
              />
              <span>
                {checkedIds.length > 0
                  ? `${checkedIds.length} social photo(s) selected`
                  : 'Select Multiple Photos'}
              </span>
            </button>
          </div>

          {checkedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleBatchShowInPortfolio(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Show Selected in Portfolio Gallery ({checkedIds.length})</span>
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleBatchShowInPortfolio(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Selected from Portfolio</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Social Media Photos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPosts.map((post) => {
          const inPortfolio = isPostInPortfolio(post);
          const isChecked = checkedIds.includes(post.id);
          const meta = PLATFORM_META[post.platform];

          return (
            <div
              key={post.id}
              className={`bg-white rounded-2xl border overflow-hidden transition-all flex flex-col justify-between ${
                inPortfolio
                  ? 'border-emerald-500/70 ring-2 ring-emerald-500/15 shadow-sm'
                  : isChecked
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div>
                {/* Image Header */}
                <div className="relative h-56 bg-slate-950 overflow-hidden group">
                  <img
                    src={post.image}
                    alt={post.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Top-left Checkbox & Platform Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleCheckbox(post.id)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-amber-500 border-amber-500 text-slate-950'
                          : 'bg-slate-950/70 border-white/40 text-white hover:bg-slate-900'
                      }`}
                      title="Select for batch action"
                    >
                      {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xs ${meta.bgBadge}`}
                    >
                      {renderPlatformIcon(post.platform, 'w-3 h-3')}
                      <span>{post.accountHandle}</span>
                    </span>
                  </div>

                  {/* Top-right Portfolio Status Badge */}
                  <div className="absolute top-3 right-3">
                    {inPortfolio ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Live in Portfolio</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/75 text-gray-200 text-[10px] font-semibold backdrop-blur-xs">
                        Not in Gallery
                      </span>
                    )}
                  </div>

                  {/* Bottom gradient metadata */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-3 flex items-center justify-between text-[11px] text-white">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {post.location || 'Burewala'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                      <Heart className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {(post.likesCount || 0).toLocaleString()} · {post.postedAt}
                    </span>
                  </div>
                </div>

                {/* Caption & Category Controls */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="font-bold text-xs text-gray-900 line-clamp-1">{post.title}</div>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {post.caption}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                        Gallery Category
                      </label>
                      <select
                        value={post.category}
                        onChange={(e) =>
                          handleUpdatePostField(post.id, {
                            category: e.target.value as Exclude<PortfolioCategory, 'all'>,
                          })
                        }
                        className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold uppercase text-slate-800"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                        Grid Aspect
                      </label>
                      <select
                        value={post.aspect}
                        onChange={(e) =>
                          handleUpdatePostField(post.id, {
                            aspect: e.target.value as 'tall' | 'wide' | 'square',
                          })
                        }
                        className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-slate-800"
                      >
                        <option value="tall">Tall (3:4)</option>
                        <option value="wide">Wide (16:10)</option>
                        <option value="square">Square (1:1)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleToggleSinglePostPortfolio(post)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inPortfolio
                      ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 border border-emerald-200 hover:border-rose-200'
                      : 'bg-slate-900 hover:bg-amber-500 text-amber-400 hover:text-slate-950 shadow-2xs'
                  }`}
                >
                  {inPortfolio ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Shown in Portfolio (Click to Hide)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Select &amp; Show in Portfolio</span>
                    </>
                  )}
                </button>

                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-slate-900 rounded-lg border border-gray-200 bg-white"
                  title="Open original social post"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Connect / Edit Social Media Account */}
      <Modal
        isOpen={Boolean(editingAccount)}
        onClose={() => setEditingAccount(null)}
        title={
          editingAccount
            ? `Configure ${PLATFORM_META[editingAccount.platform].label} Connection`
            : 'Social Account Settings'
        }
      >
        <form onSubmit={handleSaveAccount} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-900">Account Connection Status</div>
              <div className="text-[11px] text-gray-500">
                Enable to fetch and select photos from this social account for the portfolio gallery.
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={accountForm.connected}
                onChange={(e) => setAccountForm((f) => ({ ...f, connected: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span>{accountForm.connected ? 'Connected' : 'Disconnected'}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Account Handle / Username *
              </label>
              <input
                type="text"
                required
                value={accountForm.handle}
                onChange={(e) => setAccountForm((f) => ({ ...f, handle: e.target.value }))}
                placeholder="@royalstudio.burewala"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Followers / Audience Badge
              </label>
              <input
                type="text"
                value={accountForm.followersLabel}
                onChange={(e) => setAccountForm((f) => ({ ...f, followersLabel: e.target.value }))}
                placeholder="48.5K Followers"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Profile URL *</label>
            <input
              type="url"
              required
              value={accountForm.profileUrl}
              onChange={(e) => setAccountForm((f) => ({ ...f, profileUrl: e.target.value }))}
              placeholder="https://www.instagram.com/..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Graph API / OAuth Access Token (Optional)
            </label>
            <input
              type="text"
              value={accountForm.accessTokenHint}
              onChange={(e) => setAccountForm((f) => ({ ...f, accessTokenHint: e.target.value }))}
              placeholder="Paste Instagram Graph API or Meta Page token..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingAccount(null)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer"
            >
              Save Connection
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Import Photo from Social Post URL */}
      <Modal
        isOpen={isAddPostModalOpen}
        onClose={() => setIsAddPostModalOpen(false)}
        title="Import Photo from Connected Social Media Account"
      >
        <form onSubmit={handleAddSocialPost} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Social Media Platform *
              </label>
              <select
                value={newPostForm.platform}
                onChange={(e) =>
                  setNewPostForm((f) => ({ ...f, platform: e.target.value as SocialPlatformId }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
              >
                <option value="instagram">Instagram (@royalstudio.burewala)</option>
                <option value="facebook">Facebook Page (RoyalStudioOfficialPage)</option>
                <option value="tiktok">TikTok (@royalstudio.pk)</option>
                <option value="youtube">YouTube (@RoyalStudioFilms)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Post Permalink / URL
              </label>
              <input
                type="text"
                value={newPostForm.permalink}
                onChange={(e) => setNewPostForm((f) => ({ ...f, permalink: e.target.value }))}
                placeholder="https://www.instagram.com/p/..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Portfolio Display Title *
            </label>
            <input
              type="text"
              required
              value={newPostForm.title}
              onChange={(e) => setNewPostForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Royal Barat Portrait in Burewala"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Social Photo URL or Upload Image *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newPostForm.image}
                onChange={(e) => setNewPostForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="/portfolio/... or https://..."
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    onUploadImage(e, (url, aspect) =>
                      setNewPostForm((f) => ({
                        ...f,
                        image: url,
                        aspect: aspect || f.aspect,
                      }))
                    )
                  }
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
              <select
                value={newPostForm.category}
                onChange={(e) =>
                  setNewPostForm((f) => ({
                    ...f,
                    category: e.target.value as Exclude<PortfolioCategory, 'all'>,
                  }))
                }
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs uppercase font-bold"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Aspect</label>
              <select
                value={newPostForm.aspect}
                onChange={(e) =>
                  setNewPostForm((f) => ({
                    ...f,
                    aspect: e.target.value as 'tall' | 'wide' | 'square',
                  }))
                }
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="tall">Tall (3:4)</option>
                <option value="wide">Wide (16:10)</option>
                <option value="square">Square (1:1)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={newPostForm.location}
                onChange={(e) => setNewPostForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Social Post Caption</label>
            <textarea
              rows={2}
              value={newPostForm.caption}
              onChange={(e) => setNewPostForm((f) => ({ ...f, caption: e.target.value }))}
              placeholder="Original Instagram / Facebook caption & hashtags..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 cursor-pointer">
            <input
              type="checkbox"
              checked={newPostForm.addToPortfolioImmediately}
              onChange={(e) =>
                setNewPostForm((f) => ({ ...f, addToPortfolioImmediately: e.target.checked }))
              }
            />
            <span>Immediately show this photo in the Public Portfolio Gallery (/portfolio)</span>
          </label>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddPostModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer"
            >
              Import Social Photo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
