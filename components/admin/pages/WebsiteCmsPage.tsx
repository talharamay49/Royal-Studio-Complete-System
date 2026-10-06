import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Package as PackageIcon,
  Layers,
  MessageSquareQuote,
  BookOpen,
  Inbox,
  Upload,
  CheckCircle2,
  Camera,
  MapPin,
  Database,
  Download,
  Share2,
  Sliders,
  GripVertical,
  ChevronsUp,
  LayoutGrid,
  Star,
  Video,
  Play,
  Youtube,
  Bot,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useStudioData } from '../context/StudioDataContext';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { CompleteWebsiteCustomizer } from '../components/cms/CompleteWebsiteCustomizer';
import { SocialMediaPortfolioSelector } from '../components/cms/SocialMediaPortfolioSelector';
import { ChatbotManagerPage } from './ChatbotManagerPage';
import type {
  PortfolioItem,
  PortfolioCategory,
  PricingPackage,
  Service,
  Testimonial,
  BlogPost,
  WebsiteCustomizationConfig,
  ConnectedSocialAccount,
  SocialMediaPostItem,
} from '@/types';
import {
  portfolioCategories,
  defaultWebsiteCustomization,
  defaultConnectedSocialAccounts,
  defaultSocialMediaPosts,
  extractYoutubeId,
} from '@/lib/data';

interface WebsiteLead {
  id: string;
  brideName: string;
  groomName: string;
  phone: string;
  email: string;
  weddingDate: string;
  venue: string;
  city: string;
  services: string;
  budget?: string;
  message?: string;
  status: 'New' | 'Contacted' | 'Booked' | 'Archived';
  submittedAt: string;
  linkedEventId?: string;
}

interface WebsiteCMSState {
  portfolioItems: PortfolioItem[];
  pricingPackages: PricingPackage[];
  detailedServices: Service[];
  testimonials: Testimonial[];
  blogPosts: BlogPost[];
  websiteLeads: WebsiteLead[];
  websiteCustomization?: WebsiteCustomizationConfig;
  connectedSocialAccounts?: ConnectedSocialAccount[];
  socialMediaPosts?: SocialMediaPostItem[];
}

type CmsTab =
  | 'WEBSITE_CUSTOMIZER'
  | 'CHATBOT_MANAGER'
  | 'PORTFOLIO'
  | 'SOCIAL_PORTFOLIO'
  | 'PACKAGES'
  | 'SERVICES'
  | 'TESTIMONIALS'
  | 'BLOG'
  | 'LEADS'
  | 'DATABASE';

interface WebsiteCmsPageProps {
  navigate: (path: string) => void;
}

