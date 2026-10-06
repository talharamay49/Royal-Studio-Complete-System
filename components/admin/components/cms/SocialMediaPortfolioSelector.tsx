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
  Heart,
  MapPin,
  Upload,
  Eye,
  EyeOff,
  Settings2,
  Video,
  Image as ImageIcon,
  Play,
  Film,
  X,
  Link2,
} from 'lucide-react';
import type {
  ConnectedSocialAccount,
  PortfolioCategory,
  PortfolioItem,
  SocialMediaPostItem,
  SocialPlatformId,
  WebsiteCustomizationConfig,
} from '@/types';
import { extractYoutubeId, defaultWebsiteCustomization } from '@/lib/data';
import { apiRequest } from '../../services/api';
import { Modal } from '../common/Modal';

interface SocialMediaPortfolioSelectorProps {
  connectedAccounts: ConnectedSocialAccount[];
  socialPosts: SocialMediaPostItem[];
  portfolioItems: PortfolioItem[];
  websiteCustomization?: WebsiteCustomizationConfig;
  isSaving: boolean;
  onSaveSocialState: (
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
    label: 'YouTube Channel',
    color: 'text-red-600',
    bgBadge: 'bg-red-600 text-white',
    border: 'border-red-200',
  },
};

export const SocialMediaPortfolioSelector: React.FC<SocialMediaPortfolioSelectorProps> = ({
  connectedAccounts,
  socialPosts,
  portfolioItems,
  websiteCustomization,
  isSaving,
  onSaveSocialState,
  onUploadImage,
}) => {
  const [platformFilter, setPlatformFilter] = useState<'all' | SocialPlatformId>('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'selected' | 'unselected' | 'films'>('all');
  const [searchText, setSearchText] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [playingPostId, setPlayingPostId] = useState<string | null>(null);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);

  // Account configuration modal
  const [editingAccount, setEditingAccount] = useState<ConnectedSocialAccount | null>(null);
  const [accountForm, setAccountForm] = useState<{
    handle: string;
    profileUrl: string;
    accessTokenHint: string;
    followersLabel: string;
    bio: string;
    connected: boolean;
    autoSyncToGallery: boolean;
  }>({
    handle: '',
    profileUrl: '',
    accessTokenHint: '',
    followersLabel: '',
    bio: '',
    connected: true,
    autoSyncToGallery: false,
  });

  // Add / Fetch post (Image or Video) from social media modal
  const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
  const [newPostForm, setNewPostForm] = useState<{
    platform: SocialPlatformId;
    mediaType: 'image' | 'video';
    title: string;
    caption: string;
    image: string;
    permalink: string;
    youtubeId: string;
    duration: string;
    viewsCount: string;
    location: string;
    category: Exclude<PortfolioCategory, 'all'>;
    aspect: 'tall' | 'wide' | 'square';
    addToPortfolioImmediately: boolean;
    addToWeddingFilmsImmediately: boolean;
  }>({
    platform: 'instagram',
    mediaType: 'image',
    title: '',
    caption: '',
    image: '/portfolio/bridal-01-mirror-portrait.jpg',
    permalink: 'https://www.instagram.com/royalstudio089/',
    youtubeId: '',
    duration: '1:15',
    viewsCount: '18.5K',
    location: 'Burewala',
    category: 'bridal',
    aspect: 'tall',
    addToPortfolioImmediately: true,
    addToWeddingFilmsImmediately: false,
  });

  const isVideoPost = (post: SocialMediaPostItem) => {
    return (
      post.mediaType === 'video' ||
      Boolean(post.youtubeId) ||
      Boolean(post.videoUrl) ||
      post.platform === 'youtube' ||
      post.permalink.includes('youtube.com/watch') ||
      post.permalink.includes('youtu.be/')
    );
  };

  const isPostInPortfolio = (post: SocialMediaPostItem) => {
    return (
      post.selectedForPortfolio ||
      portfolioItems.some(
        (p) =>
          (p.socialPermalink && p.socialPermalink === post.permalink) ||
          (p.youtubeId && post.youtubeId && p.youtubeId === post.youtubeId) ||
          (p.image === post.image && p.title === post.title)
      )
    );
  };

  const currentFilmsConfig = websiteCustomization?.films || defaultWebsiteCustomization.films;

  const isPostInWeddingFilms = (post: SocialMediaPostItem) => {
    if (!isVideoPost(post)) return false;
    const ytId = post.youtubeId || extractYoutubeId(post.permalink);
    return (
      Boolean(post.selectedForWeddingFilms) ||
      (currentFilmsConfig.weddingFilms || []).some(
        (f) => extractYoutubeId(f.youtubeId) === ytId
      )
    );
  };

  const isPostActiveShowreel = (post: SocialMediaPostItem) => {
    if (!isVideoPost(post)) return false;
    const ytId = post.youtubeId || extractYoutubeId(post.permalink);
    return extractYoutubeId(currentFilmsConfig.featuredYoutubeId) === ytId;
  };

  const filteredPosts = socialPosts.filter((post) => {
    const account = connectedAccounts.find((a) => a.platform === post.platform);
    if (account && !account.connected) return false;
    if (platformFilter !== 'all' && post.platform !== platformFilter) return false;
    const video = isVideoPost(post);
    if (mediaTypeFilter === 'image' && video) return false;
    if (mediaTypeFilter === 'video' && !video) return false;

    const inGallery = isPostInPortfolio(post);
    const inFilms = isPostInWeddingFilms(post);
    if (statusFilter === 'selected' && !inGallery) return false;
    if (statusFilter === 'unselected' && inGallery) return false;
    if (statusFilter === 'films' && !inFilms) return false;

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

  const buildPortfolioItemFromSocialPost = (post: SocialMediaPostItem, id: number): PortfolioItem => {
    const video = isVideoPost(post);
    const ytId = video ? post.youtubeId || extractYoutubeId(post.permalink) : undefined;
    return {
      id,
      title: post.title,
      category: post.category,
      image:
        post.image ||
        (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '/portfolio/bridal-01-mirror-portrait.jpg'),
      aspect: post.aspect,
      location: post.location || 'Burewala',
      visible: true,
      mediaType: video ? 'video' : 'image',
      videoUrl: post.videoUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : undefined),
      youtubeId: ytId,
      duration: post.duration || (video ? '1:30' : undefined),
      caption: post.caption,
      likesCount: post.likesCount,
      viewsCount: post.viewsCount,
      postedAt: post.postedAt,
      sourcePlatform: post.platform,
      socialPermalink: post.permalink,
      socialHandle: post.accountHandle,
      exif: {
        camera: video ? 'Sony FX3 4K Cinema' : 'Sony A7R V',
        lens: video ? '35mm f/1.4 GM' : '85mm f/1.4 GM',
        aperture: 'f/1.8',
        shutter: video ? '1/100s (24fps)' : '1/250s',
        iso: '200',
      },
    };
  };

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

  // Toggle single social media image OR video into / out of the Public Portfolio Gallery
  const handleToggleSinglePostPortfolio = async (post: SocialMediaPostItem) => {
    const currentlyIn = isPostInPortfolio(post);
    const nextPosts = socialPosts.map((p) =>
      p.id === post.id ? { ...p, selectedForPortfolio: !currentlyIn } : p
    );

    let nextPortfolio = [...portfolioItems];
    if (!currentlyIn) {
      const maxId = Math.max(0, ...nextPortfolio.map((i) => i.id));
      const newItem = buildPortfolioItemFromSocialPost(post, maxId + 1);
      nextPortfolio = [newItem, ...nextPortfolio];
    } else {
      nextPortfolio = nextPortfolio.filter(
        (item) =>
          !(
            (item.socialPermalink && item.socialPermalink === post.permalink) ||
            (item.youtubeId && post.youtubeId && item.youtubeId === post.youtubeId) ||
            (item.image === post.image && item.title === post.title)
          )
      );
    }

    const mediaLabel = isVideoPost(post) ? 'video' : 'photo';
    await onSaveSocialState(
      connectedAccounts,
      nextPosts,
      nextPortfolio,
      !currentlyIn
        ? `Added ${mediaLabel} "${post.title}" (${post.accountHandle}) with social data to Public Portfolio Gallery!`
        : `Removed "${post.title}" from Public Portfolio Gallery.`
    );
  };

  // Toggle linking a video from connected profile / YouTube channel to Wedding Films (/wedding-films)
  const handleTogglePostInWeddingFilms = async (post: SocialMediaPostItem) => {
    const ytId = post.youtubeId || extractYoutubeId(post.permalink);
    const baseCustom = websiteCustomization || defaultWebsiteCustomization;
    const existingFilms = baseCustom.films?.weddingFilms || [];
    const currentlyInFilms = isPostInWeddingFilms(post);

    let nextWeddingFilms = [...existingFilms];
    if (!currentlyInFilms) {
      nextWeddingFilms = [
        {
          id: Date.now(),
          title: post.title,
          youtubeId: ytId,
          location: post.location || 'Burewala',
          duration: post.duration || '2:15',
          description: post.caption,
          channelHandle: post.accountHandle,
          viewsCount: post.viewsCount,
          publishedAt: post.postedAt,
          thumbnailUrl: post.image,
          sourceSocialPostId: post.id,
          youtubeUrl: `https://www.youtube.com/watch?v=${ytId}`,
        },
        ...nextWeddingFilms,
      ];
    } else {
      nextWeddingFilms = nextWeddingFilms.filter(
        (f) => extractYoutubeId(f.youtubeId) !== ytId
      );
    }

    const nextPosts = socialPosts.map((p) =>
      p.id === post.id ? { ...p, selectedForWeddingFilms: !currentlyInFilms } : p
    );

    const nextCustom: WebsiteCustomizationConfig = {
      ...baseCustom,
      films: {
        ...baseCustom.films,
        weddingFilms: nextWeddingFilms,
      },
    };

    await onSaveSocialState(
      connectedAccounts,
      nextPosts,
      portfolioItems,
      !currentlyInFilms
        ? `Linked "${post.title}" from ${post.accountHandle} to Wedding Films (/wedding-films)!`
        : `Removed "${post.title}" from Wedding Films page.`,
      nextCustom
    );
  };

  // Set a connected YouTube / Social video as the Featured Showreel
  const handleSetAsFeaturedShowreel = async (post: SocialMediaPostItem) => {
    const ytId = post.youtubeId || extractYoutubeId(post.permalink);
    const baseCustom = websiteCustomization || defaultWebsiteCustomization;

    const nextPosts = socialPosts.map((p) => ({
      ...p,
      selectedAsShowreel: p.id === post.id,
    }));

    const nextCustom: WebsiteCustomizationConfig = {
      ...baseCustom,
      films: {
        ...baseCustom.films,
        featuredYoutubeId: ytId,
        featuredFilmTitle: post.title,
        featuredDescription: post.caption || baseCustom.films.featuredDescription,
      },
    };

    await onSaveSocialState(
      connectedAccounts,
      nextPosts,
      portfolioItems,
      `Linked "${post.title}" (${ytId}) as the Featured Showreel on the Website!`,
      nextCustom
    );
  };

  // Batch add or remove checked social posts (images & videos) to/from Public Portfolio Gallery
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
            (p.youtubeId && post.youtubeId && p.youtubeId === post.youtubeId) ||
            (p.image === post.image && p.title === post.title)
        );
        if (!alreadyExists) {
          maxId += 1;
          toAdd.push(buildPortfolioItemFromSocialPost(post, maxId));
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
              (item.youtubeId && post.youtubeId && item.youtubeId === post.youtubeId) ||
              (item.image === post.image && item.title === post.title)
          )
      );
    }

    await onSaveSocialState(
      connectedAccounts,
      nextPosts,
      nextPortfolio,
      show
        ? `Published ${checkedIds.length} connected profile item(s) with social data to the Public Portfolio!`
        : `Hidden ${checkedIds.length} social media item(s) from the Public Portfolio.`
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
        (item.youtubeId && target.youtubeId && item.youtubeId === target.youtubeId) ||
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
      `Updated social media item settings for "${updatedPost.title}".`
    );
  };

  // Quick 1-click toggle Connect / Disconnect on any social profile card
  const handleQuickToggleAccountConnection = async (acc: ConnectedSocialAccount) => {
    const nextConnected = !acc.connected;
    const nextAccounts = connectedAccounts.map((a) =>
      a.id === acc.id
        ? {
            ...a,
            connected: nextConnected,
            lastSyncedAt: nextConnected ? new Date().toISOString() : a.lastSyncedAt,
          }
        : a
    );
    await onSaveSocialState(
      nextAccounts,
      socialPosts,
      portfolioItems,
      nextConnected
        ? `${PLATFORM_META[acc.platform].label} (${acc.handle}) connected and active!`
        : `${PLATFORM_META[acc.platform].label} (${acc.handle}) disconnected.`
    );
  };

  const handleOpenEditAccount = (acc: ConnectedSocialAccount) => {
    setEditingAccount(acc);
    setAccountForm({
      handle: acc.handle,
      profileUrl: acc.profileUrl,
      accessTokenHint: acc.accessTokenHint || '',
      followersLabel: acc.followersLabel || '',
      bio: acc.bio || '',
      connected: acc.connected,
      autoSyncToGallery: !!acc.autoSyncToGallery,
    });
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const cleanHandle = accountForm.handle.trim() || editingAccount.handle;
    const nextAccounts = connectedAccounts.map((a) =>
      a.id === editingAccount.id
        ? {
            ...a,
            handle: cleanHandle,
            profileUrl: accountForm.profileUrl.trim() || a.profileUrl,
            accessTokenHint: accountForm.accessTokenHint.trim(),
            followersLabel: accountForm.followersLabel.trim(),
            bio: accountForm.bio.trim(),
            connected: accountForm.connected,
            autoSyncToGallery: accountForm.autoSyncToGallery,
            lastSyncedAt: new Date().toISOString(),
          }
        : a
    );

    const nextPosts = socialPosts.map((p) =>
      p.platform === editingAccount.platform ? { ...p, accountHandle: cleanHandle } : p
    );

    await onSaveSocialState(
      nextAccounts,
      nextPosts,
      portfolioItems,
      `${PLATFORM_META[editingAccount.platform].label} (${cleanHandle}) connection saved & synced!`
    );
    setEditingAccount(null);
  };

  const handleSyncFeedsNow = async () => {
    setIsSyncing(true);
    try {
      const syncedCms = await apiRequest<any>('/cms/social/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      }).catch(() => null);

      if (syncedCms && Array.isArray(syncedCms.connectedSocialAccounts)) {
        await onSaveSocialState(
          syncedCms.connectedSocialAccounts,
          syncedCms.socialMediaPosts || socialPosts,
          syncedCms.portfolioItems || portfolioItems,
          'Synced latest images & videos from all connected social media profiles!'
        );
      } else {
        const nowIso = new Date().toISOString();
        const nextAccounts = connectedAccounts.map((a) =>
          a.connected ? { ...a, lastSyncedAt: nowIso } : a
        );
        await onSaveSocialState(
          nextAccounts,
          socialPosts,
          portfolioItems,
          'Synced latest images & videos from all connected social media profiles!'
        );
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResolveUrlMetadata = async () => {
    const rawUrl = newPostForm.permalink.trim() || newPostForm.youtubeId.trim();
    if (!rawUrl) return;
    setIsResolvingUrl(true);
    try {
      const resolved = await apiRequest<{
        youtubeId: string;
        title: string;
        authorName: string;
        thumbnailUrl: string;
        permalink: string;
        duration: string;
      }>('/cms/youtube/resolve', {
        method: 'POST',
        body: JSON.stringify({
          urlOrId: rawUrl,
          fallbackTitle: newPostForm.title || undefined,
        }),
      });
      if (resolved && resolved.youtubeId) {
        setNewPostForm((prev) => ({
          ...prev,
          mediaType: 'video',
          youtubeId: resolved.youtubeId,
          title: prev.title || resolved.title,
          image: resolved.thumbnailUrl || prev.image,
          permalink: resolved.permalink || prev.permalink,
          duration: resolved.duration || prev.duration,
          aspect: 'wide',
        }));
      }
    } catch {
      const extracted = extractYoutubeId(rawUrl);
      if (extracted) {
        setNewPostForm((prev) => ({
          ...prev,
          mediaType: 'video',
          youtubeId: extracted,
          image: `https://i.ytimg.com/vi/${extracted}/hqdefault.jpg`,
          aspect: 'wide',
        }));
      }
    } finally {
      setIsResolvingUrl(false);
    }
  };

  const handleAddSocialPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostForm.title.trim()) return;

    const acc = connectedAccounts.find((a) => a.platform === newPostForm.platform);
    const isVideo =
      newPostForm.mediaType === 'video' ||
      newPostForm.platform === 'youtube' ||
      Boolean(newPostForm.youtubeId.trim());
    const cleanYtId = isVideo
      ? extractYoutubeId(newPostForm.youtubeId.trim() || newPostForm.permalink.trim())
      : undefined;

    const resolvedThumb =
      newPostForm.image.trim() ||
      (cleanYtId
        ? `https://i.ytimg.com/vi/${cleanYtId}/hqdefault.jpg`
        : '/portfolio/bridal-01-mirror-portrait.jpg');

    const newPost: SocialMediaPostItem = {
      id: `${newPostForm.platform}-post-${Date.now().toString().slice(-5)}`,
      platform: newPostForm.platform,
      accountHandle: acc?.handle || `@royalstudio089`,
      title: newPostForm.title.trim(),
      caption: newPostForm.caption.trim() || newPostForm.title.trim(),
      image: resolvedThumb,
      permalink:
        newPostForm.permalink.trim() ||
        (cleanYtId ? `https://www.youtube.com/watch?v=${cleanYtId}` : 'https://www.instagram.com/royalstudio089/'),
      postedAt: new Date().toISOString().split('T')[0],
      location: newPostForm.location.trim() || 'Burewala',
      likesCount: 1450,
      commentsCount: 64,
      viewsCount: newPostForm.viewsCount.trim() || '24.0K',
      mediaType: isVideo ? 'video' : 'image',
      youtubeId: cleanYtId,
      videoUrl: cleanYtId ? `https://www.youtube.com/watch?v=${cleanYtId}` : undefined,
      duration: isVideo ? newPostForm.duration.trim() || '2:10' : undefined,
      category: newPostForm.category,
      aspect: newPostForm.aspect,
      selectedForPortfolio: newPostForm.addToPortfolioImmediately,
      selectedForWeddingFilms: isVideo && newPostForm.addToWeddingFilmsImmediately,
    };

    const nextPosts = [newPost, ...socialPosts];
    let nextPortfolio = [...portfolioItems];

    if (newPostForm.addToPortfolioImmediately) {
      const maxId = Math.max(0, ...nextPortfolio.map((i) => i.id));
      nextPortfolio = [buildPortfolioItemFromSocialPost(newPost, maxId + 1), ...nextPortfolio];
    }

    let nextCustom = websiteCustomization;
    if (isVideo && newPostForm.addToWeddingFilmsImmediately && cleanYtId) {
      const baseCustom = websiteCustomization || defaultWebsiteCustomization;
      nextCustom = {
        ...baseCustom,
        films: {
          ...baseCustom.films,
          weddingFilms: [
            {
              id: Date.now(),
              title: newPost.title,
              youtubeId: cleanYtId,
              location: newPost.location || 'Burewala',
              duration: newPost.duration || '2:10',
              description: newPost.caption,
              channelHandle: newPost.accountHandle,
              youtubeUrl: `https://www.youtube.com/watch?v=${cleanYtId}`,
            },
            ...(baseCustom.films.weddingFilms || []),
          ],
        },
      };
    }

    await onSaveSocialState(
      connectedAccounts,
      nextPosts,
      nextPortfolio,
      `Imported ${isVideo ? 'video' : 'photo'} "${newPost.title}" from ${PLATFORM_META[newPost.platform].label}!`,
      nextCustom
    );
    setIsAddPostModalOpen(false);
    setNewPostForm({
      platform: 'instagram',
      mediaType: 'image',
      title: '',
      caption: '',
      image: '/portfolio/bridal-01-mirror-portrait.jpg',
      permalink: 'https://www.instagram.com/royalstudio089/',
      youtubeId: '',
      duration: '1:15',
      viewsCount: '18.5K',
      location: 'Burewala',
      category: 'bridal',
      aspect: 'tall',
      addToPortfolioImmediately: true,
      addToWeddingFilmsImmediately: false,
    });
  };

  const renderPlatformIcon = (platform: SocialPlatformId, className = 'w-4 h-4') => {
    if (platform === 'instagram') return <Instagram className={className} />;
    if (platform === 'facebook') return <Facebook className={className} />;
    if (platform === 'youtube') return <Youtube className={className} />;
    return <Share2 className={className} />;
  };

  const totalSelectedCount = socialPosts.filter((p) => isPostInPortfolio(p)).length;
  const totalPhotosCount = socialPosts.filter((p) => !isVideoPost(p)).length;
  const totalVideosCount = socialPosts.filter((p) => isVideoPost(p)).length;
  const totalWeddingFilmsLinkedCount = socialPosts.filter((p) => isPostInWeddingFilms(p)).length;

  return (
    <div className="space-y-6">
      {/* Connected Social Accounts Strip */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 mb-1">
              <Share2 className="w-3.5 h-3.5" />
              <span>Connected Social Media Profiles — Images, Reels &amp; YouTube Videos</span>
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Select Images &amp; Videos from Connected Profiles to Show on Portfolio &amp; Wedding Films
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Connect your Instagram, Facebook Page, TikTok, and YouTube Channel profiles. Select any photos or videos below to publish them with full social profile data (handle, caption, likes, views &amp; playable video) directly onto <strong>/portfolio</strong> and <strong>/wedding-films</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSyncFeedsNow()}
              disabled={isSyncing || isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Profiles...' : 'Sync Connected Profiles'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddPostModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import Photo / Video from Profile</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {connectedAccounts.map((acc) => {
            const meta = PLATFORM_META[acc.platform];
            const platformPosts = socialPosts.filter((p) => p.platform === acc.platform);
            const platformPhotos = platformPosts.filter((p) => !isVideoPost(p)).length;
            const platformVideos = platformPosts.filter((p) => isVideoPost(p)).length;
            const shownCount = platformPosts.filter((p) => isPostInPortfolio(p)).length;

            return (
              <div
                key={acc.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  acc.connected
                    ? 'bg-slate-50/80 border-slate-200 shadow-2xs'
                    : 'bg-gray-50/40 border-dashed border-gray-300 opacity-75'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${meta.bgBadge}`}
                    >
                      {renderPlatformIcon(acc.platform, 'w-3.5 h-3.5')}
                      <span>{meta.label}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickToggleAccountConnection(acc)}
                      disabled={isSaving}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                        acc.connected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                          : 'bg-gray-200 text-gray-700 hover:bg-amber-500 hover:text-slate-950'
                      }`}
                      title="Click to toggle connection status"
                    >
                      {acc.connected ? '● Connected' : 'Connect Profile'}
                    </button>
                  </div>

                  <div>
                    <div className="font-bold text-xs text-gray-900 truncate">{acc.handle}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {acc.followersLabel || 'Official Studio Profile'}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                    {platformPhotos > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-slate-700">
                        {platformPhotos} Photo{platformPhotos === 1 ? '' : 's'}
                      </span>
                    )}
                    {platformVideos > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-red-700">
                        {platformVideos} Video{platformVideos === 1 ? '' : 's'}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800">
                      {shownCount}/{platformPosts.length} on Portfolio
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/70 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditAccount(acc)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-amber-700 cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Profile Settings</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPlatformFilter(platformFilter === acc.platform ? 'all' : acc.platform)
                      }
                      className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                    >
                      {platformFilter === acc.platform ? 'Show All' : 'Filter Feed'}
                    </button>
                    <a
                      href={acc.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[11px] text-gray-500 hover:text-slate-900"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Multi-Select Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Platform Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All Profiles (${socialPosts.length})` },
              { id: 'instagram', label: 'Instagram' },
              { id: 'facebook', label: 'Facebook' },
              { id: 'tiktok', label: 'TikTok' },
              { id: 'youtube', label: 'YouTube Channel' },
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

            {/* Media Type Filter (All / Images / Videos) */}
            {[
              { id: 'all', label: 'All Media', icon: Sparkles },
              { id: 'image', label: `Images (${totalPhotosCount})`, icon: ImageIcon },
              { id: 'video', label: `Videos & Films (${totalVideosCount})`, icon: Video },
            ].map((mt) => {
              const Icon = mt.icon;
              return (
                <button
                  key={mt.id}
                  type="button"
                  onClick={() => setMediaTypeFilter(mt.id as any)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    mediaTypeFilter === mt.id
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{mt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Status & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'selected', label: `In Portfolio (${totalSelectedCount})` },
              { id: 'films', label: `In Wedding Films (${totalWeddingFilmsLinkedCount})` },
              { id: 'unselected', label: 'Not Selected' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-emerald-500/15 text-emerald-900 border border-emerald-500/40 font-bold'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {st.label}
              </button>
            ))}

            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search caption, video, city..."
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs w-full sm:w-48"
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
                  ? `${checkedIds.length} social item(s) selected`
                  : 'Select Multiple Images & Videos'}
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
                <span>Show Selected in Portfolio ({checkedIds.length})</span>
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

      {/* Social Media Images & Videos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPosts.map((post) => {
          const inPortfolio = isPostInPortfolio(post);
          const inWeddingFilms = isPostInWeddingFilms(post);
          const isShowreel = isPostActiveShowreel(post);
          const isChecked = checkedIds.includes(post.id);
          const meta = PLATFORM_META[post.platform];
          const video = isVideoPost(post);
          const ytId = video ? post.youtubeId || extractYoutubeId(post.permalink) : '';
          const isPlaying = playingPostId === post.id && Boolean(ytId);

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
                {/* Media Preview Header (Image or Playable Video) */}
                <div className="relative h-56 bg-slate-950 overflow-hidden group">
                  {isPlaying ? (
                    <div className="relative w-full h-full">
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                        title={post.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                      <button
                        type="button"
                        onClick={() => setPlayingPostId(null)}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-slate-950/85 text-white hover:bg-rose-600 cursor-pointer z-10"
                        title="Close video preview"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <img
                        src={
                          post.image ||
                          (ytId
                            ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
                            : '/portfolio/bridal-01-mirror-portrait.jpg')
                        }
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Play Button Overlay for Video Items */}
                      {video && (
                        <button
                          type="button"
                          onClick={() => setPlayingPostId(post.id)}
                          className="absolute inset-0 flex items-center justify-center bg-slate-950/30 group-hover:bg-slate-950/45 transition-colors cursor-pointer"
                          title="Click to preview video"
                        >
                          <span className="w-12 h-12 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </span>
                        </button>
                      )}

                      {/* Top-left Checkbox & Platform Badge */}
                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
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
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            video
                              ? 'bg-red-600/90 text-white'
                              : 'bg-slate-900/85 text-amber-300'
                          }`}
                        >
                          {video ? (
                            <>
                              <Video className="w-2.5 h-2.5" />
                              <span>{post.duration ? `VIDEO · ${post.duration}` : 'VIDEO'}</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-2.5 h-2.5" />
                              <span>PHOTO</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Top-right Status Badges */}
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-10">
                        {inPortfolio ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-sm">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Live in Portfolio</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/75 text-gray-200 text-[10px] font-semibold backdrop-blur-xs">
                            Not in Portfolio
                          </span>
                        )}
                        {inWeddingFilms && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold shadow-xs">
                            <Film className="w-2.5 h-2.5" />
                            <span>On Wedding Films</span>
                          </span>
                        )}
                        {isShowreel && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-xs">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Active Showreel</span>
                          </span>
                        )}
                      </div>

                      {/* Bottom gradient metadata */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-3 flex items-center justify-between text-[11px] text-white">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          {post.location || 'Burewala'}
                        </span>
                        <span className="inline-flex items-center gap-2 text-amber-300 font-semibold">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {(post.likesCount || 0).toLocaleString()}
                          </span>
                          {post.viewsCount && <span>· {post.viewsCount} views</span>}
                          <span>· {post.postedAt}</span>
                        </span>
                      </div>
                    </>
                  )}
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
                        Portfolio Category
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
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between gap-2">
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
                        <span>Shown in Portfolio (Hide)</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          Select {video ? 'Video' : 'Image'} for Portfolio
                        </span>
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

                {/* Extra Video / YouTube Actions: Link to Wedding Films or Set as Showreel */}
                {video && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-gray-200/70">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleTogglePostInWeddingFilms(post)}
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        inWeddingFilms
                          ? 'bg-amber-500/20 text-amber-950 border border-amber-400'
                          : 'bg-white hover:bg-amber-50 text-slate-700 border border-gray-200'
                      }`}
                    >
                      <Film className="w-3 h-3" />
                      <span>{inWeddingFilms ? 'In Wedding Films ✓' : '+ Wedding Films'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || isShowreel}
                      onClick={() => handleSetAsFeaturedShowreel(post)}
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        isShowreel
                          ? 'bg-red-600 text-white'
                          : 'bg-white hover:bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      <Video className="w-3 h-3" />
                      <span>{isShowreel ? 'Active Showreel ✓' : 'Set as Showreel'}</span>
                    </button>
                  </div>
                )}
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
              <div className="text-xs font-bold text-slate-900">Profile Connection Status</div>
              <div className="text-[11px] text-gray-500">
                Enable to select images and videos from this connected profile for your portfolio and wedding films.
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
                Account Handle / Channel Name *
              </label>
              <input
                type="text"
                required
                value={accountForm.handle}
                onChange={(e) => setAccountForm((f) => ({ ...f, handle: e.target.value }))}
                placeholder="@royalstudio089"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Followers / Subscribers Badge
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
            <label className="block text-xs font-bold text-gray-700 mb-1">Profile / Channel URL *</label>
            <input
              type="url"
              required
              value={accountForm.profileUrl}
              onChange={(e) => setAccountForm((f) => ({ ...f, profileUrl: e.target.value }))}
              placeholder="https://www.instagram.com/royalstudio089"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Profile Bio / Description</label>
            <input
              type="text"
              value={accountForm.bio}
              onChange={(e) => setAccountForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Luxury Wedding Photography & Cinematic Films..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <label className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-900 cursor-pointer">
            <input
              type="checkbox"
              checked={accountForm.autoSyncToGallery}
              onChange={(e) =>
                setAccountForm((f) => ({ ...f, autoSyncToGallery: e.target.checked }))
              }
              className="w-4 h-4 rounded"
            />
            <span>Automatically publish all synced images &amp; videos from this profile to Portfolio</span>
          </label>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Graph API / YouTube Data API Token (Optional)
            </label>
            <input
              type="text"
              value={accountForm.accessTokenHint}
              onChange={(e) => setAccountForm((f) => ({ ...f, accessTokenHint: e.target.value }))}
              placeholder="Paste Instagram Graph, Meta Page, or YouTube API key..."
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
              Save Profile Connection
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Import Photo or Video from Connected Social Profile */}
      <Modal
        isOpen={isAddPostModalOpen}
        onClose={() => setIsAddPostModalOpen(false)}
        title="Import Image or Video from Connected Social Profile"
      >
        <form onSubmit={handleAddSocialPost} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Connected Social Platform *
              </label>
              <select
                value={newPostForm.platform}
                onChange={(e) => {
                  const nextPlat = e.target.value as SocialPlatformId;
                  setNewPostForm((f) => ({
                    ...f,
                    platform: nextPlat,
                    mediaType: nextPlat === 'youtube' || nextPlat === 'tiktok' ? 'video' : f.mediaType,
                  }));
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
              >
                <option value="instagram">Instagram (@royalstudio089)</option>
                <option value="facebook">Facebook Page (RoyalStudio089)</option>
                <option value="tiktok">TikTok (@royalstudio089)</option>
                <option value="youtube">YouTube Channel (@royalstudio089)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Media Type (Image or Video) *
              </label>
              <select
                value={newPostForm.mediaType}
                onChange={(e) =>
                  setNewPostForm((f) => ({
                    ...f,
                    mediaType: e.target.value as 'image' | 'video',
                    aspect: e.target.value === 'video' ? 'wide' : f.aspect,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
              >
                <option value="image">Image / Photograph</option>
                <option value="video">Video / Reel / YouTube Film</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Social Post or YouTube Video URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPostForm.permalink}
                onChange={(e) => setNewPostForm((f) => ({ ...f, permalink: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=... or https://www.instagram.com/p/..."
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
              <button
                type="button"
                disabled={isResolvingUrl}
                onClick={handleResolveUrlMetadata}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer shrink-0"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{isResolvingUrl ? 'Fetching...' : 'Auto-Fetch Link'}</span>
              </button>
            </div>
          </div>

          {newPostForm.mediaType === 'video' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-red-50/60 border border-red-200 rounded-xl">
              <div>
                <label className="block text-[11px] font-bold text-red-900 mb-1">
                  YouTube Video ID / Link
                </label>
                <input
                  type="text"
                  value={newPostForm.youtubeId}
                  onChange={(e) =>
                    setNewPostForm((f) => ({ ...f, youtubeId: extractYoutubeId(e.target.value) }))
                  }
                  placeholder="QF3BmojTrKQ"
                  className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-red-900 mb-1">
                  Video Duration
                </label>
                <input
                  type="text"
                  value={newPostForm.duration}
                  onChange={(e) => setNewPostForm((f) => ({ ...f, duration: e.target.value }))}
                  placeholder="2:26"
                  className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-red-900 mb-1">
                  Views Count
                </label>
                <input
                  type="text"
                  value={newPostForm.viewsCount}
                  onChange={(e) => setNewPostForm((f) => ({ ...f, viewsCount: e.target.value }))}
                  placeholder="38.5K"
                  className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Portfolio Display Title *
            </label>
            <input
              type="text"
              required
              value={newPostForm.title}
              onChange={(e) => setNewPostForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Royal Barat Portrait or 4K Highlight Film"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Thumbnail / Photo URL or Upload Image *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newPostForm.image}
                onChange={(e) => setNewPostForm((f) => ({ ...f, image: e.target.value }))}
                placeholder="/portfolio/... or https://i.ytimg.com/vi/..."
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
              placeholder="Original Instagram / YouTube / TikTok caption & hashtags..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={newPostForm.addToPortfolioImmediately}
                onChange={(e) =>
                  setNewPostForm((f) => ({ ...f, addToPortfolioImmediately: e.target.checked }))
                }
              />
              <span>Immediately show this item &amp; its social data on the Public Portfolio (/portfolio)</span>
            </label>

            {newPostForm.mediaType === 'video' && (
              <label className="flex items-center gap-2 text-xs font-bold text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPostForm.addToWeddingFilmsImmediately}
                  onChange={(e) =>
                    setNewPostForm((f) => ({
                      ...f,
                      addToWeddingFilmsImmediately: e.target.checked,
                    }))
                  }
                />
                <span>Also link &amp; show this video on the Wedding Films page (/wedding-films)</span>
              </label>
            )}
          </div>

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
              Import {newPostForm.mediaType === 'video' ? 'Social Video' : 'Social Photo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
