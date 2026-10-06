import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  MapPin,
  Phone,
  Share2,
  Image as ImageIcon,
  FileText,
  CreditCard,
  Clock,
  Scale,
  Globe,
  Shield,
  History,
  Save,
  CheckCircle2,
  KeyRound,
  Trash2,
  Users,
  Plus,
  ExternalLink,
  RotateCcw,
  Upload,
  Star,
  Check,
  AlertCircle,
  Palette,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useStudioData } from '../context/StudioDataContext';
import { useAuth } from '../context/AuthContext';
import {
  useStudioTheme,
  DEFAULT_STUDIO_THEME,
  STUDIO_THEME_PRESETS
} from '@/components/shared/StudioProfileContext';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { StaffProfilePage } from './StaffProfilePage';
import { generateSampleStationeryPDF } from '../utils/pdfGenerator';
import {
  User,
  AdminProfile,
  StudioThemeConfig,
  BankAccountItem,
  BankAccountPurpose,
  PaymentMethodItem,
  BusinessHourItem,
  CustomSocialLink
} from '../types';

type ProfileTab =
  | 'IDENTITY'
  | 'THEME'
  | 'ADDRESS'
  | 'CONTACT'
  | 'SOCIAL'
  | 'BRANDING'
  | 'DOCUMENTS'
  | 'BANKING'
  | 'HOURS'
  | 'LEGAL'
  | 'SEO'
  | 'USERS'
  | 'AUDIT';

const DEFAULT_HOURS: BusinessHourItem[] = [
  { day: 'Monday', openTime: '10:00', closeTime: '21:00', isClosed: false, note: 'Standard studio hours' },
  { day: 'Tuesday', openTime: '10:00', closeTime: '21:00', isClosed: false, note: 'Standard studio hours' },
  { day: 'Wednesday', openTime: '10:00', closeTime: '21:00', isClosed: false, note: 'Standard studio hours' },
  { day: 'Thursday', openTime: '10:00', closeTime: '21:00', isClosed: false, note: 'Standard studio hours' },
  { day: 'Friday', openTime: '10:00', closeTime: '21:00', isClosed: false, note: 'Jummah break 13:00–14:30' },
  { day: 'Saturday', openTime: '10:00', closeTime: '22:00', isClosed: false, note: 'Peak wedding consultations' },
  { day: 'Sunday', openTime: '12:00', closeTime: '20:00', isClosed: false, note: 'By appointment & event coverage' }
];