const PORTFOLIO_CATEGORIES_LIST: Exclude<PortfolioCategory, 'all'>[] = [
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

export const WebsiteCmsPage: React.FC<WebsiteCmsPageProps> = ({ navigate }) => {
  const { addToast, refreshAll, profile, updateProfile } = useStudioData();
  const [activeTab, setActiveTab] = useState<CmsTab>('PORTFOLIO');
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  const handleToggleCustomerBreakdownVisibility = async () => {
    setIsUpdatingVisibility(true);
    try {
      const nextVal = !Boolean(profile?.showPublicPriceBreakdown);
      await updateProfile(
        { showPublicPriceBreakdown: nextVal },
        'Customer Price Breakdown Visibility'
      );
      addToast(
        nextVal
          ? 'Detailed Event Price Breakdown is now VISIBLE on the Customer Inquiry Form.'
          : 'Detailed Event Price Breakdown is now HIDDEN on the Customer Inquiry Form (Default).',
        'success'
      );
    } finally {
      setIsUpdatingVisibility(false);
    }
  };
  const [dbStats, setDbStats] = useState<{
    driverName: string;
    storagePath: string;
    fileSizeBytes: number;
    lastModified: string | null;
    counts?: {
      clients: number;
      events: number;
      invoices: number;
      quotations: number;
      payments: number;
      portfolioItems: number;
    };
  } | null>(null);
  const [cmsData, setCmsData] = useState<WebsiteCMSState>({
    portfolioItems: [],
    pricingPackages: [],
    detailedServices: [],
    testimonials: [],
    blogPosts: [],
    websiteLeads: [],
    websiteCustomization: defaultWebsiteCustomization,
    connectedSocialAccounts: defaultConnectedSocialAccounts,
    socialMediaPosts: defaultSocialMediaPosts,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Portfolio Filter, Drag-and-Drop & Modal State
  const [categoryFilter, setCategoryFilter] = useState<PortfolioCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [portfolioViewMode, setPortfolioViewMode] = useState<'DETAILED' | 'STORYBOARD'>('DETAILED');
  const [draggedPortfolioId, setDraggedPortfolioId] = useState<number | null>(null);
  const [dragOverPortfolioId, setDragOverPortfolioId] = useState<number | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<PortfolioCategory | null>(null);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<PortfolioItem | null>(null);
  const [portfolioForm, setPortfolioForm] = useState<{
    title: string;
    category: Exclude<PortfolioCategory, 'all'>;
    mediaType: 'image' | 'video';
    image: string;
    videoUrl: string;
    duration: string;
    aspect: 'tall' | 'wide' | 'square';
    location: string;
    camera: string;
    lens: string;
    aperture: string;
    shutter: string;
    iso: string;
  }>({
    title: '',
    category: 'bridal',
    mediaType: 'image',
    image: '/portfolio/bridal-01-crimson-lehenga.jpg',
    videoUrl: '',
    duration: '',
    aspect: 'tall',
    location: 'Burewala',
    camera: 'Sony A7R V',
    lens: '85mm f/1.4 GM',
    aperture: 'f/1.8',
    shutter: '1/250s',
    iso: '200',
  });

  // Pricing Package Modal State
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackageIndex, setEditingPackageIndex] = useState<number | null>(null);
  const [packageForm, setPackageForm] = useState<{
    id: string;
    name: string;
    price: string;
    priceNote: string;
    description: string;
    featuresText: string;
    highlighted: boolean;
  }>({
    id: '',
    name: '',
    price: 'PKR 125,000',
    priceNote: '2-Day Coverage',
    description: '',
    featuresText: '',
    highlighted: false,
  });

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const [serviceForm, setServiceForm] = useState<{
    id: string;
    title: string;
    shortDescription: string;
    description: string;
    deliverablesText: string;
    processText: string;
    equipmentText: string;
    icon: string;
  }>({
    id: '',
    title: '',
    shortDescription: '',
    description: '',
    deliverablesText: '',
    processText: '',
    equipmentText: '',
    icon: 'camera',
  });

  // Testimonial Modal State
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [editingTestimonialIndex, setEditingTestimonialIndex] = useState<number | null>(null);
  const [testimonialForm, setTestimonialForm] = useState<Testimonial>({
    quote: '',
    author: '',
    event: 'Barat & Walima',
    location: 'Burewala',
  });

  // Blog Post Modal State
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlogIndex, setEditingBlogIndex] = useState<number | null>(null);
  const [blogForm, setBlogForm] = useState<BlogPost>({
    slug: '',
    title: '',
    excerpt: '',
    image: '/portfolio/walima-03-venue-aerial.jpg',
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    dateISO: new Date().toISOString().split('T')[0],
    category: 'Wedding Guides',
    content: '',
  });

  const loadCmsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, info] = await Promise.all([
        apiRequest<WebsiteCMSState>('/cms'),
        apiRequest<any>('/db/info').catch(() => null),
      ]);
      setCmsData({
        portfolioItems: data.portfolioItems || [],
        pricingPackages: data.pricingPackages || [],
        detailedServices: data.detailedServices || [],
        testimonials: data.testimonials || [],
        blogPosts: data.blogPosts || [],
        websiteLeads: data.websiteLeads || [],
        websiteCustomization: data.websiteCustomization || defaultWebsiteCustomization,
        connectedSocialAccounts:
          data.connectedSocialAccounts && data.connectedSocialAccounts.length > 0
            ? data.connectedSocialAccounts
            : defaultConnectedSocialAccounts,
        socialMediaPosts:
          data.socialMediaPosts && data.socialMediaPosts.length > 0
            ? data.socialMediaPosts
            : defaultSocialMediaPosts,
      });
      if (info) setDbStats(info);
    } catch (err: any) {
      addToast(err.message || 'Failed to load Website CMS data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCmsData();
  }, [loadCmsData]);

  const persistCmsUpdate = async (updated: Partial<WebsiteCMSState>, successMsg: string) => {
    setIsSaving(true);
    try {
      const nextState = { ...cmsData, ...updated };
      const saved = await apiRequest<WebsiteCMSState>('/cms', {
        method: 'PUT',
        body: JSON.stringify(nextState),
      });
      setCmsData(saved);
      addToast(successMsg, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save Website CMS changes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsSaving(true);
    try {
      const saved = await apiRequest<WebsiteCMSState>('/cms/reset', {
        method: 'POST',
      });
      setCmsData(saved);
      setIsResetConfirmOpen(false);
      addToast('Public website & portfolio content restored to Royal Studio defaults.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to reset CMS', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (optimizedUrl: string, detectedAspect?: 'tall' | 'wide' | 'square') => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      addToast('Image file is larger than 15MB. Please choose a smaller image.', 'warning');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', portfolioForm.title || file.name.replace(/\.[^.]+$/, ''));
      formData.append('category', portfolioForm.category || 'portfolio');
      formData.append('format', 'webp');

      const response = await fetch('/api/images/optimize', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json().catch(() => null);

      if (response.ok && result?.success && result?.url) {
        onLoaded(result.url, result.aspect);
        const kb = Math.max(1, Math.round((result.optimizedBytes || 0) / 1024));
        addToast(
          `Optimized to AVIF/WebP (${kb} KB · Saved ${result.savingsPercent ?? 0}% for PageSpeed)!`,
          'success'
        );
        return;
      }
    } catch {
      // Fallback to FileReader below if offline
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLoaded(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // ================= PORTFOLIO HANDLERS =================
  const filteredPortfolio = cmsData.portfolioItems.filter((item) => {
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenAddPortfolio = () => {
    setEditingPortfolioItem(null);
    setPortfolioForm({
      title: '',
      category: categoryFilter !== 'all' ? categoryFilter : 'bridal',
      mediaType: 'image',
      image: '/portfolio/bridal-01-crimson-lehenga.jpg',
      videoUrl: '',
      duration: '',
      aspect: 'tall',
      location: 'Burewala',
      camera: 'Sony A7R V',
      lens: '85mm f/1.4 GM',
      aperture: 'f/1.8',
      shutter: '1/250s',
      iso: '200',
    });
    setIsPortfolioModalOpen(true);
  };

  const handleOpenEditPortfolio = (item: PortfolioItem) => {
    setEditingPortfolioItem(item);
    setPortfolioForm({
      title: item.title,
      category: item.category,
      mediaType: item.mediaType || 'image',
      image: item.image,
      videoUrl: item.videoUrl || '',
      duration: item.duration || '',
      aspect: item.aspect,
      location: item.location || 'Burewala',
      camera: item.exif?.camera || 'Sony A7R V',
      lens: item.exif?.lens || '85mm f/1.4 GM',
      aperture: item.exif?.aperture || 'f/1.8',
      shutter: item.exif?.shutter || '1/250s',
      iso: item.exif?.iso || '200',
    });
    setIsPortfolioModalOpen(true);
  };

  const handleSavePortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioForm.title.trim() || !portfolioForm.image.trim()) {
      addToast('Title and cover image are required for portfolio items.', 'error');
      return;
    }

    const ytId =
      portfolioForm.mediaType === 'video' && portfolioForm.videoUrl
        ? extractYoutubeId(portfolioForm.videoUrl)
        : undefined;

    const newItem: PortfolioItem = {
      ...(editingPortfolioItem || {}),
      id: editingPortfolioItem
        ? editingPortfolioItem.id
        : Math.max(0, ...cmsData.portfolioItems.map((i) => i.id)) + 1,
      title: portfolioForm.title.trim(),
      category: portfolioForm.category,
      mediaType: portfolioForm.mediaType,
      image: portfolioForm.image.trim(),
      videoUrl:
        portfolioForm.mediaType === 'video'
          ? portfolioForm.videoUrl.trim() || (ytId ? `https://www.youtube.com/embed/${ytId}` : undefined)
          : undefined,
      duration: portfolioForm.mediaType === 'video' ? portfolioForm.duration.trim() || undefined : undefined,
      aspect: portfolioForm.aspect,
      location: portfolioForm.location.trim() || 'Burewala',
      exif: {
        camera: portfolioForm.camera.trim(),
        lens: portfolioForm.lens.trim(),
        aperture: portfolioForm.aperture.trim(),
        shutter: portfolioForm.shutter.trim(),
        iso: portfolioForm.iso.trim(),
      },
    };

    const nextList = editingPortfolioItem
      ? cmsData.portfolioItems.map((i) => (i.id === editingPortfolioItem.id ? newItem : i))
      : [newItem, ...cmsData.portfolioItems];

    await persistCmsUpdate(
      { portfolioItems: nextList },
      editingPortfolioItem ? 'Portfolio item updated on public website!' : 'New photo added to public portfolio!'
    );
    setIsPortfolioModalOpen(false);
  };

  const handleDeletePortfolioItem = async (id: number) => {
    const nextList = cmsData.portfolioItems.filter((i) => i.id !== id);
    await persistCmsUpdate({ portfolioItems: nextList }, 'Portfolio photo removed.');
  };

  const handleMovePortfolioItem = async (id: number, direction: 'up' | 'down') => {
    const idx = cmsData.portfolioItems.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= cmsData.portfolioItems.length) return;
    const nextList = [...cmsData.portfolioItems];
    const [moved] = nextList.splice(idx, 1);
    nextList.splice(targetIdx, 0, moved);
    setCmsData((prev) => ({ ...prev, portfolioItems: nextList }));
    await persistCmsUpdate({ portfolioItems: nextList }, 'Portfolio display order updated.');
  };

  const handlePinPortfolioItemToTop = async (id: number) => {
    const idx = cmsData.portfolioItems.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    const nextList = [...cmsData.portfolioItems];
    const [moved] = nextList.splice(idx, 1);
    nextList.unshift(moved);
    setCmsData((prev) => ({ ...prev, portfolioItems: nextList }));
    await persistCmsUpdate(
      { portfolioItems: nextList },
      `"${moved.title}" prioritized to #1 Featured position!`
    );
  };

  const handleQuickOrganizePortfolioItem = async (
    id: number,
    patch: Partial<Pick<PortfolioItem, 'category' | 'aspect'>>
  ) => {
    const target = cmsData.portfolioItems.find((i) => i.id === id);
    if (!target) return;
    const nextList = cmsData.portfolioItems.map((i) =>
      i.id === id ? { ...i, ...patch } : i
    );
    setCmsData((prev) => ({ ...prev, portfolioItems: nextList }));
    await persistCmsUpdate(
      { portfolioItems: nextList },
      `Updated "${target.title}" (${patch.category ? `Category: ${patch.category}` : `Aspect: ${patch.aspect}`}).`
    );
  };

  const handlePortfolioDragStart = (e: React.DragEvent<HTMLDivElement>, id: number) => {
    setDraggedPortfolioId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const handlePortfolioDragOverCard = (e: React.DragEvent<HTMLDivElement>, targetId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedPortfolioId !== null && draggedPortfolioId !== targetId) {
      if (dragOverPortfolioId !== targetId) {
        setDragOverPortfolioId(targetId);
      }
    }
  };

  const handlePortfolioDropOnCard = async (
    e: React.DragEvent<HTMLDivElement>,
    targetId: number
  ) => {
    e.preventDefault();
    const sourceId =
      draggedPortfolioId ?? Number(e.dataTransfer.getData('text/plain'));
    setDraggedPortfolioId(null);
    setDragOverPortfolioId(null);
    setDragOverCategory(null);

    if (!sourceId || sourceId === targetId) return;

    const fromIdx = cmsData.portfolioItems.findIndex((i) => i.id === sourceId);
    const toIdx = cmsData.portfolioItems.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

    const nextList = [...cmsData.portfolioItems];
    const [moved] = nextList.splice(fromIdx, 1);
    nextList.splice(toIdx, 0, moved);

    // Real-time optimistic update + persistence
    setCmsData((prev) => ({ ...prev, portfolioItems: nextList }));
    await persistCmsUpdate(
      { portfolioItems: nextList },
      `Reordered "${moved.title}" to Priority #${toIdx + 1}!`
    );
  };

  const handlePortfolioDropOnCategory = async (
    e: React.DragEvent<HTMLButtonElement>,
    targetCat: PortfolioCategory
  ) => {
    e.preventDefault();
    const sourceId =
      draggedPortfolioId ?? Number(e.dataTransfer.getData('text/plain'));
    setDraggedPortfolioId(null);
    setDragOverPortfolioId(null);
    setDragOverCategory(null);

    if (!sourceId || targetCat === 'all') return;
    const item = cmsData.portfolioItems.find((i) => i.id === sourceId);
    if (!item || item.category === targetCat) return;

    const nextList = cmsData.portfolioItems.map((i) =>
      i.id === sourceId ? { ...i, category: targetCat } : i
    );
    setCmsData((prev) => ({ ...prev, portfolioItems: nextList }));
    await persistCmsUpdate(
      { portfolioItems: nextList },
      `Moved "${item.title}" to ${targetCat.toUpperCase()} category!`
    );
  };

  const handlePortfolioDragEnd = () => {
    setDraggedPortfolioId(null);
    setDragOverPortfolioId(null);
    setDragOverCategory(null);
  };

  // ================= PRICING PACKAGES HANDLERS =================
  const handleOpenAddPackage = () => {
    setEditingPackageIndex(null);
    setPackageForm({
      id: `pkg-${Date.now().toString().slice(-4)}`,
      name: '',
      price: 'PKR 150,000',
      priceNote: '2-Day Event Coverage',
      description: '',
      featuresText: '2 Senior Photographers\n1 Cinematic Videographer\n4K Highlight Reel + Full Film\n1 Luxury Italian Photo Album',
      highlighted: false,
    });
    setIsPackageModalOpen(true);
  };

  const handleOpenEditPackage = (pkg: PricingPackage, index: number) => {
    setEditingPackageIndex(index);
    setPackageForm({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      priceNote: pkg.priceNote || '',
      description: pkg.description,
      featuresText: (pkg.features || []).join('\n'),
      highlighted: !!pkg.highlighted,
    });
    setIsPackageModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const pkgObj: PricingPackage = {
      id: packageForm.id || `pkg-${Date.now().toString().slice(-4)}`,
      name: packageForm.name.trim(),
      price: packageForm.price.trim(),
      priceNote: packageForm.priceNote.trim(),
      description: packageForm.description.trim(),
      features: packageForm.featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      highlighted: packageForm.highlighted,
    };

    const nextPackages = [...cmsData.pricingPackages];
    if (editingPackageIndex !== null) {
      nextPackages[editingPackageIndex] = pkgObj;
    } else {
      nextPackages.push(pkgObj);
    }

    await persistCmsUpdate({ pricingPackages: nextPackages }, 'Public pricing packages updated!');
    setIsPackageModalOpen(false);
  };

  const handleDeletePackage = async (idx: number) => {
    const nextPackages = cmsData.pricingPackages.filter((_, i) => i !== idx);
    await persistCmsUpdate({ pricingPackages: nextPackages }, 'Public package deleted.');
  };

  // ================= SERVICES HANDLERS =================
  const handleOpenAddService = () => {
    setEditingServiceIndex(null);
    setServiceForm({
      id: `srv-${Date.now().toString().slice(-4)}`,
      title: '',
      shortDescription: '',
      description: '',
      deliverablesText: 'High-resolution edited gallery\nOnline private showcase',
      processText: 'Pre-shoot consultation\nOn-location coverage\nMaster color grading',
      equipmentText: 'Sony Alpha Flagship Bodies\nG-Master Prime Lenses',
      icon: 'camera',
    });
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (srv: Service, idx: number) => {
    setEditingServiceIndex(idx);
    setServiceForm({
      id: srv.id,
      title: srv.title,
      shortDescription: srv.shortDescription,
      description: srv.description,
      deliverablesText: (srv.deliverables || []).join('\n'),
      processText: (srv.process || []).join('\n'),
      equipmentText: (srv.equipment || []).join('\n'),
      icon: srv.icon || 'camera',
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const existing = editingServiceIndex !== null ? cmsData.detailedServices[editingServiceIndex] : null;
    const srvObj: Service = {
      id: serviceForm.id.trim() || `srv-${Date.now().toString().slice(-4)}`,
      title: serviceForm.title.trim(),
      shortDescription: serviceForm.shortDescription.trim(),
      description: serviceForm.description.trim(),
      deliverables: serviceForm.deliverablesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      process: serviceForm.processText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      equipment: serviceForm.equipmentText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      faq: existing?.faq || [],
      icon: serviceForm.icon,
    };

    const nextServices = [...cmsData.detailedServices];
    if (editingServiceIndex !== null) {
      nextServices[editingServiceIndex] = srvObj;
    } else {
      nextServices.push(srvObj);
    }

    await persistCmsUpdate({ detailedServices: nextServices }, 'Public services page updated!');
    setIsServiceModalOpen(false);
  };

  const handleDeleteService = async (idx: number) => {
    const nextServices = cmsData.detailedServices.filter((_, i) => i !== idx);
    await persistCmsUpdate({ detailedServices: nextServices }, 'Service removed from public website.');
  };

  // ================= TESTIMONIALS HANDLERS =================
  const handleOpenAddTestimonial = () => {
    setEditingTestimonialIndex(null);
    setTestimonialForm({
      quote: '',
      author: '',
      event: 'Barat & Walima Coverage',
      location: 'Burewala',
    });
    setIsTestimonialModalOpen(true);
  };

  const handleOpenEditTestimonial = (t: Testimonial, idx: number) => {
    setEditingTestimonialIndex(idx);
    setTestimonialForm({
      quote: t.quote,
      author: t.author,
      event: t.event,
      location: t.location || 'Burewala',
    });
    setIsTestimonialModalOpen(true);
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextTestimonials = [...cmsData.testimonials];
    if (editingTestimonialIndex !== null) {
      nextTestimonials[editingTestimonialIndex] = testimonialForm;
    } else {
      nextTestimonials.unshift(testimonialForm);
    }
    await persistCmsUpdate({ testimonials: nextTestimonials }, 'Client testimonials updated!');
    setIsTestimonialModalOpen(false);
  };

  const handleDeleteTestimonial = async (idx: number) => {
    const nextTestimonials = cmsData.testimonials.filter((_, i) => i !== idx);
    await persistCmsUpdate({ testimonials: nextTestimonials }, 'Testimonial removed.');
  };

  // ================= BLOG HANDLERS =================
  const handleOpenAddBlog = () => {
    setEditingBlogIndex(null);
    setBlogForm({
      slug: '',
      title: '',
      excerpt: '',
      image: '/portfolio/walima-03-venue-aerial.jpg',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      dateISO: new Date().toISOString().split('T')[0],
      category: 'Wedding Guides',
      content: '',
    });
    setIsBlogModalOpen(true);
  };

  const handleOpenEditBlog = (post: BlogPost, idx: number) => {
    setEditingBlogIndex(idx);
    setBlogForm({ ...post });
    setIsBlogModalOpen(true);
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug =
      blogForm.slug.trim() ||
      blogForm.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const postObj: BlogPost = {
      ...blogForm,
      slug,
    };
    const nextPosts = [...cmsData.blogPosts];
    if (editingBlogIndex !== null) {
      nextPosts[editingBlogIndex] = postObj;
    } else {
      nextPosts.unshift(postObj);
    }
    await persistCmsUpdate({ blogPosts: nextPosts }, 'Blog / Journal articles updated!');
    setIsBlogModalOpen(false);
  };

  const handleDeleteBlog = async (idx: number) => {
    const nextPosts = cmsData.blogPosts.filter((_, i) => i !== idx);
    await persistCmsUpdate({ blogPosts: nextPosts }, 'Blog post deleted.');
  };

  // ================= LEADS HANDLERS =================
  const handleUpdateLeadStatus = async (id: string, status: WebsiteLead['status']) => {
    const nextLeads = cmsData.websiteLeads.map((l) => (l.id === id ? { ...l, status } : l));
    await persistCmsUpdate({ websiteLeads: nextLeads }, `Lead marked as ${status}.`);
  };

  // ================= INTEGRATED DATABASE EXPORT / IMPORT =================
  const handleExportDatabase = async () => {
    try {
      const backup = await apiRequest<any>('/db/export');
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `royal-studio-db-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Full integrated database backup exported (.json)!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to export database backup', 'error');
    }
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        await apiRequest('/db/import', {
          method: 'POST',
          body: JSON.stringify(parsed),
        });
        await loadCmsData();
        await refreshAll();
        addToast('Database restored and synchronized across ERP and public website!', 'success');
      } catch (err: any) {
        addToast(err.message || 'Invalid JSON backup file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl text-white shadow-lg border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold mb-2 border border-amber-500/30">
            <Globe className="w-3.5 h-3.5" />
            <span>Public Website &amp; Portfolio Content Manager</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Complete Portfolio Website Customizer &amp; Social Media Hub
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Customize every section, heading, hero video, about story, wedding film, FAQ, and navigation menu across the public website — and select photos directly from connected social media accounts to showcase in your <strong>/portfolio</strong> gallery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/portfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Portfolio</span>
          </a>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Public Website</span>
          </a>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
        {[
          { id: 'WEBSITE_CUSTOMIZER', label: 'Complete Website Customizer', icon: Sliders },
          { id: 'CHATBOT_MANAGER', label: 'Chatbot Manager', icon: Bot },
          { id: 'PORTFOLIO', label: `Portfolio Gallery (${cmsData.portfolioItems.length})`, icon: ImageIcon },
          {
            id: 'SOCIAL_PORTFOLIO',
            label: `Social Media to Portfolio (${
              (cmsData.socialMediaPosts || []).filter((p) => p.selectedForPortfolio).length
            } Selected)`,
            icon: Share2,
          },
          { id: 'PACKAGES', label: `Public Packages (${cmsData.pricingPackages.length})`, icon: PackageIcon },
          { id: 'SERVICES', label: `Public Services (${cmsData.detailedServices.length})`, icon: Layers },
          { id: 'TESTIMONIALS', label: `Testimonials (${cmsData.testimonials.length})`, icon: MessageSquareQuote },
          { id: 'BLOG', label: `Blog / Journal (${cmsData.blogPosts.length})`, icon: BookOpen },
          { id: 'LEADS', label: `Website Inquiries (${cmsData.websiteLeads.length})`, icon: Inbox },
          { id: 'DATABASE', label: 'Integrated Database & Backup', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as CmsTab)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-slate-900 text-amber-400 shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB: CHATBOT MANAGER ================= */}
      {activeTab === 'CHATBOT_MANAGER' && (
        <ChatbotManagerPage navigate={navigate} />
      )}

      {/* ================= TAB 0: COMPLETE WEBSITE CUSTOMIZER ================= */}
      {activeTab === 'WEBSITE_CUSTOMIZER' && (
        <CompleteWebsiteCustomizer
          value={cmsData.websiteCustomization || defaultWebsiteCustomization}
          connectedAccounts={cmsData.connectedSocialAccounts || defaultConnectedSocialAccounts}
          socialPosts={cmsData.socialMediaPosts || defaultSocialMediaPosts}
          portfolioItems={cmsData.portfolioItems}
          isSaving={isSaving}
          onSave={async (updatedConfig, sectionLabel) => {
            await persistCmsUpdate(
              { websiteCustomization: updatedConfig },
              `${sectionLabel} saved and published to the live website!`
            );
          }}
          onSaveSocialState={async (
            nextAccounts,
            nextPosts,
            nextPortfolio,
            toastMessage,
            nextWebsiteCustomization
          ) => {
            await persistCmsUpdate(
              {
                connectedSocialAccounts: nextAccounts,
                socialMediaPosts: nextPosts,
                portfolioItems: nextPortfolio,
                ...(nextWebsiteCustomization
                  ? { websiteCustomization: nextWebsiteCustomization }
                  : {}),
              },
              toastMessage
            );
          }}
          onUploadImage={(e, onLoaded) =>
            handleImageFileUpload(e, (url) => onLoaded(url))
          }
        />
      )}

      {/* ================= TAB: SOCIAL MEDIA TO PORTFOLIO SELECTOR ================= */}
      {activeTab === 'SOCIAL_PORTFOLIO' && (
        <SocialMediaPortfolioSelector
          connectedAccounts={cmsData.connectedSocialAccounts || defaultConnectedSocialAccounts}
          socialPosts={cmsData.socialMediaPosts || defaultSocialMediaPosts}
          portfolioItems={cmsData.portfolioItems}
          websiteCustomization={cmsData.websiteCustomization || defaultWebsiteCustomization}
          isSaving={isSaving}
          onSaveSocialState={async (
            nextAccounts,
            nextPosts,
            nextPortfolio,
            toastMessage,
            nextWebsiteCustomization
          ) => {
            await persistCmsUpdate(
              {
                connectedSocialAccounts: nextAccounts,
                socialMediaPosts: nextPosts,
                portfolioItems: nextPortfolio,
                ...(nextWebsiteCustomization
                  ? { websiteCustomization: nextWebsiteCustomization }
                  : {}),
              },
              toastMessage
            );
          }}
          onUploadImage={handleImageFileUpload}
        />
      )}

      {/* ================= TAB 1: PUBLIC PORTFOLIO GALLERY MANAGER ================= */}
      {activeTab === 'PORTFOLIO' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search portfolio by title, category, city..."
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                  />
                </div>

                {/* View Mode Switcher (Detailed vs Storyboard Drag-and-Drop) */}
                <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setPortfolioViewMode('DETAILED')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      portfolioViewMode === 'DETAILED'
                        ? 'bg-slate-900 text-amber-400 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Detailed Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioViewMode('STORYBOARD')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      portfolioViewMode === 'STORYBOARD'
                        ? 'bg-slate-900 text-amber-400 shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Storyboard Drag Grid</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('SOCIAL_PORTFOLIO')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Select Photos from Social Media</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddPortfolio}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Portfolio Photo</span>
                </button>
              </div>
            </div>

            {/* Real-Time Drag & Drop Interactive Guide Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Real-Time Drag &amp; Drop Active:</strong> Drag any photo card to reorder priority in real time, or drag a photo directly onto any <strong>Category Pill</strong> below to re-categorize it.
                </span>
              </div>
              <span className="text-[11px] font-semibold text-amber-800">
                Top {cmsData.websiteCustomization?.sectionVisibility?.homePortfolioLimit || 9} items appear on Homepage
              </span>
            </div>

            {/* Category Pills (Also act as Drop Targets to Re-Categorize Dragged Media!) */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {portfolioCategories.map((cat) => {
                const count =
                  cat.id === 'all'
                    ? cmsData.portfolioItems.length
                    : cmsData.portfolioItems.filter((i) => i.category === cat.id).length;
                const isDropTarget =
                  draggedPortfolioId !== null &&
                  cat.id !== 'all' &&
                  dragOverCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    onDragOver={(e) => {
                      if (draggedPortfolioId !== null && cat.id !== 'all') {
                        e.preventDefault();
                        if (dragOverCategory !== cat.id) {
                          setDragOverCategory(cat.id);
                        }
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverCategory === cat.id) {
                        setDragOverCategory(null);
                      }
                    }}
                    onDrop={(e) => handlePortfolioDropOnCategory(e, cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isDropTarget
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-600 scale-105 shadow-sm'
                        : categoryFilter === cat.id
                        ? 'bg-slate-900 text-amber-400'
                        : draggedPortfolioId !== null && cat.id !== 'all'
                        ? 'bg-amber-50 text-amber-900 border border-dashed border-amber-300 hover:bg-amber-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Portfolio Cards Grid (Supports Real-Time Drag-and-Drop Reordering & Prioritization) */}
          {isLoading ? (
            <div className="p-12 text-center text-xs text-gray-500">Loading portfolio gallery...</div>
          ) : filteredPortfolio.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
              <Camera className="w-8 h-8 text-amber-600 mx-auto" />
              <div className="text-sm font-bold text-gray-900">No Portfolio Photos in This Filter</div>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Click &quot;Add Portfolio Photo&quot; to upload a new wedding, bridal, Barat, Walima, or editorial photograph to this category.
              </p>
              <button
                type="button"
                onClick={handleOpenAddPortfolio}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Photo Now</span>
              </button>
            </div>
          ) : (
            <div
              className={
                portfolioViewMode === 'STORYBOARD'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              }
            >
              {filteredPortfolio.map((item) => {
                const globalIndex = cmsData.portfolioItems.findIndex((i) => i.id === item.id);
                const homeLimit =
                  cmsData.websiteCustomization?.sectionVisibility?.homePortfolioLimit || 9;
                const isHomepageFeatured = globalIndex >= 0 && globalIndex < homeLimit;
                const isDragging = draggedPortfolioId === item.id;
                const isDragOver = dragOverPortfolioId === item.id;

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handlePortfolioDragStart(e, item.id)}
                    onDragOver={(e) => handlePortfolioDragOverCard(e, item.id)}
                    onDragLeave={() => {
                      if (dragOverPortfolioId === item.id) {
                        setDragOverPortfolioId(null);
                      }
                    }}
                    onDrop={(e) => handlePortfolioDropOnCard(e, item.id)}
                    onDragEnd={handlePortfolioDragEnd}
                    className={`bg-white rounded-2xl border overflow-hidden transition-all flex flex-col justify-between group select-none cursor-grab active:cursor-grabbing ${
                      isDragging
                        ? 'opacity-45 scale-95 border-amber-400 ring-2 ring-amber-400'
                        : isDragOver
                        ? 'border-amber-500 ring-2 ring-amber-500 shadow-lg scale-[1.02] bg-amber-50/20'
                        : 'border-gray-200 shadow-2xs hover:shadow-md hover:border-amber-300'
                    }`}
                  >
                    <div>
                      <div
                        className={`relative bg-slate-950 overflow-hidden ${
                          portfolioViewMode === 'STORYBOARD' ? 'h-36' : 'h-52'
                        }`}
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          draggable={false}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                        />

                        {/* Drop Target Indicator Overlay */}
                        {isDragOver && (
                          <div className="absolute inset-0 bg-amber-500/25 backdrop-blur-[1px] flex items-center justify-center p-2 z-10 pointer-events-none">
                            <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-amber-400 text-xs font-bold shadow-lg border border-amber-400/50">
                              Drop to place at #{globalIndex + 1}
                            </span>
                          </div>
                        )}

                        {/* Top-Left Priority & Drag Handle Pill */}
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/90 text-white text-[10px] font-mono font-bold shadow-xs"
                            title="Drag card to reorder priority"
                          >
                            <GripVertical className="w-3 h-3 text-amber-400" />
                            <span>#{globalIndex + 1}</span>
                          </span>
                          {isHomepageFeatured && portfolioViewMode === 'DETAILED' && (
                            <span
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-bold"
                              title="Featured on Homepage Portfolio Preview"
                            >
                              <Star className="w-2.5 h-2.5 fill-slate-950" />
                              <span>Home</span>
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-slate-950/85 text-amber-400 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                            {item.category}
                          </span>
                          {item.mediaType === 'video' && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold uppercase">
                              <Play className="w-2.5 h-2.5 fill-white" />
                              <span>Video{item.duration ? ` · ${item.duration}` : ''}</span>
                            </span>
                          )}
                          {portfolioViewMode === 'DETAILED' && (item.sourcePlatform && item.sourcePlatform !== 'upload') && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/95 text-slate-950 text-[10px] font-bold uppercase">
                              {item.sourcePlatform} {item.socialHandle ? `(${item.socialHandle})` : ''}
                            </span>
                          )}
                        </div>

                        {/* Top-Right Priority & Step Controls */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                          {globalIndex > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePinPortfolioItemToTop(item.id);
                              }}
                              disabled={isSaving}
                              className="px-1.5 py-1 rounded bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-30 text-[10px] font-bold inline-flex items-center gap-0.5 shadow-xs cursor-pointer"
                              title="Prioritize to #1 Featured Position"
                            >
                              <ChevronsUp className="w-3 h-3" />
                              <span>#1</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePortfolioItem(item.id, 'up');
                            }}
                            disabled={globalIndex <= 0 || isSaving}
                            className="p-1 rounded bg-slate-950/80 text-white hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 cursor-pointer"
                            title="Move Earlier in Gallery"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePortfolioItem(item.id, 'down');
                            }}
                            disabled={globalIndex >= cmsData.portfolioItems.length - 1 || isSaving}
                            className="p-1 rounded bg-slate-950/80 text-white hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 cursor-pointer"
                            title="Move Later in Gallery"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 space-y-2">
                        <div className="font-bold text-xs text-gray-900 truncate" title={item.title}>
                          {item.title}
                        </div>

                        {portfolioViewMode === 'DETAILED' && (
                          <>
                            <div className="flex items-center justify-between text-[11px] text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-amber-600" />
                                {item.location || 'Burewala'}
                              </span>
                              {item.exif?.camera && (
                                <span className="font-mono text-[10px] text-gray-400 truncate max-w-[120px]">
                                  {item.exif.camera}
                                </span>
                              )}
                            </div>

                            {/* Quick Real-Time Category & Aspect Ratio Organizers */}
                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              <select
                                value={item.category}
                                onChange={(e) =>
                                  handleQuickOrganizePortfolioItem(item.id, {
                                    category: e.target.value as Exclude<PortfolioCategory, 'all'>,
                                  })
                                }
                                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 uppercase cursor-pointer"
                                title="Quickly change category"
                              >
                                {PORTFOLIO_CATEGORIES_LIST.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={item.aspect}
                                onChange={(e) =>
                                  handleQuickOrganizePortfolioItem(item.id, {
                                    aspect: e.target.value as 'tall' | 'wide' | 'square',
                                  })
                                }
                                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 uppercase cursor-pointer"
                                title="Quickly change grid aspect ratio"
                              >
                                <option value="tall">Tall (3:4)</option>
                                <option value="wide">Wide (16:10)</option>
                                <option value="square">Square (1:1)</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPortfolio(item)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-amber-700 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>{portfolioViewMode === 'STORYBOARD' ? 'Edit' : 'Edit Details'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePortfolioItem(item.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: PUBLIC PRICING PACKAGES ================= */}
      {activeTab === 'PACKAGES' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xs font-bold text-gray-900">
                  Customer Side Detailed Event Price Breakdown (Inquiry Form)
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    profile?.showPublicPriceBreakdown
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {profile?.showPublicPriceBreakdown
                    ? 'Visible on Customer Side'
                    : 'Hidden on Customer Side (Default)'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Control whether the Real-Time Equipment &amp; Crew Pricing Engine table is hidden (default) or shown to customers on the public website.
              </p>
            </div>
            <button
              type="button"
              disabled={isUpdatingVisibility}
              onClick={handleToggleCustomerBreakdownVisibility}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                profile?.showPublicPriceBreakdown
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              {profile?.showPublicPriceBreakdown
                ? 'Hide on Customer Side (Default)'
                : 'Show on Customer Side'}
            </button>
          </div>

          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Public Website Pricing Packages (/pricing)</h3>
              <p className="text-xs text-gray-500">
                Manage the showcase packages displayed to prospective brides, grooms, and families on the public Pricing page.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddPackage}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Public Package</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cmsData.pricingPackages.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${
                  pkg.highlighted
                    ? 'bg-slate-900 text-white border-amber-500 shadow-lg'
                    : 'bg-white text-gray-900 border-gray-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base">{pkg.name}</span>
                    {pkg.highlighted && (
                      <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black uppercase">
                        Most Popular
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-75">{pkg.priceNote}</div>
                  <div className="text-xl font-black text-amber-500">{pkg.price}</div>
                  <p className="text-xs opacity-85 leading-relaxed">{pkg.description}</p>
                  <ul className="space-y-1.5 pt-2 text-xs">
                    {(pkg.features || []).map((f, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-gray-200/20 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenEditPackage(pkg, idx)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Package</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePackage(idx)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: PUBLIC SERVICES ================= */}
      {activeTab === 'SERVICES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Public Services Showcase (/services)</h3>
              <p className="text-xs text-gray-500">
                Customize the detailed service breakdowns, deliverables, workflow steps, and camera gear displayed on the public Services page.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddService}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service Section</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cmsData.detailedServices.map((srv, idx) => (
              <div
                key={srv.id || idx}
                className="p-5 bg-white rounded-2xl border border-gray-200 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{srv.title}</h4>
                      <p className="text-xs text-amber-700 font-medium">{srv.shortDescription}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600">
                      #{srv.id}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{srv.description}</p>
                  <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="font-bold text-gray-800 mb-1">Deliverables</div>
                      <div className="text-gray-500">{(srv.deliverables || []).length} items</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="font-bold text-gray-800 mb-1">Process</div>
                      <div className="text-gray-500">{(srv.process || []).length} steps</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="font-bold text-gray-800 mb-1">Equipment</div>
                      <div className="text-gray-500">{(srv.equipment || []).length} items</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenEditService(srv, idx)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-amber-700 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Service</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteService(idx)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: TESTIMONIALS ================= */}
      {activeTab === 'TESTIMONIALS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Client Testimonials &amp; Reviews</h3>
              <p className="text-xs text-gray-500">
                Manage the client testimonials carousel displayed on the public Homepage.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddTestimonial}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Testimonial</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cmsData.testimonials.map((t, idx) => (
              <div
                key={idx}
                className="p-5 bg-white rounded-2xl border border-gray-200 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <p className="text-xs italic text-gray-700 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{t.author}</div>
                    <div className="text-[11px] text-amber-700">
                      {t.event} {t.location ? `· ${t.location}` : ''}
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenEditTestimonial(t, idx)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-amber-700 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTestimonial(idx)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 5: BLOG / JOURNAL ================= */}
      {activeTab === 'BLOG' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Journal &amp; Blog Posts (/blog)</h3>
              <p className="text-xs text-gray-500">
                Publish wedding photography guides, bridal tips, and behind-the-scenes stories.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddBlog}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Blog Post</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cmsData.blogPosts.map((post, idx) => (
              <div
                key={post.slug || idx}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 bg-slate-900 overflow-hidden">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-amber-700 font-bold uppercase">
                      <span>{post.category}</span>
                      <span>•</span>
                      <span>{post.date}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{post.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{post.excerpt}</p>
                  </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenEditBlog(post, idx)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 hover:text-amber-700 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Article</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlog(idx)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 6: WEBSITE INQUIRIES ================= */}
      {activeTab === 'LEADS' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Public Website Booking Inquiries (/contact)</h3>
              <p className="text-xs text-gray-500">
                Every inquiry submitted on the public website is automatically synced into your CRM Clients &amp; Events and listed here.
              </p>
            </div>
          </div>

          {cmsData.websiteLeads.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500">
              No website inquiries recorded yet. Submissions from the public <strong>/contact</strong> page will appear here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Couple / Client</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Wedding Date &amp; City</th>
                    <th className="py-3 px-4">Requested Services</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cmsData.websiteLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-amber-50/30">
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {lead.brideName} &amp; {lead.groomName}
                        <div className="text-[10px] text-gray-400 font-normal">
                          Submitted {new Date(lead.submittedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        <div>{lead.phone}</div>
                        <div className="text-[11px] text-gray-400">{lead.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">
                        <div className="font-semibold">{lead.weddingDate}</div>
                        <div className="text-[11px] text-gray-500">
                          {lead.venue ? `${lead.venue}, ` : ''}
                          {lead.city}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 max-w-xs">
                        <div className="font-medium">{lead.services}</div>
                        {lead.message && (
                          <div className="text-[11px] text-gray-500 truncate">{lead.message}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            handleUpdateLeadStatus(lead.id, e.target.value as WebsiteLead['status'])
                          }
                          className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold"
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Booked">Booked</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {lead.linkedEventId && (
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`/proposal/${lead.linkedEventId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[11px] font-bold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Proposal</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => navigate(`/events/${lead.linkedEventId}`)}
                              className="px-3 py-1 bg-slate-900 text-amber-400 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              Open ERP Event
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 7: INTEGRATED DATABASE & BACKUP MANAGER ================= */}
      {activeTab === 'DATABASE' && (
        <div className="space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1">
                  <Database className="w-4 h-4" />
                  <span>Zero-Config Pluggable Persistence Engine Active</span>
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {dbStats?.driverName || 'RoyalStudio Embedded Atomic JSON DB'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  All ERP records, events, invoices, quotations, payments, and public website CMS content are stored locally and atomically in <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{dbStats?.storagePath || '/data/studio_db.json'}</code> with automatic rolling backups and zero external cloud dependencies.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleExportDatabase}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Full DB Backup (.json)</span>
                </button>
                <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Restore / Replace DB (.json)</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleImportDatabase}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'CRM Clients', val: dbStats?.counts?.clients ?? 0 },
                { label: 'ERP Events', val: dbStats?.counts?.events ?? 0 },
                { label: 'Invoices', val: dbStats?.counts?.invoices ?? 0 },
                { label: 'Quotations', val: dbStats?.counts?.quotations ?? 0 },
                { label: 'Payments', val: dbStats?.counts?.payments ?? 0 },
                { label: 'Portfolio Photos', val: dbStats?.counts?.portfolioItems ?? cmsData.portfolioItems.length },
              ].map((stat) => (
                <div key={stat.label} className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="text-[11px] font-semibold text-gray-500">{stat.label}</div>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1">{stat.val}</div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <strong>Adapter Architecture:</strong> Defined in <code className="font-mono">lib/db/storageAdapter.ts</code> (<code className="font-mono">DatabaseStorageAdapter&lt;T&gt;</code>). Replaceable at any time via <code className="font-mono">setDatabaseAdapter(...)</code> without changing any UI or API routes.
              </div>
              {dbStats?.fileSizeBytes ? (
                <div className="font-mono text-[11px] text-slate-500 shrink-0">
                  Size: {(dbStats.fileSizeBytes / 1024).toFixed(1)} KB
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT PORTFOLIO PHOTO ================= */}
      <Modal
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        title={editingPortfolioItem ? 'Edit Public Portfolio Photo' : 'Add Photo to Public Portfolio'}
      >
        <form onSubmit={handleSavePortfolioItem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Photo Title *</label>
              <input
                type="text"
                required
                value={portfolioForm.title}
                onChange={(e) => setPortfolioForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Crimson Bridal Portrait in Burewala"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Portfolio Category *</label>
              <select
                value={portfolioForm.category}
                onChange={(e) =>
                  setPortfolioForm((p) => ({
                    ...p,
                    category: e.target.value as Exclude<PortfolioCategory, 'all'>,
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold uppercase"
              >
                {PORTFOLIO_CATEGORIES_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Grid Aspect Ratio *</label>
              <select
                value={portfolioForm.aspect}
                onChange={(e) =>
                  setPortfolioForm((p) => ({
                    ...p,
                    aspect: e.target.value as 'tall' | 'wide' | 'square',
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="tall">Tall Portrait (3:4)</option>
                <option value="wide">Wide Landscape (16:10)</option>
                <option value="square">Square Editorial (1:1)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Media Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPortfolioForm((p) => ({ ...p, mediaType: 'image' }))}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                    portfolioForm.mediaType === 'image'
                      ? 'bg-slate-900 text-amber-400 border-slate-900'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Photo / Editorial Image</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPortfolioForm((p) => ({
                      ...p,
                      mediaType: 'video',
                      aspect: 'wide',
                    }))
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                    portfolioForm.mediaType === 'video'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video / YouTube Film / Reel</span>
                </button>
              </div>
            </div>

            {portfolioForm.mediaType === 'video' && (
              <div className="sm:col-span-2 p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-rose-950 mb-1">
                      YouTube Video URL / ID or Direct Video Embed URL *
                    </label>
                    <input
                      type="text"
                      value={portfolioForm.videoUrl}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const ytId = extractYoutubeId(raw);
                        setPortfolioForm((p) => ({
                          ...p,
                          videoUrl: raw,
                          image:
                            raw.includes('youtu') || /^[a-zA-Z0-9_-]{11}$/.test(raw.trim())
                              ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
                              : p.image,
                        }));
                      }}
                      placeholder="https://www.youtube.com/watch?v=QF3BmojTrKQ"
                      className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-rose-950 mb-1">
                      Video Duration
                    </label>
                    <input
                      type="text"
                      value={portfolioForm.duration}
                      onChange={(e) => setPortfolioForm((p) => ({ ...p, duration: e.target.value }))}
                      placeholder="4:12"
                      className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  Upload New Image OR Enter Image Path / URL *
                </label>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                  <Sparkles className="w-3 h-3" />
                  Auto AVIF/WebP PageSpeed Compression
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  value={portfolioForm.image}
                  onChange={(e) => setPortfolioForm((p) => ({ ...p, image: e.target.value }))}
                  placeholder="/portfolio/bridal-01-crimson-lehenga.jpg or https://..."
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-bold cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload &amp; Optimize (AVIF/WebP)</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handleImageFileUpload(e, (optimizedUrl, detectedAspect) =>
                        setPortfolioForm((p) => ({
                          ...p,
                          image: optimizedUrl,
                          aspect: detectedAspect || p.aspect,
                        }))
                      )
                    }
                  />
                </label>
              </div>
              {portfolioForm.image && (
                <div className="mt-2 h-32 w-full rounded-lg overflow-hidden bg-slate-950 border border-gray-200 flex items-center justify-center">
                  <img
                    src={portfolioForm.image}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">City / Location</label>
              <input
                type="text"
                value={portfolioForm.location}
                onChange={(e) => setPortfolioForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="Burewala / Lahore / Multan"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Camera Body (EXIF)</label>
              <input
                type="text"
                value={portfolioForm.camera}
                onChange={(e) => setPortfolioForm((p) => ({ ...p, camera: e.target.value }))}
                placeholder="Sony A7R V"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Lens</label>
              <input
                type="text"
                value={portfolioForm.lens}
                onChange={(e) => setPortfolioForm((p) => ({ ...p, lens: e.target.value }))}
                placeholder="85mm f/1.4 GM"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Aperture / ISO</label>
              <input
                type="text"
                value={portfolioForm.aperture}
                onChange={(e) => setPortfolioForm((p) => ({ ...p, aperture: e.target.value }))}
                placeholder="f/1.8"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPortfolioModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg text-xs font-bold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save to Public Portfolio'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: ADD / EDIT PUBLIC PACKAGE ================= */}
      <Modal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        title={editingPackageIndex !== null ? 'Edit Public Website Package' : 'Add Public Website Package'}
      >
        <form onSubmit={handleSavePackage} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Package Name *</label>
              <input
                type="text"
                required
                value={packageForm.name}
                onChange={(e) => setPackageForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Royal Signature"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Display Price *</label>
              <input
                type="text"
                required
                value={packageForm.price}
                onChange={(e) => setPackageForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="PKR 250,000"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Coverage Subtitle</label>
            <input
              type="text"
              value={packageForm.priceNote}
              onChange={(e) => setPackageForm((p) => ({ ...p, priceNote: e.target.value }))}
              placeholder="Full 3-Day Wedding Coverage"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Package Description</label>
            <textarea
              rows={2}
              value={packageForm.description}
              onChange={(e) => setPackageForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Deliverables / Features (One per line)
            </label>
            <textarea
              rows={5}
              value={packageForm.featuresText}
              onChange={(e) => setPackageForm((p) => ({ ...p, featuresText: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={packageForm.highlighted}
              onChange={(e) => setPackageForm((p) => ({ ...p, highlighted: e.target.checked }))}
            />
            <span>Highlight as &quot;Most Popular&quot; on Pricing Page</span>
          </label>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPackageModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer"
            >
              Save Package
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: ADD / EDIT SERVICE ================= */}
      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title={editingServiceIndex !== null ? 'Edit Public Service' : 'Add Public Service'}
      >
        <form onSubmit={handleSaveService} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Service Title *</label>
              <input
                type="text"
                required
                value={serviceForm.title}
                onChange={(e) => setServiceForm((s) => ({ ...s, title: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Icon Style</label>
              <select
                value={serviceForm.icon}
                onChange={(e) => setServiceForm((s) => ({ ...s, icon: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              >
                <option value="camera">Camera (Photography)</option>
                <option value="film">Film (Cinematography)</option>
                <option value="sparkles">Sparkles (Bridal Editorial)</option>
                <option value="shirt">Fashion / Campaign</option>
                <option value="building">Corporate / Events</option>
                <option value="package">Product / Commercial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Short Subtitle</label>
            <input
              type="text"
              value={serviceForm.shortDescription}
              onChange={(e) => setServiceForm((s) => ({ ...s, shortDescription: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Detailed Description</label>
            <textarea
              rows={2}
              value={serviceForm.description}
              onChange={(e) => setServiceForm((s) => ({ ...s, description: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Deliverables (1/line)</label>
              <textarea
                rows={4}
                value={serviceForm.deliverablesText}
                onChange={(e) => setServiceForm((s) => ({ ...s, deliverablesText: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-[11px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Process (1/line)</label>
              <textarea
                rows={4}
                value={serviceForm.processText}
                onChange={(e) => setServiceForm((s) => ({ ...s, processText: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-[11px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Equipment (1/line)</label>
              <textarea
                rows={4}
                value={serviceForm.equipmentText}
                onChange={(e) => setServiceForm((s) => ({ ...s, equipmentText: e.target.value }))}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-[11px]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsServiceModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer"
            >
              Save Service
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: ADD / EDIT TESTIMONIAL ================= */}
      <Modal
        isOpen={isTestimonialModalOpen}
        onClose={() => setIsTestimonialModalOpen(false)}
        title={editingTestimonialIndex !== null ? 'Edit Client Testimonial' : 'Add Client Testimonial'}
      >
        <form onSubmit={handleSaveTestimonial} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Client / Couple Name *</label>
            <input
              type="text"
              required
              value={testimonialForm.author}
              onChange={(e) => setTestimonialForm((t) => ({ ...t, author: e.target.value }))}
              placeholder="Ayesha & Hamza"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Event Type</label>
              <input
                type="text"
                value={testimonialForm.event}
                onChange={(e) => setTestimonialForm((t) => ({ ...t, event: e.target.value }))}
                placeholder="3-Day Royal Wedding"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={testimonialForm.location || ''}
                onChange={(e) => setTestimonialForm((t) => ({ ...t, location: e.target.value }))}
                placeholder="Burewala"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Review Quote *</label>
            <textarea
              rows={4}
              required
              value={testimonialForm.quote}
              onChange={(e) => setTestimonialForm((t) => ({ ...t, quote: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTestimonialModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer"
            >
              Save Testimonial
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: ADD / EDIT BLOG POST ================= */}
      <Modal
        isOpen={isBlogModalOpen}
        onClose={() => setIsBlogModalOpen(false)}
        title={editingBlogIndex !== null ? 'Edit Blog Article' : 'Publish New Blog Article'}
      >
        <form onSubmit={handleSaveBlog} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Article Title *</label>
            <input
              type="text"
              required
              value={blogForm.title}
              onChange={(e) => setBlogForm((b) => ({ ...b, title: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={blogForm.category}
                onChange={(e) => setBlogForm((b) => ({ ...b, category: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Display Date</label>
              <input
                type="text"
                value={blogForm.date}
                onChange={(e) => setBlogForm((b) => ({ ...b, date: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Cover Image Path or Upload</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={blogForm.image}
                onChange={(e) => setBlogForm((b) => ({ ...b, image: e.target.value }))}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
              />
              <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleImageFileUpload(e, (dataUrl) => setBlogForm((b) => ({ ...b, image: dataUrl })))
                  }
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Short Excerpt *</label>
            <textarea
              rows={2}
              required
              value={blogForm.excerpt}
              onChange={(e) => setBlogForm((b) => ({ ...b, excerpt: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Article Body Content</label>
            <textarea
              rows={5}
              value={blogForm.content}
              onChange={(e) => setBlogForm((b) => ({ ...b, content: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBlogModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 text-amber-400 rounded-lg text-xs font-bold cursor-pointer"
            >
              Save Article
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetDefaults}
        title="Reset Public Website & Portfolio CMS?"
        message="This will restore the default Royal Studio portfolio photos, packages, services, testimonials, and blog posts. Your website booking inquiries will be preserved."
        confirmText="Reset to Defaults"
      />
    </div>
  );
};
