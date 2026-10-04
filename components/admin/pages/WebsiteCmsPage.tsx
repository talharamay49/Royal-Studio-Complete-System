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
  Download
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useStudioData } from '../context/StudioDataContext';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import type {
  PortfolioItem,
  PortfolioCategory,
  PricingPackage,
  Service,
  Testimonial,
  BlogPost
} from '@/types';
import { portfolioCategories } from '@/lib/data';

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
}

type CmsTab = 'PORTFOLIO' | 'PACKAGES' | 'SERVICES' | 'TESTIMONIALS' | 'BLOG' | 'LEADS' | 'DATABASE';

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
  const { addToast, refreshAll } = useStudioData();
  const [activeTab, setActiveTab] = useState<CmsTab>('PORTFOLIO');
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
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Portfolio Filter & Modal State
  const [categoryFilter, setCategoryFilter] = useState<PortfolioCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<PortfolioItem | null>(null);
  const [portfolioForm, setPortfolioForm] = useState<{
    title: string;
    category: Exclude<PortfolioCategory, 'all'>;
    image: string;
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
    image: '/portfolio/bridal-01-crimson-lehenga.jpg',
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
      image: '/portfolio/bridal-01-crimson-lehenga.jpg',
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
      image: item.image,
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
      addToast('Title and image are required for portfolio items.', 'error');
      return;
    }

    const newItem: PortfolioItem = {
      id: editingPortfolioItem
        ? editingPortfolioItem.id
        : Math.max(0, ...cmsData.portfolioItems.map((i) => i.id)) + 1,
      title: portfolioForm.title.trim(),
      category: portfolioForm.category,
      image: portfolioForm.image.trim(),
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
    await persistCmsUpdate({ portfolioItems: nextList }, 'Portfolio display order updated.');
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
            Manage Public Portfolio &amp; Website Pages
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Add, edit, reorder, or upload photos for the public <strong>/portfolio</strong> gallery, customize public pricing packages, services, client reviews, journal articles, and manage website booking inquiries.
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
          { id: 'PORTFOLIO', label: `Portfolio Gallery (${cmsData.portfolioItems.length})`, icon: ImageIcon },
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

      {/* ================= TAB 1: PUBLIC PORTFOLIO GALLERY MANAGER ================= */}
      {activeTab === 'PORTFOLIO' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search portfolio by title, category, city..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
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

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {portfolioCategories.map((cat) => {
                const count =
                  cat.id === 'all'
                    ? cmsData.portfolioItems.length
                    : cmsData.portfolioItems.filter((i) => i.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      categoryFilter === cat.id
                        ? 'bg-slate-900 text-amber-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Portfolio Cards Grid */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPortfolio.map((item) => {
                const globalIndex = cmsData.portfolioItems.findIndex((i) => i.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="relative h-52 bg-slate-950 overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-950/85 text-amber-400 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                            {item.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/90 text-slate-800 text-[10px] font-semibold uppercase">
                            {item.aspect}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMovePortfolioItem(item.id, 'up')}
                            disabled={globalIndex <= 0 || isSaving}
                            className="p-1 rounded bg-slate-950/80 text-white hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 cursor-pointer"
                            title="Move Earlier in Gallery"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePortfolioItem(item.id, 'down')}
                            disabled={globalIndex >= cmsData.portfolioItems.length - 1 || isSaving}
                            className="p-1 rounded bg-slate-950/80 text-white hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 cursor-pointer"
                            title="Move Later in Gallery"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 space-y-1">
                        <div className="font-bold text-xs text-gray-900 truncate" title={item.title}>
                          {item.title}
                        </div>
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
                      </div>
                    </div>

                    <div className="px-3.5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPortfolio(item)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-amber-700 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Details</span>
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
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200">
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
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200">
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
                          <button
                            type="button"
                            onClick={() => navigate(`/events/${lead.linkedEventId}`)}
                            className="px-3 py-1 bg-slate-900 text-amber-400 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Open ERP Event
                          </button>
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
              <div className="flex items-center justify-between mb-1">
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex gap-2">
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