export const ProfilePage: React.FC = () => {
  const {
    profile,
    profileAuditLogs,
    updateProfile,
    resetProfileToDefaults,
    users,
    updateUserStatus,
    resetUserPassword,
    deleteUser,
    addToast
  } = useStudioData();
  const { isAdmin } = useAuth();
  const {
    themeConfig: liveThemeConfig,
    resolvedMode,
    toggleThemeMode,
    setThemeMode,
    previewThemeConfig
  } = useStudioTheme();

  const [activeTab, setActiveTab] = useState<ProfileTab>('IDENTITY');
  const [formData, setFormData] = useState<Partial<AdminProfile>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isResetProfileConfirmOpen, setIsResetProfileConfirmOpen] = useState(false);

  useEffect(() => {
    const handleOpenThemeTab = () => setActiveTab('THEME');
    window.addEventListener('royalstudio:open-theme-tab', handleOpenThemeTab);
    return () => window.removeEventListener('royalstudio:open-theme-tab', handleOpenThemeTab);
  }, []);

  // Bank Account Modal state
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccountItem | null>(null);
  const [bankForm, setBankForm] = useState<Omit<BankAccountItem, 'id'>>({
    accountName: '',
    bankName: '',
    accountTitle: 'Royal Studio',
    accountNumber: '',
    iban: '',
    branch: 'Burewala Main Branch',
    branchCode: '',
    swiftBic: '',
    currency: 'PKR',
    accountType: 'Current',
    accountPurpose: 'Client Payments',
    isActive: true,
    isDefault: false,
    showPublicly: true,
    notes: ''
  });

  // Payment Method Modal state
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodItem | null>(null);
  const [methodForm, setMethodForm] = useState<Omit<PaymentMethodItem, 'id'>>({
    methodName: 'Bank Transfer',
    displayName: '',
    accountNumber: '',
    instructions: '',
    isActive: true,
    showPublicly: true
  });

  // Custom Social Link state
  const [newSocialPlatform, setNewSocialPlatform] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  // User management modals
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Sync formData whenever profile loads or changes
  useEffect(() => {
    if (profile) {
      setFormData({
        ...profile,
        businessHours: profile.businessHours?.length ? profile.businessHours : DEFAULT_HOURS,
        bankAccounts: profile.bankAccounts || [],
        paymentMethods: profile.paymentMethods || [],
        customSocialLinks: profile.customSocialLinks || [],
        themeConfig: {
          ...DEFAULT_STUDIO_THEME,
          ...(profile.themeConfig || {})
        },
        notificationPreferences: profile.notificationPreferences || {
          overdueInvoices: true,
          urgentTasks: true,
          equipmentMaintenance: true,
          lowAvailability: true
        }
      });
    }
  }, [profile]);

  if (!isAdmin) {
    return <StaffProfilePage />;
  }

  const setField = <K extends keyof AdminProfile>(key: K, value: AdminProfile[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async (e?: React.FormEvent, sectionLabel?: string) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      addToast('Only administrators can modify the official Studio Profile.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(formData, sectionLabel || `Studio Profile (${activeTab})`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (field: keyof AdminProfile, file: File | undefined, syncAllDocBgs = false) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image file size should be under 5MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        if (syncAllDocBgs) {
          setFormData(prev => ({
            ...prev,
            documentBackground: dataUrl,
            invoiceBackground: dataUrl,
            quotationBackground: dataUrl,
            receiptBackground: dataUrl,
          }));
          addToast('Applied uploaded background image across all official documents. Click Save Document Settings to persist.', 'info');
        } else {
          setField(field, dataUrl as any);
          addToast(`Loaded image for ${String(field)}. Click Save Changes to persist.`, 'info');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Bank Account Handlers
  const handleOpenAddBank = () => {
    setEditingBank(null);
    setBankForm({
      accountName: 'Studio Corporate Account',
      bankName: 'Meezan Bank Ltd',
      accountTitle: formData.studioName || 'Royal Studio',
      accountNumber: '',
      iban: '',
      branch: 'Burewala',
      branchCode: '',
      swiftBic: '',
      currency: formData.currency || 'PKR',
      accountType: 'Current',
      accountPurpose: 'Client Payments',
      isActive: true,
      isDefault: (formData.bankAccounts || []).length === 0,
      showPublicly: true,
      notes: ''
    });
    setIsBankModalOpen(true);
  };

  const handleOpenEditBank = (bank: BankAccountItem) => {
    setEditingBank(bank);
    setBankForm({
      accountName: bank.accountName,
      bankName: bank.bankName,
      accountTitle: bank.accountTitle,
      accountNumber: bank.accountNumber,
      iban: bank.iban,
      branch: bank.branch || '',
      branchCode: bank.branchCode || '',
      swiftBic: bank.swiftBic || '',
      currency: bank.currency || 'PKR',
      accountType: bank.accountType || 'Current',
      accountPurpose: bank.accountPurpose || 'Client Payments',
      isActive: bank.isActive,
      isDefault: bank.isDefault,
      showPublicly: bank.showPublicly,
      notes: bank.notes || ''
    });
    setIsBankModalOpen(true);
  };

  const handleSaveBankItem = (e: React.FormEvent) => {
    e.preventDefault();
    const list = [...(formData.bankAccounts || [])];
    if (editingBank) {
      const updatedList = list.map(b => {
        if (b.id === editingBank.id) {
          return { ...bankForm, id: editingBank.id };
        }
        return bankForm.isDefault ? { ...b, isDefault: false } : b;
      });
      setField('bankAccounts', updatedList);
      if (bankForm.isDefault) {
        setField('bankName', bankForm.bankName);
        setField('accountTitle', bankForm.accountTitle);
        setField('accountNumber', bankForm.accountNumber);
        setField('iban', bankForm.iban);
      }
    } else {
      const newBank: BankAccountItem = {
        ...bankForm,
        id: `bank-${Date.now().toString(36)}`
      };
      const updatedList = bankForm.isDefault
        ? [...list.map(b => ({ ...b, isDefault: false })), newBank]
        : [...list, newBank];
      setField('bankAccounts', updatedList);
      if (newBank.isDefault) {
        setField('bankName', newBank.bankName);
        setField('accountTitle', newBank.accountTitle);
        setField('accountNumber', newBank.accountNumber);
        setField('iban', newBank.iban);
      }
    }
    setIsBankModalOpen(false);
  };

  const handleSetDefaultBank = (id: string) => {
    const list = (formData.bankAccounts || []).map(b => ({
      ...b,
      isDefault: b.id === id
    }));
    const def = list.find(b => b.id === id);
    setField('bankAccounts', list);
    if (def) {
      setField('bankName', def.bankName);
      setField('accountTitle', def.accountTitle);
      setField('accountNumber', def.accountNumber);
      setField('iban', def.iban);
    }
  };

  const handleDeleteBank = (id: string) => {
    const list = (formData.bankAccounts || []).filter(b => b.id !== id);
    setField('bankAccounts', list);
  };

  // Payment Method Handlers
  const handleOpenAddMethod = () => {
    setEditingMethod(null);
    setMethodForm({
      methodName: 'JazzCash',
      displayName: 'JazzCash Mobile Account',
      accountNumber: formData.phone || '0308-4877073',
      instructions: 'Send payment and share screenshot on official WhatsApp.',
      isActive: true,
      showPublicly: true
    });
    setIsMethodModalOpen(true);
  };

  const handleOpenEditMethod = (pm: PaymentMethodItem) => {
    setEditingMethod(pm);
    setMethodForm({
      methodName: pm.methodName,
      displayName: pm.displayName,
      accountNumber: pm.accountNumber || '',
      instructions: pm.instructions || '',
      isActive: pm.isActive,
      showPublicly: pm.showPublicly
    });
    setIsMethodModalOpen(true);
  };

  const handleSaveMethodItem = (e: React.FormEvent) => {
    e.preventDefault();
    const list = [...(formData.paymentMethods || [])];
    if (editingMethod) {
      setField(
        'paymentMethods',
        list.map(m => (m.id === editingMethod.id ? { ...methodForm, id: editingMethod.id } : m))
      );
    } else {
      setField('paymentMethods', [
        ...list,
        { ...methodForm, id: `pm-${Date.now().toString(36)}` }
      ]);
    }
    setIsMethodModalOpen(false);
  };

  const handleDeleteMethod = (id: string) => {
    setField(
      'paymentMethods',
      (formData.paymentMethods || []).filter(m => m.id !== id)
    );
  };

  // Custom Social Links
  const handleAddCustomSocial = () => {
    if (!newSocialPlatform.trim() || !newSocialUrl.trim()) return;
    const item: CustomSocialLink = {
      id: `soc-${Date.now().toString(36)}`,
      platform: newSocialPlatform.trim(),
      url: newSocialUrl.trim(),
      active: true
    };
    setField('customSocialLinks', [...(formData.customSocialLinks || []), item]);
    setNewSocialPlatform('');
    setNewSocialUrl('');
  };

  const handleRemoveCustomSocial = (id: string) => {
    setField(
      'customSocialLinks',
      (formData.customSocialLinks || []).filter(s => s.id !== id)
    );
  };

  // Business Hours helper
  const handleUpdateHour = (index: number, patch: Partial<BusinessHourItem>) => {
    const hours = [...(formData.businessHours || DEFAULT_HOURS)];
    hours[index] = { ...hours[index], ...patch };
    setField('businessHours', hours);
  };

  // User Account Management
  const adminUsers = users.filter(u => u.role === 'ADMIN');
  const staffUsers = users.filter(u => u.role === 'STAFF');

  const handleOpenResetPassword = (u: User) => {
    setTargetUser(u);
    setNewPassword('');
    setIsResetModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !newPassword) return;
    setIsResetting(true);
    try {
      await resetUserPassword(targetUser.id, newPassword);
      setIsResetModalOpen(false);
      setTargetUser(null);
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleStatus = async (u: User) => {
    const nextStatus = u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    await updateUserStatus(u.id, nextStatus);
  };

  const handleDeleteUserConfirm = async () => {
    if (!targetUser) return;
    await deleteUser(targetUser.id);
    setTargetUser(null);
    setIsDeleteDialogOpen(false);
  };

  const navTabs: Array<{ id: ProfileTab; label: string; icon: React.ElementType }> = [
    { id: 'IDENTITY', label: 'Business Info', icon: Building },
    { id: 'THEME', label: 'Theme & Appearance', icon: Palette },
    { id: 'ADDRESS', label: 'Address & Map', icon: MapPin },
    { id: 'CONTACT', label: 'Contact & Emails', icon: Phone },
    { id: 'SOCIAL', label: 'Social Media', icon: Share2 },
    { id: 'BRANDING', label: 'Logos & Branding', icon: ImageIcon },
    { id: 'DOCUMENTS', label: 'Stationery & Docs', icon: FileText },
    { id: 'BANKING', label: 'Bank & Payments', icon: CreditCard },
    { id: 'HOURS', label: 'Business Hours', icon: Clock },
    { id: 'LEGAL', label: 'Tax & Legal', icon: Scale },
    { id: 'SEO', label: 'Website & SEO', icon: Globe },
    { id: 'USERS', label: `Users (${users.length})`, icon: Shield },
    { id: 'AUDIT', label: 'Audit & Reset', icon: History }
  ];

  const updateThemeField = <K extends keyof StudioThemeConfig>(
    key: K,
    value: StudioThemeConfig[K]
  ) => {
    const currentTheme: StudioThemeConfig = {
      ...DEFAULT_STUDIO_THEME,
      ...(formData.themeConfig || liveThemeConfig)
    };
    const nextTheme: StudioThemeConfig = {
      ...currentTheme,
      [key]: value
    };
    setField('themeConfig', nextTheme);
    previewThemeConfig({ [key]: value });
  };

  const applyThemePreset = (presetId: string) => {
    const preset = STUDIO_THEME_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const currentTheme: StudioThemeConfig = {
      ...DEFAULT_STUDIO_THEME,
      ...(formData.themeConfig || liveThemeConfig)
    };
    const nextTheme: StudioThemeConfig = {
      ...currentTheme,
      ...preset.config,
      presetId: preset.id
    };
    setField('themeConfig', nextTheme);
    previewThemeConfig(nextTheme);
    addToast(`Applied '${preset.name}' theme preset. Click Save to persist across all sessions.`, 'info');
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Authoritative Studio Profile Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0 overflow-hidden p-1.5">
            <img
              src={formData.primaryLogo || formData.logo || '/RoyalLogo.png'}
              alt={formData.studioName || 'Royal Studio'}
              className="w-full h-full object-contain"
              onError={e => {
                (e.target as HTMLImageElement).src = '/logo.png';
              }}
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-white">
                {formData.studioName || 'Royal Studio'} — Centralized Studio Profile
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 rounded-full">
                Single Source of Truth
              </span>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  formData.businessStatus === 'Holiday'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : formData.businessStatus === 'Temporarily Closed'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {formData.businessStatus || 'Active'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {formData.address ||
                'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan'}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-amber-400 font-mono mt-1">
              <span>Primary: {formData.phone || '0308-4877073'}</span>
              <span>•</span>
              <span>Secondary: {formData.phone2 || '0303-2213806'}</span>
              <span>•</span>
              <span>{formData.email || 'royalstudio089@gmail.com'}</span>
            </div>
          </div>
        </div>

        {isAdmin && activeTab !== 'USERS' && activeTab !== 'AUDIT' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSaveProfile()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Profile...' : 'Save Studio Profile'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Section Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-amber-400 shadow-sm border border-slate-800'
                  : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BASIC BUSINESS INFORMATION */}
      {activeTab === 'IDENTITY' && (
        <form onSubmit={e => handleSaveProfile(e, 'Basic Business Information')} className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Building className="w-4 h-4 text-amber-600" />
                <span>A. Basic Business & Studio Identity</span>
              </div>
              <span className="text-[11px] text-gray-500">
                Used across Navbar, Footer, Invoices, Quotations, Reports & Public Website
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Business / Studio Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.studioName || ''}
                  onChange={e => setField('studioName', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Legal / Registered Name
                </label>
                <input
                  type="text"
                  value={formData.legalName || ''}
                  onChange={e => setField('legalName', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Royal Studio Photography & Cinematic Films"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Short Name</label>
                <input
                  type="text"
                  value={formData.shortName || ''}
                  onChange={e => setField('shortName', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Royal Studio"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Business Type</label>
                <input
                  type="text"
                  value={formData.businessType || ''}
                  onChange={e => setField('businessType', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Luxury Photography & Cinematography Studio"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Business Category</label>
                <input
                  type="text"
                  value={formData.businessCategory || ''}
                  onChange={e => setField('businessCategory', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Wedding Photography, Cinematography & Brand Shoots"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Founded / Established Year
                </label>
                <input
                  type="text"
                  value={formData.establishedYear || ''}
                  onChange={e => setField('establishedYear', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="2018"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Primary Contact Person / Founders
                </label>
                <input
                  type="text"
                  value={formData.primaryContactPerson || ''}
                  onChange={e => setField('primaryContactPerson', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Talha Ramay & Muhammad Ramzan"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.designation || ''}
                  onChange={e => setField('designation', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Co-Founders & Creative Directors"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Business Status</label>
                <select
                  value={formData.businessStatus || 'Active'}
                  onChange={e => setField('businessStatus', e.target.value as any)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold"
                >
                  <option value="Active">Active (Open for Bookings)</option>
                  <option value="Holiday">Holiday Schedule</option>
                  <option value="Temporarily Closed">Temporarily Closed</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Official Tagline *
                </label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={e => setField('tagline', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Luxury wedding photography, cinematic films, and brand shoots."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Short Business Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={e => setField('description', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  About Studio (Full Narrative)
                </label>
                <textarea
                  rows={3}
                  value={formData.aboutStudio || ''}
                  onChange={e => setField('aboutStudio', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Business Identity'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB: THEME & APPEARANCE CUSTOMIZATION */}
      {activeTab === 'THEME' && (
        <form onSubmit={e => handleSaveProfile(e, 'Theme & Appearance Settings')} className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Palette className="w-4 h-4 text-amber-600" />
                  <span>Unified Studio Theme & Appearance Customizer</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Customize Light & Dark mode, brand colors, editorial typography, sidebar aesthetics, and corner geometry across both the Admin ERP Portal and the Public Portfolio Website.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleThemeMode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  {resolvedMode === 'dark' ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Switch to Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-amber-600" />
                      <span>Switch to Dark</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setField('themeConfig', DEFAULT_STUDIO_THEME);
                    previewThemeConfig(DEFAULT_STUDIO_THEME);
                    addToast('Restored default Royal Champagne Gold theme.', 'info');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default Theme</span>
                </button>
              </div>
            </div>

            {/* 1. Color Mode Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800">
                1. Default Studio Color Mode (Light / Dark / System)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    {
                      id: 'light',
                      label: 'Editorial Light Mode',
                      desc: 'Warm alabaster canvas with crisp gallery surfaces & gold accents',
                      icon: Sun
                    },
                    {
                      id: 'dark',
                      label: 'Obsidian Dark Mode',
                      desc: 'Deep cinema obsidian with elevated charcoal cards & luminous gold',
                      icon: Moon
                    },
                    {
                      id: 'system',
                      label: 'System Automatic',
                      desc: 'Automatically adapts to visitor or administrator OS preference',
                      icon: Monitor
                    }
                  ] as const
                ).map(modeOption => {
                  const Icon = modeOption.icon;
                  const currentMode = formData.themeConfig?.mode || liveThemeConfig.mode || 'light';
                  const active = currentMode === modeOption.id;
                  return (
                    <button
                      key={modeOption.id}
                      type="button"
                      onClick={() => {
                        updateThemeField('mode', modeOption.id);
                        setThemeMode(modeOption.id);
                      }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/40'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="inline-flex items-center gap-2 text-xs font-bold text-gray-900">
                          <Icon className="w-4 h-4 text-amber-500" />
                          <span>{modeOption.label}</span>
                        </span>
                        {active && <Check className="w-4 h-4 text-amber-600" />}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">{modeOption.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Curated Luxury Theme Presets */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-800">
                2. Curated Luxury Studio Palettes (1-Click Presets)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {STUDIO_THEME_PRESETS.map(preset => {
                  const isSelected =
                    (formData.themeConfig?.presetId || liveThemeConfig.presetId) === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyThemePreset(preset.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/40'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span
                            className="w-5 h-5 rounded-full border border-black/15 shadow-2xs"
                            style={{ backgroundColor: preset.config.accentColor }}
                          />
                          <span
                            className="w-5 h-5 rounded-full border border-black/15 shadow-2xs"
                            style={{ backgroundColor: preset.config.primaryColor }}
                          />
                          <span
                            className="w-5 h-5 rounded-full border border-black/15 shadow-2xs"
                            style={{ backgroundColor: preset.config.backgroundLight }}
                          />
                          <span
                            className="w-5 h-5 rounded-full border border-white/20 shadow-2xs"
                            style={{ backgroundColor: preset.config.backgroundDark }}
                          />
                        </div>
                        <div className="text-xs font-bold text-gray-900">{preset.name}</div>
                        <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">
                          {preset.subtitle}
                        </p>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[10px] font-semibold text-amber-700">
                        <span>{isSelected ? 'Active Palette' : 'Apply Preset'}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Custom Brand & Surface Color Pickers */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-800">
                3. Custom Brand Accent & Surface Colors (Live Preview)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(
                  [
                    {
                      key: 'accentColor',
                      label: 'Primary Brand Accent (Gold)',
                      fallback: '#c9a76a'
                    },
                    {
                      key: 'accentLight',
                      label: 'Accent Highlight / Hover',
                      fallback: '#d4b87a'
                    },
                    {
                      key: 'accentDark',
                      label: 'Deep Accent / Active',
                      fallback: '#b08f4f'
                    },
                    {
                      key: 'primaryColor',
                      label: 'Primary Obsidian / Charcoal',
                      fallback: '#111111'
                    },
                    {
                      key: 'backgroundLight',
                      label: 'Light Mode Canvas Background',
                      fallback: '#f8f8f8'
                    },
                    {
                      key: 'surfaceLight',
                      label: 'Light Mode Card Surface',
                      fallback: '#ffffff'
                    },
                    {
                      key: 'backgroundDark',
                      label: 'Dark Mode Obsidian Canvas',
                      fallback: '#0d0d0d'
                    },
                    {
                      key: 'surfaceDark',
                      label: 'Dark Mode Elevated Card Surface',
                      fallback: '#161616'
                    }
                  ] as const
                ).map(item => {
                  const val =
                    (formData.themeConfig?.[item.key] as string) ||
                    (liveThemeConfig[item.key] as string) ||
                    item.fallback;
                  return (
                    <div
                      key={item.key}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2"
                    >
                      <label className="block text-[11px] font-semibold text-gray-700">
                        {item.label}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={val}
                          onChange={e => {
                            updateThemeField('presetId', 'custom');
                            updateThemeField(item.key, e.target.value);
                          }}
                          disabled={!isAdmin}
                          className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer shrink-0 bg-transparent p-0.5"
                        />
                        <input
                          type="text"
                          value={val}
                          onChange={e => {
                            updateThemeField('presetId', 'custom');
                            updateThemeField(item.key, e.target.value);
                          }}
                          disabled={!isAdmin}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Typography, Sidebar Style & Corner Geometry */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Display Heading Font
                </label>
                <select
                  value={formData.themeConfig?.headingFont || liveThemeConfig.headingFont || 'Cormorant Garamond'}
                  onChange={e => updateThemeField('headingFont', e.target.value as any)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold"
                >
                  <option value="Cormorant Garamond">Cormorant Garamond (Portfolio Serif)</option>
                  <option value="Playfair Display">Playfair Display (Editorial Serif)</option>
                  <option value="Cinzel">Cinzel (Classical Luxury)</option>
                  <option value="Inter">Inter (Modern Sans)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Body & UI Font
                </label>
                <select
                  value={formData.themeConfig?.bodyFont || liveThemeConfig.bodyFont || 'Inter'}
                  onChange={e => updateThemeField('bodyFont', e.target.value as any)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold"
                >
                  <option value="Inter">Inter (Clean Studio Sans)</option>
                  <option value="Poppins">Poppins (Geometric Modern)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Admin Sidebar Style
                </label>
                <select
                  value={formData.themeConfig?.sidebarStyle || liveThemeConfig.sidebarStyle || 'obsidian'}
                  onChange={e => updateThemeField('sidebarStyle', e.target.value as any)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold"
                >
                  <option value="obsidian">Signature Obsidian (Always Dark)</option>
                  <option value="editorial">Adaptive Editorial Surface</option>
                  <option value="glass">Translucent Studio Glass</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Card & Button Corner Radius
                </label>
                <select
                  value={formData.themeConfig?.borderRadius || liveThemeConfig.borderRadius || 'editorial'}
                  onChange={e => updateThemeField('borderRadius', e.target.value as any)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold"
                >
                  <option value="editorial">Editorial Classic (12px)</option>
                  <option value="sharp">Architectural Sharp (2px)</option>
                  <option value="rounded">Soft Modern (16px)</option>
                </select>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Theme...' : 'Save Studio Theme & Appearance'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 2: COMPLETE ADDRESS MANAGEMENT */}
      {activeTab === 'ADDRESS' && (
        <form onSubmit={e => handleSaveProfile(e, 'Address & Location Management')} className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Official Studio Address & Coordinates</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const official =
                    'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan';
                  setField('address', official);
                  setField('publicDisplayAddress', official);
                  setField('addressLine1', 'Al Jannat Town Entrance, Canal Bungalow Road');
                  setField('addressLine2', 'Opposite Habib Mall');
                  setField('area', 'Canal Bungalow Road / Al Jannat Town');
                  setField('landmark', 'Opposite Habib Mall');
                  setField('city', 'Burewala');
                  setField('district', 'Burewala');
                  setField('province', 'Punjab');
                  setField('country', 'Pakistan');
                  setField('postalCode', '61010');
                  setField('googleMapsUrl', 'https://maps.app.goo.gl/mQPek7wm4nCVjy8o9');
                  addToast('Populated official Burewala studio address.', 'info');
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
              >
                Fill Official Burewala Address
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Authoritative Full Studio Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address || ''}
                  onChange={e => {
                    setField('address', e.target.value);
                    setField('publicDisplayAddress', e.target.value);
                  }}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-amber-50/40 border border-amber-300 rounded-lg text-xs font-semibold text-gray-900"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Public Display Address (Shown on Website, Invoices & Quotations)
                </label>
                <input
                  type="text"
                  value={formData.publicDisplayAddress || formData.address || ''}
                  onChange={e => setField('publicDisplayAddress', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={formData.addressLine1 || ''}
                  onChange={e => setField('addressLine1', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Al Jannat Town Entrance, Canal Bungalow Road"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={formData.addressLine2 || ''}
                  onChange={e => setField('addressLine2', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Opposite Habib Mall"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Area / Sector</label>
                <input
                  type="text"
                  value={formData.area || ''}
                  onChange={e => setField('area', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Canal Bungalow Road"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Famous Landmark</label>
                <input
                  type="text"
                  value={formData.landmark || ''}
                  onChange={e => setField('landmark', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Opposite Habib Mall"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city || ''}
                  onChange={e => setField('city', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Burewala"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">District</label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={e => setField('district', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Burewala"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Province / State</label>
                <input
                  type="text"
                  value={formData.province || ''}
                  onChange={e => setField('province', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Punjab"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country || ''}
                  onChange={e => setField('country', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Pakistan"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Postal / ZIP Code</label>
                <input
                  type="text"
                  value={formData.postalCode || ''}
                  onChange={e => setField('postalCode', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="61010"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Official Google Maps Pin URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.googleMapsUrl || ''}
                    onChange={e => setField('googleMapsUrl', e.target.value)}
                    disabled={!isAdmin}
                    placeholder="https://maps.app.goo.gl/mQPek7wm4nCVjy8o9"
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                  />
                  {formData.googleMapsUrl && (
                    <a
                      href={formData.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold shrink-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Open Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude || ''}
                    onChange={e => setField('latitude', e.target.value)}
                    disabled={!isAdmin}
                    placeholder="30.1667"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude || ''}
                    onChange={e => setField('longitude', e.target.value)}
                    disabled={!isAdmin}
                    placeholder="72.6833"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Address & Map Settings'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 3: CONTACT & COMMUNICATION INFORMATION */}
      {activeTab === 'CONTACT' && (
        <form onSubmit={e => handleSaveProfile(e, 'Contact & Email Settings')} className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-slate-900 font-bold text-sm">
              <Phone className="w-4 h-4 text-amber-600" />
              <span>Phone Numbers, WhatsApp & Official Emails</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Phone *</label>
                <input
                  type="text"
                  required
                  value={formData.phone || ''}
                  onChange={e => setField('phone', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="0308-4877073"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Secondary Phone</label>
                <input
                  type="text"
                  value={formData.phone2 || ''}
                  onChange={e => setField('phone2', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="0303-2213806"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Official WhatsApp Number</label>
                <input
                  type="text"
                  value={formData.whatsapp || ''}
                  onChange={e => setField('whatsapp', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="0308-4877073"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Public Contact Number</label>
                <input
                  type="text"
                  value={formData.publicContactNumber || ''}
                  onChange={e => setField('publicContactNumber', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="0308-4877073"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Public WhatsApp Number</label>
                <input
                  type="text"
                  value={formData.publicWhatsappNumber || ''}
                  onChange={e => setField('publicWhatsappNumber', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="0308-4877073"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergencyContact || ''}
                  onChange={e => setField('emergencyContact', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="0303-2213806"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Business Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={e => setField('email', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="royalstudio089@gmail.com"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Secondary Email</label>
                <input
                  type="email"
                  value={formData.secondaryEmail || ''}
                  onChange={e => setField('secondaryEmail', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Booking Inquiries Email</label>
                <input
                  type="email"
                  value={formData.bookingEmail || ''}
                  onChange={e => setField('bookingEmail', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Support / Client Care Email</label>
                <input
                  type="email"
                  value={formData.supportEmail || ''}
                  onChange={e => setField('supportEmail', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Accounts & Billing Email</label>
                <input
                  type="email"
                  value={formData.accountsEmail || ''}
                  onChange={e => setField('accountsEmail', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Official Website URL</label>
                <input
                  type="text"
                  value={formData.website || ''}
                  onChange={e => setField('website', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="https://royalstudio.online"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Display Name</label>
                <input
                  type="text"
                  value={formData.emailDisplayName || ''}
                  onChange={e => setField('emailDisplayName', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Royal Studio Official"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Standard Email Signature</label>
                <input
                  type="text"
                  value={formData.emailSignature || ''}
                  onChange={e => setField('emailSignature', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Contact Information'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 4: SOCIAL MEDIA MANAGEMENT */}
      {activeTab === 'SOCIAL' && (
        <form onSubmit={e => handleSaveProfile(e, 'Social Media Accounts')} className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-slate-900 font-bold text-sm">
              <Share2 className="w-4 h-4 text-amber-600" />
              <span>Official Social Media Channels</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  { key: 'facebook', label: 'Facebook Page URL', placeholder: 'https://www.facebook.com/royalstudio089' },
                  { key: 'instagram', label: 'Instagram Profile URL', placeholder: 'https://www.instagram.com/royalstudio089' },
                  { key: 'youtube', label: 'YouTube Channel URL', placeholder: 'https://www.youtube.com/@royalstudio089' },
                  { key: 'tiktok', label: 'TikTok Profile URL', placeholder: 'https://www.tiktok.com/@royalstudio089' },
                  { key: 'linkedin', label: 'LinkedIn URL', placeholder: 'https://www.linkedin.com/company/royalstudio' },
                  { key: 'pinterest', label: 'Pinterest URL', placeholder: 'https://www.pinterest.com/royalstudio089' },
                  { key: 'twitter', label: 'X / Twitter URL', placeholder: 'https://x.com/royalstudio089' }
                ] as const
              ).map(item => {
                const val = (formData[item.key] as string) || '';
                return (
                  <div key={item.key}>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{item.label}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={val}
                        onChange={e => setField(item.key, e.target.value)}
                        disabled={!isAdmin}
                        placeholder={item.placeholder}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                      />
                      {val && (
                        <a
                          href={val.startsWith('http') ? val : `https://${val}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold shrink-0 inline-flex items-center gap-1"
                        >
                          <span>Visit</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Social Links */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="text-xs font-bold text-gray-800">Additional Custom Social / Portfolio Links</div>
              {(formData.customSocialLinks || []).length > 0 && (
                <div className="space-y-2">
                  {(formData.customSocialLinks || []).map(link => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-bold text-gray-900 px-2 py-0.5 bg-white border border-gray-200 rounded">
                          {link.platform}
                        </span>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate font-mono"
                        >
                          {link.url}
                        </a>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSocial(link.id)}
                          className="p-1 text-gray-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newSocialPlatform}
                    onChange={e => setNewSocialPlatform(e.target.value)}
                    placeholder="Platform name (e.g. Vimeo, Behance)"
                    className="sm:w-48 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    value={newSocialUrl}
                    onChange={e => setNewSocialUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSocial}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0"
                  >
                    + Add Link
                  </button>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Social Media Links'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 5: BRANDING, LOGOS & STAMPS */}
      {activeTab === 'BRANDING' && (
        <form onSubmit={e => handleSaveProfile(e, 'Branding & Logos')} className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>Official Studio Logos, Icons, Stamp & Signature</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span>Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setField('logo', '/RoyalLogo.png');
                    setField('primaryLogo', '/RoyalLogo.png');
                    setField('documentLogo', '/RoyalLogo.png');
                    setField('websiteLogo', '/logo.png');
                    addToast('Applied official Royal Studio logos.', 'info');
                  }}
                  className="px-2 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded font-semibold hover:bg-amber-100 cursor-pointer"
                >
                  Use Official RoyalLogo.png
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(
                [
                  { key: 'primaryLogo', label: 'Primary Studio Logo (Admin & Header)', fallback: '/RoyalLogo.png' },
                  { key: 'websiteLogo', label: 'Public Website Logo (Navbar & Footer)', fallback: '/logo.png' },
                  { key: 'documentLogo', label: 'Invoice & Quotation Document Logo', fallback: '/RoyalLogo.png' },
                  { key: 'darkLogo', label: 'Dark Theme Logo', fallback: '/RoyalLogo.png' },
                  { key: 'favicon', label: 'Browser Favicon / App Icon', fallback: '/icon.png' },
                  { key: 'stampImage', label: 'Official Studio Stamp / Seal Image (Optional)', fallback: '' },
                  { key: 'signatureImage', label: 'Authorized Digital Signature Image (Optional)', fallback: '' },
                  { key: 'socialCoverImage', label: 'Social / Brand Cover Banner', fallback: '/image.png' }
                ] as const
              ).map(asset => {
                const currentUrl = (formData[asset.key] as string) || asset.fallback;
                return (
                  <div key={asset.key} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-800">{asset.label}</label>
                      {currentUrl && (
                        <button
                          type="button"
                          onClick={() => setField(asset.key, '')}
                          className="text-[10px] text-rose-600 hover:underline font-semibold"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 p-1">
                        {currentUrl ? (
                          <img
                            src={currentUrl}
                            alt={asset.label}
                            className="max-w-full max-h-full object-contain"
                            onError={e => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400 text-center">None</span>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={(formData[asset.key] as string) ?? ''}
                          onChange={e => setField(asset.key, e.target.value)}
                          disabled={!isAdmin}
                          placeholder={asset.fallback || 'Paste image URL or upload file...'}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                        />
                        {isAdmin && (
                          <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-[11px] font-semibold cursor-pointer">
                            <Upload className="w-3 h-3 text-amber-600" />
                            <span>Upload Image File</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => handleImageUpload(asset.key, e.target.files?.[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Branding & Logos'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 6: DOCUMENT BRANDING & STATIONERY */}
      {activeTab === 'DOCUMENTS' && (
        <form onSubmit={e => handleSaveProfile(e, 'Document Branding & Terms')} className="space-y-6">
          {/* Interactive Document Background Studio & Live A4 Preview */}
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Official Document Background Page &amp; Stationery Customizer</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your official A4 stationery (<span className="font-mono font-semibold text-gray-800">/01.jpg</span>) is applied as-is by default across Invoices, Quotations, Receipts, Dossiers, and Call Sheets. Upload a new background or customize layout, opacity, and styling below.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      documentBackground: '/01.jpg',
                      invoiceBackground: '/01.jpg',
                      quotationBackground: '/01.jpg',
                      receiptBackground: '/01.jpg',
                      documentShowBackground: true,
                      documentBackgroundFit: 'as-is',
                      documentBackgroundOpacity: 100,
                      documentPageFillColor: '#efece4',
                      documentShowHeaderLogo: true,
                      documentHeaderLogoHeight: 16,
                      documentAccentColor: '#a58137',
                      documentTableStyle: 'transparent',
                    }));
                    addToast('Restored official 01.jpg document background (As-Is). Click Save Document Settings to persist.', 'info');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Use Official 01.jpg (As-Is)</span>
                </button>
                <button
                  type="button"
                  onClick={() => generateSampleStationeryPDF({ ...(profile as AdminProfile), ...formData }, 'INVOICE')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  <span>Test Sample Invoice PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => generateSampleStationeryPDF({ ...(profile as AdminProfile), ...formData }, 'QUOTATION')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-slate-800 border border-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  <span>Test Sample Quotation PDF</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT 7 COLS: UPLOAD & CUSTOMIZATION CONTROLS */}
              <div className="lg:col-span-7 space-y-5">
                {/* Master Document Background Upload Card */}
                <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        1. Master Document Background Image (Default: /01.jpg)
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Upload any custom A4 background page (JPG, PNG, WEBP) or use the official <code className="font-mono font-bold">/01.jpg</code> stationery as-is.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                      {formData.documentShowBackground !== false ? 'Active on PDFs' : 'Hidden'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={formData.documentBackground || '/01.jpg'}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          documentBackground: val,
                          invoiceBackground: val,
                          quotationBackground: val,
                          receiptBackground: val,
                        }));
                      }}
                      disabled={!isAdmin}
                      placeholder="/01.jpg or paste image URL / data URI..."
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                    />
                    {isAdmin && (
                      <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0 shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>Upload Custom Background</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleImageUpload('documentBackground', e.target.files?.[0], true)}
                        />
                      </label>
                    )}
                  </div>

                  {/* Quick Background Style Presets */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-gray-500">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          documentBackground: '/01.jpg',
                          invoiceBackground: '/01.jpg',
                          quotationBackground: '/01.jpg',
                          receiptBackground: '/01.jpg',
                          documentShowBackground: true,
                          documentBackgroundFit: 'as-is',
                          documentBackgroundOpacity: 100,
                          documentPageFillColor: '#efece4',
                          documentTableStyle: 'transparent',
                        }));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        (formData.documentBackground || '/01.jpg') === '/01.jpg' &&
                        formData.documentShowBackground !== false &&
                        (formData.documentBackgroundOpacity ?? 100) === 100
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Official 01.jpg (100% As-Is)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          documentBackground: '/01.jpg',
                          invoiceBackground: '/01.jpg',
                          quotationBackground: '/01.jpg',
                          receiptBackground: '/01.jpg',
                          documentShowBackground: true,
                          documentBackgroundFit: 'as-is',
                          documentBackgroundOpacity: 65,
                          documentPageFillColor: '#efece4',
                          documentTableStyle: 'transparent',
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer"
                    >
                      Soft 01.jpg Watermark (65%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          documentShowBackground: false,
                          documentPageFillColor: '#efece4',
                          documentTableStyle: 'transparent',
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer"
                    >
                      Plain Warm Cream (#efece4)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          documentShowBackground: false,
                          documentPageFillColor: '#ffffff',
                          documentTableStyle: 'solid-white',
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 cursor-pointer"
                    >
                      Pure White Minimal
                    </button>
                  </div>
                </div>

                {/* Layout, Opacity, Table & Color Customization Grid */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. Background Placement, Opacity &amp; Overlay Customization
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Background Fit &amp; Placement Mode
                      </label>
                      <select
                        value={formData.documentBackgroundFit || 'as-is'}
                        onChange={e => setField('documentBackgroundFit', e.target.value as any)}
                        disabled={!isAdmin}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
                      >
                        <option value="as-is">Full A4 Page As-Is (210mm × 297mm Exact)</option>
                        <option value="contain">Fit Proportionally Inside Page</option>
                        <option value="top-banner">Top Stationery Graphic Only</option>
                        <option value="center-watermark">Centered Emblem Watermark</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Table Row Background Style
                      </label>
                      <select
                        value={formData.documentTableStyle || 'transparent'}
                        onChange={e => setField('documentTableStyle', e.target.value as any)}
                        disabled={!isAdmin}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
                      >
                        <option value="transparent">Transparent Rows (Show 01.jpg Background As-Is)</option>
                        <option value="cream">Soft Warm Cream Rows</option>
                        <option value="solid-white">Solid White Table Rows</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-gray-700">
                          Background Image Opacity
                        </label>
                        <span className="text-xs font-mono font-bold text-amber-700">
                          {formData.documentBackgroundOpacity ?? 100}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={formData.documentBackgroundOpacity ?? 100}
                        onChange={e => setField('documentBackgroundOpacity', Number(e.target.value))}
                        disabled={!isAdmin}
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>10% (Faint)</span>
                        <span>100% (Original As-Is)</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-gray-700">
                          Top-Left Header Logo Size (mm)
                        </label>
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {formData.documentHeaderLogoHeight ?? 16} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={28}
                        step={1}
                        value={formData.documentHeaderLogoHeight ?? 16}
                        onChange={e => setField('documentHeaderLogoHeight', Number(e.target.value))}
                        disabled={!isAdmin}
                        className="w-full accent-slate-900 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Compact (10mm)</span>
                        <span>Large (28mm)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Base Page Paper Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.documentPageFillColor || '#efece4'}
                          onChange={e => setField('documentPageFillColor', e.target.value)}
                          disabled={!isAdmin}
                          className="w-9 h-9 rounded border border-gray-300 cursor-pointer bg-white p-0.5"
                        />
                        <input
                          type="text"
                          value={formData.documentPageFillColor || '#efece4'}
                          onChange={e => setField('documentPageFillColor', e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Document Heading &amp; Accent Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.documentAccentColor || '#a58137'}
                          onChange={e => setField('documentAccentColor', e.target.value)}
                          disabled={!isAdmin}
                          className="w-9 h-9 rounded border border-gray-300 cursor-pointer bg-white p-0.5"
                        />
                        <input
                          type="text"
                          value={formData.documentAccentColor || '#a58137'}
                          onChange={e => setField('documentAccentColor', e.target.value)}
                          disabled={!isAdmin}
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-gray-200/80">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.documentShowBackground !== false}
                        onChange={e => setField('documentShowBackground', e.target.checked)}
                        disabled={!isAdmin}
                        className="rounded border-gray-300"
                      />
                      <span>Enable Document Background Image on PDFs</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.documentShowHeaderLogo !== false}
                        onChange={e => setField('documentShowHeaderLogo', e.target.checked)}
                        disabled={!isAdmin}
                        className="rounded border-gray-300"
                      />
                      <span>Show Top-Left RoyalLogo.png Emblem on PDFs</span>
                    </label>
                  </div>
                </div>

                {/* Per-Document Type Background Overrides */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. Per-Document Background Overrides (Optional)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(
                      [
                        { key: 'invoiceBackground', label: 'Invoice PDF Background' },
                        { key: 'quotationBackground', label: 'Quotation PDF Background' },
                        { key: 'receiptBackground', label: 'Receipt PDF Background' },
                      ] as const
                    ).map(item => (
                      <div key={item.key} className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
                        <label className="block text-[11px] font-bold text-gray-800">{item.label}</label>
                        <input
                          type="text"
                          value={(formData[item.key] as string) || formData.documentBackground || '/01.jpg'}
                          onChange={e => setField(item.key, e.target.value)}
                          disabled={!isAdmin}
                          className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-[11px] font-mono"
                        />
                        {isAdmin && (
                          <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px] font-semibold cursor-pointer">
                            <Upload className="w-3 h-3 text-amber-600" />
                            <span>Upload Custom</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => handleImageUpload(item.key, e.target.files?.[0], false)}
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT 5 COLS: LIVE A4 PORTRAIT DOCUMENT PREVIEW */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[360px] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Live A4 Stationery Preview</span>
                    <span className="text-[11px] font-mono text-gray-500">210mm × 297mm (A4)</span>
                  </div>

                  {/* A4 Aspect Ratio Sheet */}
                  <div
                    className="relative w-full aspect-[1/1.414] rounded-xl border-2 border-gray-300 shadow-lg overflow-hidden select-none"
                    style={{
                      backgroundColor: formData.documentPageFillColor || '#efece4',
                    }}
                  >
                    {/* Background Image Layer (01.jpg As-Is by default) */}
                    {formData.documentShowBackground !== false && (
                      <img
                        src={formData.documentBackground || '/01.jpg'}
                        alt="Document Stationery Background"
                        className={`absolute inset-0 w-full h-full pointer-events-none transition-all ${
                          formData.documentBackgroundFit === 'contain'
                            ? 'object-contain'
                            : formData.documentBackgroundFit === 'top-banner'
                            ? 'object-contain object-top'
                            : formData.documentBackgroundFit === 'center-watermark'
                            ? 'object-contain scale-75'
                            : 'object-fill'
                        }`}
                        style={{
                          opacity: (formData.documentBackgroundOpacity ?? 100) / 100,
                        }}
                      />
                    )}

                    {/* Simulated Official PDF Content Overlay */}
                    <div className="relative z-10 p-4 h-full flex flex-col justify-between text-[9px] text-slate-900">
                      <div className="space-y-2.5">
                        {/* Top Timestamp Bar */}
                        <div className="flex items-center justify-between text-[7px] text-gray-500 border-b border-gray-300/80 pb-1">
                          <span>05/10/2026, 16:30</span>
                          <span>{formData.studioName || 'Royal Studio'} — Official INVOICE</span>
                        </div>

                        {/* Header Logo + Title + Stamp */}
                        <div className="flex items-start justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-2">
                            {formData.documentShowHeaderLogo !== false && (
                              <img
                                src={formData.documentLogo || formData.primaryLogo || '/RoyalLogo.png'}
                                alt="Logo"
                                className="object-contain shrink-0"
                                style={{
                                  height: `${Math.round((formData.documentHeaderLogoHeight ?? 16) * 1.4)}px`,
                                }}
                              />
                            )}
                            <div>
                              <div className="text-sm font-black tracking-tight text-slate-900 leading-none">
                                INVOICE
                              </div>
                              <div
                                className="text-[7px] font-bold uppercase tracking-wider mt-0.5"
                                style={{ color: formData.documentAccentColor || '#a58137' }}
                              >
                                {formData.letterheadText || 'ROYAL STUDIO — PHOTOGRAPHY & FILMS'}
                              </div>
                            </div>
                          </div>
                          <div className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-500 text-emerald-800 font-bold text-[7px]">
                            PAID IN FULL
                          </div>
                        </div>

                        {/* Bill To / From */}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[7.5px]">
                          <div>
                            <div
                              className="font-bold uppercase text-[6.5px]"
                              style={{ color: formData.documentAccentColor || '#a58137' }}
                            >
                              BILL TO (CLIENT)
                            </div>
                            <div className="font-bold text-slate-900">Ahsan &amp; Zoya Family</div>
                            <div className="text-gray-600">Royal Palm Marquee, Burewala</div>
                          </div>
                          <div>
                            <div
                              className="font-bold uppercase text-[6.5px]"
                              style={{ color: formData.documentAccentColor || '#a58137' }}
                            >
                              FROM (OFFICIAL STUDIO)
                            </div>
                            <div className="font-bold text-slate-900">{formData.studioName || 'Royal Studio'}</div>
                            <div className="text-gray-600 truncate">{formData.phone || '0308-4877073'}</div>
                          </div>
                        </div>

                        {/* Sample Table */}
                        <div className="mt-2 border border-slate-400/60 rounded overflow-hidden">
                          <div className="bg-slate-900 text-white font-bold px-2 py-1 flex justify-between text-[7px]">
                            <span>SERVICES &amp; COVERAGE DETAILS</span>
                            <span>AMOUNT</span>
                          </div>
                          <div
                            className={`px-2 py-1.5 border-b border-slate-300/60 flex justify-between text-[7.5px] ${
                              formData.documentTableStyle === 'solid-white'
                                ? 'bg-white'
                                : formData.documentTableStyle === 'cream'
                                ? 'bg-[#f5f2eb]'
                                : 'bg-transparent'
                            }`}
                          >
                            <span>Day 1: Barat Cinema &amp; Portrait Coverage</span>
                            <span className="font-bold">PKR 155,000</span>
                          </div>
                          <div
                            className={`px-2 py-1.5 flex justify-between text-[7.5px] ${
                              formData.documentTableStyle === 'solid-white'
                                ? 'bg-white'
                                : formData.documentTableStyle === 'cream'
                                ? 'bg-[#f5f2eb]'
                                : 'bg-transparent'
                            }`}
                          >
                            <span>Day 2: Walima Reception &amp; 4K Drone</span>
                            <span className="font-bold">PKR 130,000</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-2 border-t border-gray-300/70 text-center text-[7px] font-semibold text-gray-600">
                        {formData.documentFooterText ||
                          'Thank you for choosing Royal Studio. We Capture Your Memories!'}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-center text-gray-500">
                    The preview above reflects your live <code className="font-mono font-bold">/01.jpg</code> background &amp; table transparency settings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-slate-900 font-bold text-sm">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>Document Numbering, Letterhead Text &amp; Contract Terms</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  value={formData.invoicePrefix || ''}
                  onChange={e => setField('invoicePrefix', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="RS-INV-"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quotation Number Prefix</label>
                <input
                  type="text"
                  value={formData.quotationPrefix || ''}
                  onChange={e => setField('quotationPrefix', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="RS-QUO-"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Active Document Background Path
                </label>
                <input
                  type="text"
                  value={formData.documentBackground || '/01.jpg'}
                  onChange={e => {
                    setField('documentBackground', e.target.value);
                    setField('invoiceBackground', e.target.value);
                    setField('quotationBackground', e.target.value);
                    setField('receiptBackground', e.target.value);
                  }}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Letterhead Subtitle Text</label>
                <input
                  type="text"
                  value={formData.letterheadText || ''}
                  onChange={e => setField('letterheadText', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="ROYAL STUDIO — PHOTOGRAPHY & FILMS"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Document Footer Greeting</label>
                <input
                  type="text"
                  value={formData.documentFooterText || ''}
                  onChange={e => setField('documentFooterText', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Thank you for choosing Royal Studio. We Capture Your Memories!"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Standard Payment Schedule & Terms
                </label>
                <textarea
                  rows={2}
                  value={formData.paymentTerms || ''}
                  onChange={e => setField('paymentTerms', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Default Invoice Terms & Conditions
                </label>
                <textarea
                  rows={2}
                  value={formData.defaultInvoiceTerms || ''}
                  onChange={e => setField('defaultInvoiceTerms', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Default Quotation Proposal Terms
                </label>
                <textarea
                  rows={2}
                  value={formData.defaultQuotationTerms || ''}
                  onChange={e => setField('defaultQuotationTerms', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Document Settings'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 7: BANK ACCOUNTS & PAYMENT METHODS */}
      {activeTab === 'BANKING' && (
        <div className="space-y-6">
          {/* Multi-Bank Accounts Section */}
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Studio Bank Accounts ({(formData.bankAccounts || []).length})</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage corporate bank accounts for client invoices, quotations, crew payroll, and studio expenses.
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenAddBank}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bank Account</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(formData.bankAccounts || []).map(bank => (
                <div
                  key={bank.id}
                  className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                    bank.isDefault
                      ? 'bg-amber-50/40 border-amber-300 shadow-2xs'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-gray-900">{bank.bankName}</span>
                        {bank.isDefault && (
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black uppercase">
                            Default Account
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-white border border-gray-200 text-gray-700 rounded-full text-[10px] font-semibold">
                          {bank.accountPurpose}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-medium">{bank.accountName}</div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {!bank.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultBank(bank.id)}
                            className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 rounded text-[10px] font-bold cursor-pointer"
                            title="Set as primary invoice bank account"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditBank(bank)}
                          className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBank(bank.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-gray-200/80">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Account Title</div>
                      <div className="font-bold text-gray-900">{bank.accountTitle}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Account Number</div>
                      <div className="font-mono font-bold text-gray-900">{bank.accountNumber}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">IBAN</div>
                      <div className="font-mono text-gray-800">{bank.iban || '—'}</div>
                    </div>
                    {bank.branch && (
                      <div className="col-span-2 text-[11px] text-gray-500">
                        Branch: {bank.branch} {bank.branchCode ? `(${bank.branchCode})` : ''} • {bank.currency}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accepted Payment Methods Section */}
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Accepted Client Payment Methods ({(formData.paymentMethods || []).length})</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure Cash, Bank Transfer, JazzCash, EasyPaisa, and online payment instructions shown on invoices.
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenAddMethod}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Payment Method</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(formData.paymentMethods || []).map(pm => (
                <div key={pm.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{pm.displayName || pm.methodName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pm.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {pm.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditMethod(pm)}
                          className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMethod(pm.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {pm.accountNumber && (
                    <div className="font-mono font-semibold text-amber-800">Account / Wallet: {pm.accountNumber}</div>
                  )}
                  {pm.instructions && <p className="text-[11px] text-gray-600 leading-relaxed">{pm.instructions}</p>}
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleSaveProfile(undefined, 'Bank Accounts & Payment Methods')}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Banking & Payment Methods'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: BUSINESS HOURS & AVAILABILITY */}
      {activeTab === 'HOURS' && (
        <form onSubmit={e => handleSaveProfile(e, 'Business Hours & Schedule')} className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Weekly Studio Operating Hours (Burewala Studio)</span>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showBusinessHoursPublicly ?? true}
                  onChange={e => setField('showBusinessHoursPublicly', e.target.checked)}
                  disabled={!isAdmin}
                  className="rounded border-gray-300"
                />
                <span>Display Business Hours Publicly</span>
              </label>
            </div>

            <div className="space-y-2.5">
              {(formData.businessHours || DEFAULT_HOURS).map((item, idx) => (
                <div
                  key={item.day}
                  className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs"
                >
                  <div className="sm:col-span-2 font-bold text-gray-900">{item.day}</div>
                  <div className="sm:col-span-2">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!item.isClosed}
                        onChange={e => handleUpdateHour(idx, { isClosed: !e.target.checked })}
                        disabled={!isAdmin}
                      />
                      <span className={item.isClosed ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold'}>
                        {item.isClosed ? 'Closed' : 'Open'}
                      </span>
                    </label>
                  </div>
                  <div className="sm:col-span-4 flex items-center gap-2">
                    <input
                      type="time"
                      value={item.openTime}
                      disabled={!isAdmin || item.isClosed}
                      onChange={e => handleUpdateHour(idx, { openTime: e.target.value })}
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono disabled:opacity-40"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      value={item.closeTime}
                      disabled={!isAdmin || item.isClosed}
                      onChange={e => handleUpdateHour(idx, { closeTime: e.target.value })}
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono disabled:opacity-40"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={item.note || ''}
                      disabled={!isAdmin}
                      onChange={e => handleUpdateHour(idx, { note: e.target.value })}
                      placeholder="Optional note (e.g. By appointment)"
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Special Opening Hours / Event Coverage Note
                </label>
                <input
                  type="text"
                  value={formData.specialOpeningHours || ''}
                  onChange={e => setField('specialOpeningHours', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Public Holiday / Closure Notice (If Applicable)
                </label>
                <input
                  type="text"
                  value={formData.holidayNotice || ''}
                  onChange={e => setField('holidayNotice', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Leave blank during normal operations"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Business Hours'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 9: TAX, CURRENCY & LEGAL POLICIES */}
      {activeTab === 'LEGAL' && (
        <form onSubmit={e => handleSaveProfile(e, 'Tax, Currency & Legal Policies')} className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-slate-900 font-bold text-sm">
              <Scale className="w-4 h-4 text-amber-600" />
              <span>Currency, Tax Registration (NTN/STRN) & Legal Policies</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Currency Code</label>
                <input
                  type="text"
                  value={formData.currency || 'PKR'}
                  onChange={e => setField('currency', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={formData.currencySymbol || 'Rs.'}
                  onChange={e => setField('currencySymbol', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Default Sales Tax (%)</label>
                <input
                  type="number"
                  value={formData.taxRate ?? 5}
                  onChange={e => setField('taxRate', Number(e.target.value))}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">National Tax Number (NTN)</label>
                <input
                  type="text"
                  value={formData.ntn || ''}
                  onChange={e => setField('ntn', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">STRN / PRA Tax ID</label>
                <input
                  type="text"
                  value={formData.strn || ''}
                  onChange={e => setField('strn', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Business Reg. Number</label>
                <input
                  type="text"
                  value={formData.businessRegistrationNumber || ''}
                  onChange={e => setField('businessRegistrationNumber', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Registered Legal Address</label>
                <input
                  type="text"
                  value={formData.registeredAddress || formData.address || ''}
                  onChange={e => setField('registeredAddress', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Legal Footer</label>
                <input
                  type="text"
                  value={formData.invoiceLegalFooter || ''}
                  onChange={e => setField('invoiceLegalFooter', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Refund & Advance Policy</label>
                <textarea
                  rows={2}
                  value={formData.refundPolicy || ''}
                  onChange={e => setField('refundPolicy', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cancellation Policy</label>
                <textarea
                  rows={2}
                  value={formData.cancellationPolicy || ''}
                  onChange={e => setField('cancellationPolicy', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Tax & Legal Settings'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 10: WEBSITE, PUBLIC PROFILE & SEO */}
      {activeTab === 'SEO' && (
        <form onSubmit={e => handleSaveProfile(e, 'Website & SEO Settings')} className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-slate-900 font-bold text-sm">
              <Globe className="w-4 h-4 text-amber-600" />
              <span>Public Website Sync & Search Engine Optimization</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Public Brand Name</label>
                <input
                  type="text"
                  value={formData.publicStudioName || formData.studioName || ''}
                  onChange={e => setField('publicStudioName', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Website Title</label>
                <input
                  type="text"
                  value={formData.websiteTitle || ''}
                  onChange={e => setField('websiteTitle', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">SEO Meta Title</label>
                <input
                  type="text"
                  value={formData.seoTitle || ''}
                  onChange={e => setField('seoTitle', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">SEO Meta Description</label>
                <textarea
                  rows={2}
                  value={formData.seoDescription || ''}
                  onChange={e => setField('seoDescription', e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="md:col-span-2 pt-3 border-t border-gray-100">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-gray-900">
                      Customer Side Detailed Event Price Breakdown (Real-Time Pricing Engine)
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Default: Hidden on customer side. Toggle on only if you want website visitors to see the Detailed Event Price Breakdown table &amp; unit rates in the public Inquiry Form.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.showPublicPriceBreakdown)}
                      onChange={e => setField('showPublicPriceBreakdown', e.target.checked)}
                      disabled={!isAdmin}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span>
                      {formData.showPublicPriceBreakdown
                        ? 'Visible on Customer Side'
                        : 'Hidden on Customer Side (Default)'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Website & SEO Settings'}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* TAB 11: USER ACCOUNTS & ACCESS CONTROL */}
      {activeTab === 'USERS' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border-2 border-amber-300 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 leading-tight">
                    {formData.studioName || 'Royal Studio'}
                  </h3>
                  <div className="text-xs font-semibold text-amber-700 mt-0.5">Administrator</div>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-full">
                Active
              </span>
            </div>

            {adminUsers.map(admin => (
              <div
                key={admin.id}
                className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-gray-900">{admin.name}</div>
                  <div className="text-gray-500 font-mono text-[11px] mt-0.5">{admin.email}</div>
                  <div className="text-[10px] text-amber-800 font-semibold uppercase tracking-wider mt-1">
                    Role: ADMIN • Status: {admin.status}
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleOpenResetPassword(admin)}
                    className="self-start sm:self-auto py-1.5 px-3 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Change Admin Password</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Staff Login Accounts ({staffUsers.length})</span>
              </div>
              <div className="text-xs text-gray-500">Restricted to Own Tasks, Shoots & Payments</div>
            </div>

            {staffUsers.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
                No staff login accounts created yet. Visit the <strong>Team</strong> tab to create login credentials for any team member.
              </div>
            ) : (
              <div className="space-y-3">
                {staffUsers.map(staff => (
                  <div
                    key={staff.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{staff.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            staff.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {staff.status}
                        </span>
                      </div>
                      <div className="text-gray-500 font-mono text-[11px] mt-0.5">{staff.email}</div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenResetPassword(staff)}
                          className="py-1.5 px-3 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reset Password</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                            staff.status === 'ACTIVE'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {staff.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => {
                            setTargetUser(staff);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 12: AUDIT LOG & RESET TO OFFICIAL DEFAULTS */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Restore Official Royal Studio Defaults</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Reset all Studio Profile fields back to the verified Burewala address, phones (0308-4877073 / 0303-2213806), and branding defaults without affecting events or financial transactions.
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsResetProfileConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Official Defaults</span>
              </button>
            )}
          </div>

          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 text-slate-900 font-bold text-sm">
              <History className="w-4 h-4 text-amber-600" />
              <span>Studio Profile Change History & Audit Trail ({profileAuditLogs.length})</span>
            </div>

            {profileAuditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">No profile modifications logged yet.</div>
            ) : (
              <div className="space-y-2.5">
                {profileAuditLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{log.section}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                          {log.userName} ({log.userRole})
                        </span>
                      </div>
                      <div className="text-gray-600 mt-1">{log.summary}</div>
                    </div>
                    <div className="text-[11px] font-mono text-gray-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString('en-GB')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BANK ACCOUNT */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title={editingBank ? 'Edit Studio Bank Account' : 'Add Studio Bank Account'}
      >
        <form onSubmit={handleSaveBankItem} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Bank Name *</label>
              <input
                type="text"
                required
                value={bankForm.bankName}
                onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                placeholder="Meezan Bank Ltd"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Account Label *</label>
              <input
                type="text"
                required
                value={bankForm.accountName}
                onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })}
                placeholder="Primary Corporate Account"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Account Title *</label>
              <input
                type="text"
                required
                value={bankForm.accountTitle}
                onChange={e => setBankForm({ ...bankForm, accountTitle: e.target.value })}
                placeholder="Royal Studio"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Account Number *</label>
              <input
                type="text"
                required
                value={bankForm.accountNumber}
                onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">IBAN</label>
              <input
                type="text"
                value={bankForm.iban}
                onChange={e => setBankForm({ ...bankForm, iban: e.target.value })}
                placeholder="PK45MEZN..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Branch Name</label>
              <input
                type="text"
                value={bankForm.branch || ''}
                onChange={e => setBankForm({ ...bankForm, branch: e.target.value })}
                placeholder="Burewala"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Account Purpose</label>
              <select
                value={bankForm.accountPurpose}
                onChange={e => setBankForm({ ...bankForm, accountPurpose: e.target.value as BankAccountPurpose })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="Client Payments">Client Payments</option>
                <option value="Business Account">Business Account</option>
                <option value="Payroll">Crew Payroll</option>
                <option value="Expenses">Studio Expenses</option>
                <option value="Savings">Savings</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={bankForm.isDefault}
                onChange={e => setBankForm({ ...bankForm, isDefault: e.target.checked })}
              />
              <span>Set as Primary / Default Invoice Account</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={bankForm.showPublicly}
                onChange={e => setBankForm({ ...bankForm, showPublicly: e.target.checked })}
              />
              <span>Show on Invoices</span>
            </label>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBankModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg cursor-pointer"
            >
              Save Bank Account
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD / EDIT PAYMENT METHOD */}
      <Modal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
        title={editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
      >
        <form onSubmit={handleSaveMethodItem} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Method Type *</label>
              <input
                type="text"
                required
                value={methodForm.methodName}
                onChange={e => setMethodForm({ ...methodForm, methodName: e.target.value })}
                placeholder="JazzCash / EasyPaisa / Bank Transfer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Display Title *</label>
              <input
                type="text"
                required
                value={methodForm.displayName}
                onChange={e => setMethodForm({ ...methodForm, displayName: e.target.value })}
                placeholder="JazzCash Mobile Wallet"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Account / Wallet Number</label>
              <input
                type="text"
                value={methodForm.accountNumber || ''}
                onChange={e => setMethodForm({ ...methodForm, accountNumber: e.target.value })}
                placeholder="0308-4877073"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Payment Instructions</label>
              <textarea
                rows={2}
                value={methodForm.instructions || ''}
                onChange={e => setMethodForm({ ...methodForm, instructions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={methodForm.isActive}
                onChange={e => setMethodForm({ ...methodForm, isActive: e.target.checked })}
              />
              <span>Active</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={methodForm.showPublicly}
                onChange={e => setMethodForm({ ...methodForm, showPublicly: e.target.checked })}
              />
              <span>Show on Invoices & Proposals</span>
            </label>
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsMethodModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg cursor-pointer"
            >
              Save Method
            </button>
          </div>
        </form>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={`Reset Password — ${targetUser?.name || 'User'}`}
      >
        {targetUser && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <p className="text-xs text-gray-600">
              Set a new secure password for <strong>{targetUser.name}</strong> ({targetUser.email}).
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Password *</label>
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={4}
                placeholder="Minimum 4 characters"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
              />
            </div>
            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isResetting || !newPassword}
                className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                {isResetting ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* CONFIRMATION: DELETE USER ACCOUNT */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteUserConfirm}
        title="Remove Staff User Account?"
        message={`Are you sure you want to delete the login account for ${targetUser?.name}? Their crew member profile and historical production records will not be affected.`}
      />

      {/* CONFIRMATION: RESET STUDIO PROFILE TO DEFAULTS */}
      <ConfirmationDialog
        isOpen={isResetProfileConfirmOpen}
        onClose={() => setIsResetProfileConfirmOpen(false)}
        onConfirm={async () => {
          await resetProfileToDefaults();
          setIsResetProfileConfirmOpen(false);
        }}
        title="Restore Official Royal Studio Defaults?"
        message="This will restore the Studio Profile to the official Burewala address (Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan), official phone numbers (0308-4877073 / 0303-2213806), and default branding. Events, clients, and financial history will not be touched."
      />
    </div>
  );
};
