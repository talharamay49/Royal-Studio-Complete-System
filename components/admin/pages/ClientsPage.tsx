import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  MessageCircle,
  Eye,
  EyeOff,
  ArrowRight,
  UserCheck,
  UserX,
  UserPlus,
  Shield,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  Upload,
  Heart,
  Image as ImageIcon,
  Video,
  HardDrive,
  FolderOpen,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { useStudioData } from '../context/StudioDataContext';
import { useAuth } from '../context/AuthContext';
import { formatPKR, formatDate } from '../utils/calculations';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { apiRequest } from '../services/api';
import {
  Client,
  ProofingPhotoItem,
  ClientGoogleDriveFolderItem,
  YouTubeUnlistedVideoItem,
  EventCategory,
} from '../types';

interface ClientsPageProps {
  navigate: (path: string) => void;
  initialClientId?: string;
}

function generateClientPassword(phone?: string): string {
  const randomDigits = String(Math.floor(1000 + Math.random() * 9000));
  const suffix = phone ? phone.replace(/[^0-9]/g, '').slice(-2) : '';
  return `RS#${randomDigits}${suffix}`;
}

function buildClientNameParts(rawName?: string): {
  slug: string;
  compactSlug: string;
  firstToken: string;
  firstCap: string;
} {
  const cleaned = (rawName || 'client')
    .replace(/\b(family|mr|mrs|miss|dr|ch|malik|rana|syed)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  const tokens = cleaned
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
  const effectiveTokens =
    tokens.length > 0
      ? tokens.slice(0, 2)
      : (rawName || 'client')
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2);

  const firstToken = effectiveTokens[0] || 'client';
  const slug = effectiveTokens.join('.') || 'client';
  const compactSlug = effectiveTokens.join('') || 'client';
  const firstCap =
    firstToken.charAt(0).toUpperCase() + firstToken.slice(1).toLowerCase();

  return { slug, compactSlug, firstToken, firstCap };
}

function buildSuggestedClientEmails(
  nameInput?: string,
  phoneInput?: string,
  existingClientEmail?: string
): { label: string; email: string }[] {
  const { slug, compactSlug, firstToken } = buildClientNameParts(nameInput);
  const digits = (phoneInput || '').replace(/[^0-9]/g, '');
  const last4 = digits.slice(-4) || '2026';

  const candidates: { label: string; email: string }[] = [];
  const cleanExisting = (existingClientEmail || '').trim().toLowerCase();
  if (cleanExisting) {
    candidates.push({ label: 'Saved Email', email: cleanExisting });
  }
  candidates.push(
    { label: 'Studio Portal ID', email: `${slug}@royalstudio.online` },
    { label: 'Name + Phone ID', email: `${firstToken}.${last4}@royalstudio.online` },
    { label: 'Gmail Format', email: `${compactSlug}${last4}@gmail.com` }
  );

  const seen = new Set<string>();
  return candidates.filter((item) => {
    if (!item.email || seen.has(item.email)) return false;
    seen.add(item.email);
    return true;
  });
}

function buildSuggestedClientPasswords(
  nameInput?: string,
  phoneInput?: string
): { label: string; password: string }[] {
  const { firstCap } = buildClientNameParts(nameInput);
  const digits = (phoneInput || '').replace(/[^0-9]/g, '');
  const last4 = digits.slice(-4) || '2026';
  const last2 = digits.slice(-2) || '26';
  const randomDigits = String(Math.floor(1000 + Math.random() * 9000));

  const candidates = [
    { label: 'Studio + Phone PIN', password: `RS@${last4}` },
    { label: 'Name + Phone', password: `${firstCap}@${last4}` },
    { label: 'Royal Standard', password: `Royal@${last4}` },
    { label: 'Random Code', password: `RS#${randomDigits}${last2}` },
  ];

  const seen = new Set<string>();
  return candidates.filter((item) => {
    if (seen.has(item.password)) return false;
    seen.add(item.password);
    return true;
  });
}

function extractYtVideoId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'QF3BmojTrKQ';
  try {
    if (trimmed.includes('youtu.be/')) {
      return trimmed.split('youtu.be/')[1]?.split(/[?&]/)[0] || 'QF3BmojTrKQ';
    }
    if (trimmed.includes('v=')) {
      return trimmed.split('v=')[1]?.split(/[?&]/)[0] || 'QF3BmojTrKQ';
    }
    if (trimmed.includes('/embed/')) {
      return trimmed.split('/embed/')[1]?.split(/[?&]/)[0] || 'QF3BmojTrKQ';
    }
  } catch {
    // fallback
  }
  return trimmed.length === 11 ? trimmed : 'QF3BmojTrKQ';
}

export const ClientsPage: React.FC<ClientsPageProps> = ({
  navigate,
  initialClientId,
}) => {
  const {
    clients,
    events,
    payments,
    invoices,
    profile,
    createClient,
    updateClient,
    deleteClient,
    createEvent,
    createPayment,
    getEventProofingGallery,
    updateEventProofingGallery,
    refreshAll,
    addToast,
  } = useStudioData();
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [loginStatusFilter, setLoginStatusFilter] = useState('ALL');

  // Create / Edit Client Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initialClientId || null
  );
  const [activeProfileTab, setActiveProfileTab] = useState<
    'PROOFING' | 'MEDIA_DELIVERY' | 'BOOKINGS'
  >('PROOFING');
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  // Client Login Modals (Identical to TeamPage Staff Login Modals)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [clientForLogin, setClientForLogin] = useState<Client | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isCreatingLogin, setIsCreatingLogin] = useState(false);

  // Password Reset Modal (Identical to TeamPage)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [clientForReset, setClientForReset] = useState<Client | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Remove Login Dialog (Identical to TeamPage)
  const [isRemoveLoginDialogOpen, setIsRemoveLoginDialogOpen] = useState(false);
  const [clientLoginToRemove, setClientLoginToRemove] = useState<Client | null>(null);

  // Table password visibility map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states for Add / Edit Client Modal
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Burewala');
  const [notes, setNotes] = useState('');
  const [createLoginOnSave, setCreateLoginOnSave] = useState(true);
  const [modalPortalPassword, setModalPortalPassword] = useState('');
  const [copiedModalCreds, setCopiedModalCreds] = useState(false);

  // Inside Client Workspace states
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Quick Add Event inside Client Profile
  const [showQuickEventForm, setShowQuickEventForm] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState<EventCategory>('Wedding');
  const [newEventDate, setNewEventDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [newEventVenue, setNewEventVenue] = useState('Royal Marquee');
  const [newEventPrice, setNewEventPrice] = useState(185000);
  const [newEventAdvance, setNewEventAdvance] = useState(0);
  const [creatingQuickEvent, setCreatingQuickEvent] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Quick Record Payment inside Client Profile
  const [showQuickPaymentForm, setShowQuickPaymentForm] = useState(false);
  const [quickPayEventId, setQuickPayEventId] = useState('');
  const [quickPayAmount, setQuickPayAmount] = useState(50000);
  const [quickPayMethod, setQuickPayMethod] = useState('Bank Transfer');
  const [quickPayReference, setQuickPayReference] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Proofing Gallery Upload states inside Client Profile
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoDayLabel, setPhotoDayLabel] = useState('Day 2 · Barat');
  const [photoCategory, setPhotoCategory] = useState<
    | 'Couple Portrait'
    | 'Bridal Portrait'
    | 'Stage & Decor'
    | 'Family & Guests'
    | 'Candid Moments'
    | 'Details & Jewelry'
  >('Couple Portrait');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<'ALL' | 'FAVORITES' | 'NOTES'>('ALL');
  const [minAlbumDraft, setMinAlbumDraft] = useState(100);
  const [maxAlbumDraft, setMaxAlbumDraft] = useState(150);

  // Cloud Media Delivery states inside Client Profile
  const [driveFolderUrlDraft, setDriveFolderUrlDraft] = useState('');
  const [driveFolderNameDraft, setDriveFolderNameDraft] = useState('');
  const [driveTotalGbDraft, setDriveTotalGbDraft] = useState(13.1);
  const [driveSubfoldersDraft, setDriveSubfoldersDraft] = useState<
    ClientGoogleDriveFolderItem[]
  >([]);
  const [ytPlaylistUrlDraft, setYtPlaylistUrlDraft] = useState('');
  const [ytPlaylistTitleDraft, setYtPlaylistTitleDraft] = useState('');
  const [unlistedVideosDraft, setUnlistedVideosDraft] = useState<
    YouTubeUnlistedVideoItem[]
  >([]);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoType, setNewVideoType] =
    useState<YouTubeUnlistedVideoItem['videoType']>('Teaser');
  const [newVideoDuration, setNewVideoDuration] = useState('04:15');
  const [newSubfolderName, setNewSubfolderName] = useState('');
  const [newSubfolderUrl, setNewSubfolderUrl] = useState('');
  const [newSubfolderFiles, setNewSubfolderFiles] = useState(350);
  const [newSubfolderSizeGb, setNewSubfolderSizeGb] = useState(3.2);
  const [newSubfolderType, setNewSubfolderType] =
    useState<ClientGoogleDriveFolderItem['folderType']>('High-Res Edited');
  const [savingMediaDelivery, setSavingMediaDelivery] = useState(false);
  const [editingNotePhotoId, setEditingNotePhotoId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  useEffect(() => {
    if (initialClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );

  const selectedClientEvents = useMemo(
    () =>
      selectedClient
        ? events.filter((e) => e.clientId === selectedClient.id)
        : [],
    [events, selectedClient]
  );

  const activeClientEvent = useMemo(() => {
    if (selectedClientEvents.length === 0) return null;
    return (
      selectedClientEvents.find((e) => e.id === selectedEventId) ||
      selectedClientEvents[0]
    );
  }, [selectedClientEvents, selectedEventId]);

  const activeProofingGallery = useMemo(() => {
    if (!activeClientEvent) return null;
    return getEventProofingGallery(activeClientEvent.id);
  }, [activeClientEvent, getEventProofingGallery]);

  useEffect(() => {
    if (
      selectedClientEvents.length > 0 &&
      (!selectedEventId ||
        !selectedClientEvents.some((e) => e.id === selectedEventId))
    ) {
      setSelectedEventId(selectedClientEvents[0].id);
    } else if (selectedClientEvents.length === 0) {
      setSelectedEventId('');
    }
  }, [selectedClientEvents, selectedEventId]);

  useEffect(() => {
    if (!selectedClient) return;
    setEditingNotePhotoId(null);
    setGalleryFilter('ALL');
    if (activeClientEvent) {
      const gal = getEventProofingGallery(activeClientEvent.id);
      setMinAlbumDraft(gal.minAlbumSelection || 100);
      setMaxAlbumDraft(gal.maxAlbumSelection || 150);
      setQuickPayEventId(activeClientEvent.id);
    }

    const md = activeClientEvent?.mediaDelivery || selectedClient.mediaDelivery;
    const defaultTitle = activeClientEvent?.title || selectedClient.name;
    setDriveFolderUrlDraft(
      md?.driveFolderUrl ||
        selectedClient.googleDriveFolderUrl ||
        `https://drive.google.com/drive/folders/1RS_${(activeClientEvent?.id || selectedClient.id).toUpperCase()}`
    );
    setDriveFolderNameDraft(
      md?.driveFolderName ||
        `Royal Studio · ${defaultTitle} (High-Res Photo Archive)`
    );
    setDriveTotalGbDraft(md?.totalDataVolumeGb || 13.1);
    setDriveSubfoldersDraft(md?.driveSubfolders || []);
    setYtPlaylistUrlDraft(
      md?.youtubePlaylistUrl ||
        selectedClient.youtubePlaylistUrl ||
        'https://www.youtube.com/watch?v=QF3BmojTrKQ'
    );
    setYtPlaylistTitleDraft(
      md?.youtubePlaylistTitle ||
        `${defaultTitle} — Unlisted 4K Wedding Films`
    );
    setUnlistedVideosDraft(
      md?.unlistedYoutubeVideos || md?.unlistedVideos || []
    );
  }, [
    activeClientEvent?.id,
    activeClientEvent?.mediaDelivery,
    selectedClient?.id,
    selectedClient?.mediaDelivery,
    getEventProofingGallery,
  ]);

  const cities = useMemo(() => {
    const set = new Set(clients.map((c) => c.city).filter(Boolean));
    return Array.from(set);
  }, [clients]);

  const clientMetrics = useMemo(() => {
    const map: Record<
      string,
      {
        eventCount: number;
        totalSpent: number;
        totalBilled: number;
        balance: number;
        totalPhotos: number;
        selectedPhotos: number;
      }
    > = {};

    clients.forEach((c) => {
      const cEvents = events.filter((e) => e.clientId === c.id);
      const activeEvents = cEvents.filter((e) => e.status !== 'Cancelled');
      const cEventIds = new Set(cEvents.map((e) => e.id));
      const cPayments = payments.filter(
        (p) =>
          (p.clientId === c.id || cEventIds.has(p.eventId)) &&
          p.verificationStatus !== 'Rejected'
      );
      const totalBilled = activeEvents.reduce(
        (acc, e) =>
          acc +
          Math.max(
            0,
            Number(e.packagePrice || 0) - Number(e.discount || 0) + Number(e.tax || 0)
          ),
        0
      );
      const totalSpent = cPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      let totalPhotos = 0;
      let selectedPhotos = 0;
      cEvents.forEach((ev) => {
        const gal = getEventProofingGallery(ev.id);
        totalPhotos += gal.photos.length;
        selectedPhotos += gal.photos.filter((p) => p.isSelectedForAlbum).length;
      });
      map[c.id] = {
        eventCount: cEvents.length,
        totalBilled,
        totalSpent,
        balance: Math.max(0, totalBilled - totalSpent),
        totalPhotos,
        selectedPhotos,
      };
    });

    return map;
  }, [clients, events, payments, getEventProofingGallery]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchesCity = cityFilter === 'ALL' || c.city === cityFilter;
      const hasActiveOrDisabledLogin =
        c.loginStatus !== 'NONE' &&
        c.hasLogin !== false &&
        Boolean(c.portalPassword && c.portalPassword.trim());
      const effectiveStatus = hasActiveOrDisabledLogin
        ? c.loginStatus === 'DISABLED'
          ? 'DISABLED'
          : 'ACTIVE'
        : 'NONE';
      const matchesLoginStatus =
        loginStatusFilter === 'ALL' || effectiveStatus === loginStatusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q);
      return matchesCity && matchesLoginStatus && matchesSearch;
    });
  }, [clients, cityFilter, loginStatusFilter, searchQuery]);

  const handleOpenCreateLogin = (client: Client) => {
    setClientForLogin(client);
    const emailSuggestions = buildSuggestedClientEmails(
      client.name,
      client.phone,
      client.email
    );
    const passwordSuggestions = buildSuggestedClientPasswords(
      client.name,
      client.phone
    );
    setLoginEmail(client.email || emailSuggestions[0]?.email || '');
    setLoginPassword(
      passwordSuggestions[0]?.password || generateClientPassword(client.phone)
    );
    setCopiedModalCreds(false);
    setIsLoginModalOpen(true);
  };

  const handleCreateLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForLogin) return;
    const cleanPass = loginPassword.trim();
    if (cleanPass.length < 4) {
      addToast('Password must be at least 4 characters.', 'error');
      return;
    }
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail && !clientForLogin.phone) {
      addToast('Client must have either a Phone Number or Email Address for login.', 'error');
      return;
    }
    setIsCreatingLogin(true);
    try {
      await updateClient(clientForLogin.id, {
        ...(cleanEmail ? { email: cleanEmail } : {}),
        portalPassword: cleanPass,
        hasLogin: true,
        loginStatus: 'ACTIVE',
      });
      setVisiblePasswords((prev) => ({ ...prev, [clientForLogin.id]: true }));
      const loginIdLabel = cleanEmail || clientForLogin.phone;
      addToast(
        `Created Client Login (${loginIdLabel} / ${cleanPass}) for ${clientForLogin.name}!`
      );
      setIsLoginModalOpen(false);
      setClientForLogin(null);
    } finally {
      setIsCreatingLogin(false);
    }
  };

  const handleOpenResetPassword = (client: Client) => {
    setClientForReset(client);
    const passwordSuggestions = buildSuggestedClientPasswords(
      client.name,
      client.phone
    );
    setNewPassword(
      passwordSuggestions[0]?.password || generateClientPassword(client.phone)
    );
    setIsResetModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForReset || !newPassword.trim()) return;
    setIsResetting(true);
    try {
      await updateClient(clientForReset.id, {
        portalPassword: newPassword.trim(),
        hasLogin: true,
        loginStatus: 'ACTIVE',
      });
      addToast(
        `Updated login password (${newPassword.trim()}) for ${clientForReset.name}!`
      );
      setIsResetModalOpen(false);
      setClientForReset(null);
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleClientLoginStatus = async (client: Client) => {
    const currentStatus =
      client.loginStatus === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
    const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    await updateClient(client.id, {
      hasLogin: true,
      loginStatus: nextStatus,
    });
    addToast(`${client.name}'s Client Login is now ${nextStatus}.`);
  };

  const handleConfirmRemoveLogin = async () => {
    if (!clientLoginToRemove) return;
    await updateClient(clientLoginToRemove.id, {
      portalPassword: '',
      hasLogin: false,
      loginStatus: 'NONE',
    });
    addToast(`Removed Client Login for ${clientLoginToRemove.name}.`);
    setClientLoginToRemove(null);
    setIsRemoveLoginDialogOpen(false);
  };

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setAddress('');
    setCity('Burewala');
    setNotes('');
    setCreateLoginOnSave(true);
    setModalPortalPassword('RS@2026');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setWhatsapp(client.whatsapp);
    setEmail(client.email);
    setAddress(client.address);
    setCity(client.city);
    setNotes(client.notes);
    const alreadyHasLogin =
      client.loginStatus !== 'NONE' &&
      client.hasLogin !== false &&
      Boolean(client.portalPassword && client.portalPassword.trim());
    setCreateLoginOnSave(alreadyHasLogin);
    const passSuggestions = buildSuggestedClientPasswords(client.name, client.phone);
    setModalPortalPassword(
      client.portalPassword || passSuggestions[0]?.password || generateClientPassword(client.phone)
    );
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingClient(true);
    try {
      const suggestedEmails = buildSuggestedClientEmails(name, phone, email);
      const effectiveEmail =
        email.trim().toLowerCase() ||
        (createLoginOnSave ? suggestedEmails[0]?.email || '' : '');
      const suggestedPasses = buildSuggestedClientPasswords(name, phone);
      const effectivePassword =
        modalPortalPassword.trim() ||
        suggestedPasses[0]?.password ||
        generateClientPassword(phone);

      if (editingClient) {
        await updateClient(editingClient.id, {
          name: name.trim(),
          phone: phone.trim(),
          whatsapp: (whatsapp || phone).trim(),
          email: effectiveEmail,
          address: address.trim(),
          city: city.trim() || 'Burewala',
          notes: notes.trim(),
          ...(createLoginOnSave
            ? {
                portalPassword: effectivePassword,
                hasLogin: true,
                loginStatus: 'ACTIVE',
              }
            : {}),
        });
      } else {
        await createClient({
          name: name.trim(),
          phone: phone.trim(),
          whatsapp: (whatsapp || phone).trim(),
          email: effectiveEmail,
          address: address.trim(),
          city: city.trim() || 'Burewala',
          notes: notes.trim(),
          ...(createLoginOnSave
            ? {
                portalPassword: effectivePassword,
                hasLogin: true,
                loginStatus: 'ACTIVE',
              }
            : {
                hasLogin: false,
                loginStatus: 'NONE',
              }),
        });
      }
      setIsModalOpen(false);
    } catch {
      // Error toast is already displayed by StudioDataContext; keep modal open for correction
    } finally {
      setIsSavingClient(false);
    }
  };

  const buildClientInviteText = (client: Client, customPass?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const loginId = client.email || client.phone;
    const pass =
      customPass ||
      client.portalPassword ||
      `RS@${(client.phone || '').replace(/[^0-9]/g, '').slice(-4) || '2026'}`;
    return [
      `Assalam-o-Alaikum *${client.name}*,`,
      `Your private Client Portal account at *${profile?.studioName || 'Royal Studio'}* is active!`,
      ``,
      `🔐 *YOUR CLIENT PORTAL LOGIN:*`,
      `• *Portal Link:* ${origin}/client-portal`,
      `• *Login Email / Phone:* ${loginId}`,
      `• *Password:* ${pass}`,
      ``,
      `Sign in at ${origin}/client-portal to view your event schedule, select your favorite photos in the Proofing Gallery, stream your 4K wedding films, access your Google Drive photo archive, and download your invoices.`,
    ].join('\n');
  };

  const handleCopyCredentials = (client: Client, customPass?: string) => {
    const text = buildClientInviteText(client, customPass);
    navigator.clipboard.writeText(text);
    setCopiedId(client.id);
    addToast(`Copied ${client.name}'s /client-portal login credentials!`);
    setTimeout(() => {
      setCopiedId((prev) => (prev === client.id ? null : prev));
    }, 2000);
  };

  const handleQuickCreateEventForClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setCreatingQuickEvent(true);
    try {
      const titleFinal =
        newEventTitle.trim() || `${selectedClient.name} — ${newEventCategory}`;
      const created = await createEvent({
        clientId: selectedClient.id,
        title: titleFinal,
        category: newEventCategory,
        eventDate: newEventDate,
        startTime: '18:00',
        endTime: '23:30',
        venue: newEventVenue.trim() || 'Royal Marquee',
        city: selectedClient.city || 'Burewala',
        packagePrice: Math.max(0, Number(newEventPrice) || 185000),
        advancePaid: Math.max(0, Number(newEventAdvance) || 0),
        status: 'Confirmed',
        isMultiDay: true,
        notes: `Created inside ${selectedClient.name}'s Client Profile`,
      });
      if (created?.id) {
        setSelectedEventId(created.id);
        setQuickPayEventId(created.id);
      }
      setShowQuickEventForm(false);
      setNewEventTitle('');
      setNewEventAdvance(0);
    } finally {
      setCreatingQuickEvent(false);
    }
  };

  const handleQuickRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    const targetEvtId = quickPayEventId || activeClientEvent?.id || selectedClientEvents[0]?.id;
    if (!targetEvtId) {
      addToast('Please create an event booking for this client first.', 'error');
      return;
    }
    const amt = Number(quickPayAmount || 0);
    if (amt <= 0) {
      addToast('Payment amount must be greater than zero.', 'error');
      return;
    }
    setRecordingPayment(true);
    try {
      const linkedInvoice = invoices.find((inv) => inv.eventId === targetEvtId);
      await createPayment({
        eventId: targetEvtId,
        clientId: selectedClient.id,
        invoiceId: linkedInvoice?.id,
        amount: amt,
        paymentDate: new Date().toISOString().split('T')[0],
        method: quickPayMethod as any,
        reference: quickPayReference.trim() || `CP-${Date.now().toString().slice(-4)}`,
        notes: `Recorded inside ${selectedClient.name}'s Client Workspace`,
        verificationStatus: 'Verified',
      });
      setShowQuickPaymentForm(false);
      setQuickPayReference('');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleAddSinglePhotoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClientEvent || !activeProofingGallery) return;
    if (!photoTitle.trim() || !photoUrl.trim()) {
      addToast('Please enter both a Frame Title and an Image URL.', 'error');
      return;
    }
    const existingPhotos = activeProofingGallery.photos || [];
    const nextPhoto: ProofingPhotoItem = {
      id: `prf-${Date.now()}`,
      code: `RS-${existingPhotos.length + 101}`,
      title: photoTitle.trim(),
      url: photoUrl.trim(),
      dayLabel: photoDayLabel || 'Day 2 · Barat',
      category: photoCategory,
      isSelectedForAlbum: false,
    };
    await updateEventProofingGallery(activeClientEvent.id, {
      photos: [nextPhoto, ...existingPhotos],
      isPinProtected: false,
    });
    setPhotoTitle('');
    setPhotoUrl('');
    addToast(`Uploaded "${nextPhoto.title}" to ${selectedClient?.name}'s proofing gallery!`);
  };

  const handleLocalFilesUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !activeClientEvent || !activeProofingGallery)
      return;

    setUploadingFiles(true);
    try {
      const files = Array.from(fileList);
      const existingPhotos = activeProofingGallery.photos || [];
      const uploadedItems: ProofingPhotoItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = () => reject(new Error('File read error'));
          reader.readAsDataURL(file);
        });
        if (dataUrl) {
          const cleanName = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[-_]/g, ' ');
          uploadedItems.push({
            id: `prf-${Date.now()}-${i}`,
            code: `RS-${existingPhotos.length + 101 + i}`,
            title: photoTitle.trim()
              ? `${photoTitle.trim()} #${i + 1}`
              : cleanName || `Wedding Frame #${existingPhotos.length + i + 1}`,
            url: dataUrl,
            dayLabel: photoDayLabel || 'Day 2 · Barat',
            category: photoCategory,
            isSelectedForAlbum: false,
          });
        }
      }

      if (uploadedItems.length > 0) {
        await updateEventProofingGallery(activeClientEvent.id, {
          photos: [...uploadedItems, ...existingPhotos],
          isPinProtected: false,
        });
        addToast(
          `Uploaded ${uploadedItems.length} photo(s) to ${selectedClient?.name}'s Proofing Gallery!`
        );
      }
    } catch {
      addToast('Failed to read local image files.', 'error');
    } finally {
      setUploadingFiles(false);
      e.target.value = '';
    }
  };

  const handleToggleGalleryFavorite = async (photoId: string) => {
    if (!activeClientEvent || !activeProofingGallery) return;
    const nextPhotos = activeProofingGallery.photos.map((p) =>
      p.id === photoId ? { ...p, isSelectedForAlbum: !p.isSelectedForAlbum } : p
    );
    await updateEventProofingGallery(activeClientEvent.id, {
      photos: nextPhotos,
    });
  };

  const handleDeleteGalleryPhoto = async (photoId: string) => {
    if (!activeClientEvent || !activeProofingGallery) return;
    const nextPhotos = activeProofingGallery.photos.filter(
      (p) => p.id !== photoId
    );
    await updateEventProofingGallery(activeClientEvent.id, {
      photos: nextPhotos,
    });
    addToast('Removed photo from client proofing gallery.');
  };

  const handleSaveMediaDelivery = async (
    customFolders?: ClientGoogleDriveFolderItem[],
    customVideos?: YouTubeUnlistedVideoItem[]
  ) => {
    if (!selectedClient) return;
    setSavingMediaDelivery(true);
    try {
      const foldersToSave = customFolders || driveSubfoldersDraft;
      const videosToSave = customVideos || unlistedVideosDraft;
      const totalFiles =
        foldersToSave.reduce((s, f) => s + Number(f.fileCount || 0), 0) || 1450;
      const computedGb = Number(
        foldersToSave.reduce((s, f) => s + Number(f.sizeGb || 0), 0).toFixed(1)
      );
      const effectiveGb =
        customFolders && computedGb > 0
          ? computedGb
          : Number(driveTotalGbDraft) || computedGb || 13.1;
      if (customFolders && computedGb > 0) {
        setDriveTotalGbDraft(computedGb);
      }

      const vaultPayload = {
        approvalStatus: 'Approved & Provisioned' as const,
        driveFolderUrl: driveFolderUrlDraft.trim(),
        driveFolderName: driveFolderNameDraft.trim(),
        totalDataVolumeGb: effectiveGb,
        freeTierQuotaGb: 15,
        totalHighResPhotos: totalFiles,
        rawAssetsIncluded: true,
        driveTransferProgress: 100,
        driveSubfolders: foldersToSave,
        youtubePlaylistUrl: ytPlaylistUrlDraft.trim(),
        youtubePlaylistTitle: ytPlaylistTitleDraft.trim(),
        youtubePrivacyMode: 'Unlisted Playlist & Videos' as const,
        unlistedYoutubeVideos: videosToSave,
        unlistedVideos: videosToSave,
        lastUpdatedAt: new Date().toISOString(),
      };

      // Always save links and full mediaDelivery vault directly on the client profile
      await updateClient(selectedClient.id, {
        googleDriveFolderUrl: driveFolderUrlDraft.trim(),
        youtubePlaylistUrl: ytPlaylistUrlDraft.trim(),
        mediaDelivery: vaultPayload,
      });

      // Also save rich vault details on the active event if present
      if (activeClientEvent) {
        await apiRequest(`/api/events/${activeClientEvent.id}/media-delivery`, {
          method: 'POST',
          body: JSON.stringify({
            action: 'UPDATE_VAULT',
            mediaDelivery: vaultPayload,
          }),
        });
        await refreshAll();
      }
      addToast(
        `Saved Google Drive & 4K Films delivery links to ${selectedClient.name}'s profile!`
      );
    } catch (err: any) {
      addToast(err?.message || 'Failed to save media delivery.', 'error');
    } finally {
      setSavingMediaDelivery(false);
    }
  };

  const handleAddDriveSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubfolderName.trim()) {
      addToast('Please enter a Subfolder Name.', 'error');
      return;
    }
    const resolvedFolderUrl =
      newSubfolderUrl.trim() ||
      driveFolderUrlDraft.trim() ||
      'https://drive.google.com/drive/folders/1RS_ARCHIVE';
    const nowIso = new Date().toISOString();
    const nextFolder: ClientGoogleDriveFolderItem = {
      id: `gdf-${Date.now()}`,
      folderName: newSubfolderName.trim(),
      folderType: newSubfolderType,
      fileCount: Number(newSubfolderFiles) || 250,
      sizeGb: Number(newSubfolderSizeGb) || 2.5,
      folderUrl: resolvedFolderUrl,
      driveUrl: resolvedFolderUrl,
      transferStatus: 'Verified',
      status: 'Synced',
      updatedAt: nowIso,
      uploadedAt: nowIso,
    };
    const nextFolders = [...driveSubfoldersDraft, nextFolder];
    setDriveSubfoldersDraft(nextFolders);
    setNewSubfolderName('');
    setNewSubfolderUrl('');
    await handleSaveMediaDelivery(nextFolders, unlistedVideosDraft);
  };

  const handleRemoveDriveSubfolder = async (folderId: string) => {
    const nextFolders = driveSubfoldersDraft.filter((f) => f.id !== folderId);
    setDriveSubfoldersDraft(nextFolders);
    await handleSaveMediaDelivery(nextFolders, unlistedVideosDraft);
  };

  const handleAddYoutubeVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoTitle.trim() || !newVideoUrl.trim()) {
      addToast('Please enter both a Video Title and YouTube URL.', 'error');
      return;
    }
    const ytId = extractYtVideoId(newVideoUrl);
    const nextVid: YouTubeUnlistedVideoItem = {
      id: `yt-${Date.now()}`,
      title: newVideoTitle.trim(),
      videoType: newVideoType,
      youtubeId: ytId,
      youtubeUrl: `https://www.youtube.com/watch?v=${ytId}`,
      duration: newVideoDuration.trim() || '04:00',
      resolution: '4K UHD',
      privacyStatus: 'Unlisted',
      uploadedAt: new Date().toISOString(),
    };
    const nextList = [...unlistedVideosDraft, nextVid];
    setUnlistedVideosDraft(nextList);
    setNewVideoTitle('');
    setNewVideoUrl('');
    await handleSaveMediaDelivery(driveSubfoldersDraft, nextList);
  };

  const handleRemoveYoutubeVideo = async (videoId: string) => {
    const nextList = unlistedVideosDraft.filter((v) => v.id !== videoId);
    setUnlistedVideosDraft(nextList);
    await handleSaveMediaDelivery(driveSubfoldersDraft, nextList);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Row (Identical to TeamPage "+ New Crew Member") */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href="/client-portal"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-slate-800 border border-gray-200 text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
          <span>Open /client-portal</span>
        </a>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Client</span>
        </button>
      </div>

      {/* Filter Bar (Identical to TeamPage Filter Bar) */}
      <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={loginStatusFilter}
            onChange={(e) => setLoginStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Login: Active</option>
            <option value="DISABLED">Login: Disabled</option>
            <option value="NONE">No Login</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search client..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Client Box Cards Grid (Identical to TeamPage Roster Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 p-10 bg-white rounded-xl border border-gray-200 text-center space-y-3">
            <p className="text-xs text-gray-500">
              No clients found. Click &ldquo;New Client&rdquo; to create a client card and generate their login password.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Client</span>
            </button>
          </div>
        ) : (
          filteredClients.map((client) => {
          const m = clientMetrics[client.id] || {
            eventCount: 0,
            totalBilled: 0,
            totalSpent: 0,
            balance: 0,
            totalPhotos: 0,
            selectedPhotos: 0,
          };
          const hasClientLogin =
            client.loginStatus !== 'NONE' &&
            client.hasLogin !== false &&
            Boolean(client.portalPassword && client.portalPassword.trim());
          const clientLoginStatus =
            client.loginStatus === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
          const pass =
            client.portalPassword ||
            `RS@${(client.phone || '').replace(/[^0-9]/g, '').slice(-4) || '2026'}`;
          const loginUsername = client.email || client.phone;

          return (
            <div
              key={client.id}
              className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-amber-400 transition-all space-y-3"
            >
              {/* Card Top Header (Identical to TeamPage) */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{client.name}</h3>
                  <div className="text-xs font-medium text-amber-700 mt-0.5">
                    {client.city || 'Client'}
                  </div>
                  {client.address && (
                    <div className="text-[11px] text-gray-500 italic mt-0.5">
                      {client.address}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge
                    status={
                      m.balance > 0
                        ? 'Pending'
                        : m.eventCount > 0
                          ? 'Completed'
                          : 'Available'
                    }
                    size="sm"
                  />
                  {isAdmin && (
                    <button
                      onClick={() => openEditModal(client)}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded ml-1 cursor-pointer"
                      title="Edit Client"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteTarget(client)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Delete Client"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Info Box (Identical to TeamPage) */}
              <div className="text-xs space-y-1 text-gray-600 bg-gray-50/70 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{client.phone}</span>
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
              </div>

              {/* 2-Column Stats Row (Identical to TeamPage Standard Rates / Productions Done) */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-medium">
                    Package Billing
                  </div>
                  <div className="font-mono font-bold text-gray-900">
                    {m.eventCount === 0
                      ? 'No Bookings Yet'
                      : m.eventCount === 1
                        ? `${formatPKR(m.totalBilled)} / event`
                        : `${formatPKR(m.totalBilled)} (${m.eventCount} events)`}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Paid: {formatPKR(m.totalSpent)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 uppercase font-medium">
                    Events &amp; Gallery
                  </div>
                  <div className="font-bold text-gray-900">
                    {m.eventCount} events · {m.selectedPhotos}/{m.totalPhotos} proofs
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600 font-bold">
                    {m.balance > 0 ? `Due: ${formatPKR(m.balance)}` : 'PKR 0 Due'}
                  </div>
                </div>
              </div>

              {/* Client Login Relationship Section (Identical to TeamPage Staff Login Section) */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                    Client Login:
                  </span>
                  {hasClientLogin ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        clientLoginStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <UserCheck className="w-3 h-3" />
                      Login: {clientLoginStatus}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                      <UserX className="w-3 h-3 text-gray-400" />
                      Login: No Login
                    </span>
                  )}
                </div>

                {hasClientLogin ? (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 font-medium">Account:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[165px]">
                        {loginUsername}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 font-medium">Password:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                          {visiblePasswords[client.id] !== false ? pass : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setVisiblePasswords((prev) => ({
                              ...prev,
                              [client.id]: prev[client.id] === false ? true : false,
                            }))
                          }
                          className="p-0.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                          title={
                            visiblePasswords[client.id] !== false
                              ? 'Hide password'
                              : 'Show password'
                          }
                        >
                          {visiblePasswords[client.id] !== false ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(client, pass)}
                          className="p-0.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                          title="Copy /client-portal login credentials"
                        >
                          {copiedId === client.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        {(() => {
                          const rawWa = (client.whatsapp || client.phone || '').replace(
                            /[^0-9]/g,
                            ''
                          );
                          const cleanWa = rawWa
                            ? rawWa.startsWith('92')
                              ? rawWa
                              : `92${rawWa.replace(/^0/, '')}`
                            : '';
                          const inviteText = buildClientInviteText(client, pass);
                          const waHref = cleanWa
                            ? `https://wa.me/${cleanWa}?text=${encodeURIComponent(inviteText)}`
                            : `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
                          return (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-0.5 text-emerald-600 hover:text-emerald-700"
                              title="Send login credentials via WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 font-medium">Role:</span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/client-portal?email=${encodeURIComponent(
                            loginUsername
                          )}&password=${encodeURIComponent(pass)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-1 transition-colors"
                          title="Open & test this client's account in /client-portal"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>Open Portal</span>
                        </a>
                        <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                          CLIENT
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => handleOpenResetPassword(client)}
                          className="flex-1 py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Reset Client Password"
                        >
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          <span>Reset Password</span>
                        </button>
                        <button
                          onClick={() => handleToggleClientLoginStatus(client)}
                          className={`py-1 px-2 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                            clientLoginStatus === 'ACTIVE'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                          title={
                            clientLoginStatus === 'ACTIVE'
                              ? 'Disable Client Account'
                              : 'Enable Client Account'
                          }
                        >
                          {clientLoginStatus === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => {
                            setClientLoginToRemove(client);
                            setIsRemoveLoginDialogOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Remove Client Login"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  isAdmin && (
                    <button
                      onClick={() => handleOpenCreateLogin(client)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-amber-50 to-amber-100/90 hover:from-amber-100 hover:to-amber-200 text-amber-950 border border-amber-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-amber-700" />
                      <span>CREATE CLIENT LOGIN</span>
                    </button>
                  )
                )}
              </div>

              {/* Direct Proofing Gallery, Cloud Delivery & Bookings Buttons */}
              <div className="pt-2 border-t border-gray-100 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setActiveProfileTab('PROOFING');
                  }}
                  className="flex-1 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Proofing Gallery ({m.selectedPhotos}/{m.totalPhotos})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setActiveProfileTab('MEDIA_DELIVERY');
                  }}
                  className="py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Google Drive & 4K Films"
                >
                  Drive &amp; Films
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setActiveProfileTab('BOOKINGS');
                  }}
                  className="py-1.5 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Client Event Bookings"
                >
                  Events ({m.eventCount})
                </button>
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* CREATE CLIENT LOGIN MODAL (Identical to TeamPage Create Staff Login Modal) */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="Create Client Login Account"
      >
        {clientForLogin &&
          (() => {
            const emailSuggestions = buildSuggestedClientEmails(
              clientForLogin.name,
              clientForLogin.phone,
              clientForLogin.email
            );
            const passwordSuggestions = buildSuggestedClientPasswords(
              clientForLogin.name,
              clientForLogin.phone
            );
            return (
              <form onSubmit={handleCreateLoginSubmit} className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                      <Shield className="w-4 h-4 text-amber-700" />
                      <span>Private Client Portal Account (/client-portal)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (emailSuggestions[0]?.email) {
                          setLoginEmail(emailSuggestions[0].email);
                        }
                        if (passwordSuggestions[0]?.password) {
                          setLoginPassword(passwordSuggestions[0].password);
                        }
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/80 hover:bg-amber-300 text-amber-950 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Fill Suggested</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Creating login credentials for <strong>{clientForLogin.name}</strong> will provision a private Client account with access restricted strictly to their own bookings, proofing gallery, and invoices at <code>/client-portal</code>.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div>
                    <span className="text-gray-500 font-medium block">Client:</span>
                    <span className="font-bold text-gray-900">{clientForLogin.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium block">Phone Login ID:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {clientForLogin.phone || 'Not set'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">
                      Client Login Email (Client can sign in with Email OR Phone)
                    </label>
                    {emailSuggestions[0]?.email && (
                      <button
                        type="button"
                        onClick={() => setLoginEmail(emailSuggestions[0].email)}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Use Suggested Email</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="client@royalstudio.online (or leave blank to use phone)"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs focus:border-amber-500 focus:outline-none"
                  />
                  <div className="space-y-1 pt-0.5">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
                      Suggested Emails (Click to select):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {emailSuggestions.map((item) => {
                        const isSelected =
                          loginEmail.trim().toLowerCase() === item.email;
                        return (
                          <button
                            key={item.email}
                            type="button"
                            onClick={() => setLoginEmail(item.email)}
                            className={`px-2 py-1 rounded-md text-[11px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                                : 'bg-gray-50 hover:bg-amber-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-amber-700" />}
                            <span>{item.email}</span>
                            <span className="text-[9px] font-sans text-gray-400">
                              ({item.label})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">
                      Initial Password *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setLoginPassword(generateClientPassword(clientForLogin.phone))
                      }
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate Random</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      minLength={4}
                      placeholder="Minimum 4 characters"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1 pt-0.5">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
                      Suggested Passwords (Click to select):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {passwordSuggestions.map((item) => {
                        const isSelected = loginPassword.trim() === item.password;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setLoginPassword(item.password)}
                            className={`px-2 py-1 rounded-md text-[11px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                                : 'bg-gray-50 hover:bg-amber-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-amber-700" />}
                            <span>{item.password}</span>
                            <span className="text-[9px] font-sans text-gray-400">
                              ({item.label})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Live Suggested Credentials Preview Box */}
                <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                      Ready-to-Share Client Login Credentials
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const previewClient: Client = {
                          ...clientForLogin,
                          email: loginEmail.trim().toLowerCase() || clientForLogin.email,
                        };
                        const text = buildClientInviteText(
                          previewClient,
                          loginPassword.trim()
                        );
                        navigator.clipboard.writeText(text);
                        setCopiedModalCreds(true);
                        addToast('Copied suggested login credentials to clipboard!');
                        setTimeout(() => setCopiedModalCreds(false), 2000);
                      }}
                      className="text-[10px] font-semibold bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedModalCreds ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Preview</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/10">
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Login Email / Phone:
                      </span>
                      <span className="font-mono font-semibold text-white truncate block">
                        {loginEmail.trim().toLowerCase() || clientForLogin.phone}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Portal Password:
                      </span>
                      <span className="font-mono font-bold text-amber-300">
                        {loginPassword || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(false)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingLogin}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>
                      {isCreatingLogin ? 'Creating Login...' : 'Create Client Login'}
                    </span>
                  </button>
                </div>
              </form>
            );
          })()}
      </Modal>

      {/* RESET CLIENT PASSWORD MODAL (Identical to TeamPage Reset Staff Password Modal) */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Client Password"
      >
        {clientForReset &&
          (() => {
            const passwordSuggestions = buildSuggestedClientPasswords(
              clientForReset.name,
              clientForReset.phone
            );
            return (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <p className="text-xs text-gray-600">
                  Reset login credentials for <strong>{clientForReset.name}</strong> (
                  {clientForReset.email || clientForReset.phone}).
                </p>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">
                      New Password *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewPassword(generateClientPassword(clientForReset.phone))
                      }
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate Random</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={4}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <div className="space-y-1 pt-0.5">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">
                      Suggested Passwords (Click to select):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {passwordSuggestions.map((item) => {
                        const isSelected = newPassword.trim() === item.password;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => setNewPassword(item.password)}
                            className={`px-2 py-1 rounded-md text-[11px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                                : 'bg-gray-50 hover:bg-amber-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-amber-700" />}
                            <span>{item.password}</span>
                            <span className="text-[9px] font-sans text-gray-400">
                              ({item.label})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || !newPassword}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isResetting ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            );
          })()}
      </Modal>

      {/* CONFIRMATION: REMOVE CLIENT LOGIN */}
      <ConfirmationDialog
        isOpen={isRemoveLoginDialogOpen}
        onClose={() => setIsRemoveLoginDialogOpen(false)}
        onConfirm={handleConfirmRemoveLogin}
        title="Remove Client Login?"
        message={`Are you sure you want to remove the login account for ${clientLoginToRemove?.name || 'this client'}? Their client profile, bookings, and proofing gallery will remain intact.`}
      />

      {/* Add / Edit Client Modal (Clean Contact Form — Identical to TeamPage) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingClient
            ? `Edit Client: ${editingClient.name}`
            : 'New Client Registration'
        }
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Full Name / Family Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tariq Mehmood Family"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Primary Phone *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => {
                  const nextPhoneVal = e.target.value;
                  setPhone(nextPhoneVal);
                  if (
                    !editingClient &&
                    (!modalPortalPassword || modalPortalPassword.startsWith('RS@'))
                  ) {
                    const digits = nextPhoneVal.replace(/[^0-9]/g, '');
                    setModalPortalPassword(`RS@${digits.slice(-4) || '2026'}`);
                  }
                }}
                placeholder="0300-8411223"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Same as phone if blank"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Email Address (Login Email)
                </label>
                {name.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const suggestions = buildSuggestedClientEmails(name, phone);
                      if (suggestions[0]?.email) setEmail(suggestions[0].email);
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Use Suggested Email</span>
                  </button>
                )}
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@royalstudio.online"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
              {name.trim() && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">
                    Suggested:
                  </span>
                  {buildSuggestedClientEmails(name, phone).map((item) => (
                    <button
                      key={item.email}
                      type="button"
                      onClick={() => setEmail(item.email)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
                        email.trim().toLowerCase() === item.email
                          ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                          : 'bg-gray-50 hover:bg-amber-50 border-gray-200 text-gray-600'
                      }`}
                    >
                      {item.email}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Residential / Venue Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            {/* Client Login Credentials Provisioning inside Add/Edit Client Modal */}
            <div className="sm:col-span-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createLoginOnSave}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCreateLoginOnSave(checked);
                      if (checked) {
                        const emailSug = buildSuggestedClientEmails(name, phone, email);
                        if (!email.trim() && emailSug[0]?.email) {
                          setEmail(emailSug[0].email);
                        }
                        const passSug = buildSuggestedClientPasswords(name, phone);
                        if (!modalPortalPassword.trim() && passSug[0]?.password) {
                          setModalPortalPassword(passSug[0].password);
                        }
                      }
                    }}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                    <span>Provision Client Portal Login Credentials</span>
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  /client-portal
                </span>
              </label>

              {createLoginOnSave && (
                <div className="space-y-2 pt-1 border-t border-amber-200/70">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gray-700">
                      Portal Password *
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setModalPortalPassword(generateClientPassword(phone))
                      }
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate Random</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={modalPortalPassword}
                    onChange={(e) => setModalPortalPassword(e.target.value)}
                    placeholder="e.g. RS@1223"
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-amber-800 uppercase">
                      Suggested Passwords:
                    </span>
                    {buildSuggestedClientPasswords(name, phone).map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setModalPortalPassword(item.password)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
                          modalPortalPassword.trim() === item.password
                            ? 'bg-amber-200 border-amber-500 text-amber-950 font-bold'
                            : 'bg-white hover:bg-amber-100 border-amber-200 text-gray-700'
                        }`}
                      >
                        {item.password} ({item.label})
                      </button>
                    ))}
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 text-white text-[11px] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-400">Login Email: </span>
                      <span className="font-mono font-semibold text-amber-300">
                        {email.trim().toLowerCase() ||
                          buildSuggestedClientEmails(name, phone)[0]?.email ||
                          'client@royalstudio.online'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Password: </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {modalPortalPassword.trim() ||
                          buildSuggestedClientPasswords(name, phone)[0]?.password ||
                          'RS@2026'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Client Preferences &amp; Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingClient}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              {isSavingClient
                ? 'Saving...'
                : editingClient
                  ? 'Save Client'
                  : 'Create Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CLIENT GALLERY, CLOUD DELIVERY & BOOKINGS WORKSPACE MODAL (Duplication-Free) */}
      <Modal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClientId(null)}
        title={
          selectedClient
            ? `${selectedClient.name} — Proofing Gallery, Cloud Delivery & Bookings`
            : 'Client Workspace'
        }
        size="xl"
      >
        {selectedClient &&
          (() => {
            const clientEventIds = new Set(
              selectedClientEvents.map((e) => e.id)
            );
            const clientPayments = payments.filter(
              (p) =>
                (p.clientId === selectedClient.id ||
                  clientEventIds.has(p.eventId)) &&
                p.verificationStatus !== 'Rejected'
            );
            const m = clientMetrics[selectedClient.id] || {
              eventCount: 0,
              totalBilled: 0,
              totalSpent: 0,
              balance: 0,
              totalPhotos: 0,
              selectedPhotos: 0,
            };

            const allGalleryPhotos = activeProofingGallery?.photos || [];
            const activeSelectedPhotosCount = allGalleryPhotos.filter(
              (p) => p.isSelectedForAlbum
            ).length;
            const filteredGalleryPhotos = allGalleryPhotos.filter((p) => {
              if (galleryFilter === 'FAVORITES') return Boolean(p.isSelectedForAlbum);
              if (galleryFilter === 'NOTES')
                return Boolean(p.retouchingNote && p.retouchingNote.trim());
              return true;
            });

            return (
              <div className="space-y-5">
                {/* Workspace Navigation Tabs (No Duplicate Profile/Password Tab) */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveProfileTab('PROOFING')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeProfileTab === 'PROOFING'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>
                        1. Proofing Gallery &amp; Uploads (
                        {activeClientEvent
                          ? `${activeSelectedPhotosCount}/${allGalleryPhotos.length}`
                          : `${m.selectedPhotos}/${m.totalPhotos}`}
                        )
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveProfileTab('MEDIA_DELIVERY')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeProfileTab === 'MEDIA_DELIVERY'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>2. Cloud Media Delivery (Drive &amp; 4K Films)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveProfileTab('BOOKINGS')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeProfileTab === 'BOOKINGS'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        3. Event Bookings ({selectedClientEvents.length})
                      </span>
                    </button>
                  </div>
                </div>

                {/* ================= TAB 3: EVENT BOOKINGS ================= */}
                {activeProfileTab === 'BOOKINGS' && (
                  <div className="space-y-5">
                    {/* Booked Events for this Client */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Booked Events ({selectedClientEvents.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowQuickEventForm((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Event Booking for {selectedClient.name}</span>
                        </button>
                      </div>

                      {showQuickEventForm && (
                        <form
                          onSubmit={handleQuickCreateEventForClient}
                          className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end text-xs"
                        >
                          <div className="sm:col-span-2">
                            <label className="block font-bold text-gray-700 mb-1">
                              Event Title
                            </label>
                            <input
                              type="text"
                              value={newEventTitle}
                              onChange={(e) => setNewEventTitle(e.target.value)}
                              placeholder={`${selectedClient.name} — ${newEventCategory}`}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">
                              Category
                            </label>
                            <select
                              value={newEventCategory}
                              onChange={(e) =>
                                setNewEventCategory(e.target.value as EventCategory)
                              }
                              className="w-full px-2.5 py-2 rounded-lg bg-white border border-gray-300"
                            >
                              <option value="Wedding">Wedding</option>
                              <option value="Engagement">Engagement</option>
                              <option value="Mehndi">Mehndi</option>
                              <option value="Barat">Barat</option>
                              <option value="Walima">Walima</option>
                              <option value="Birthday">Birthday</option>
                              <option value="Corporate">Corporate</option>
                              <option value="Portrait">Portrait</option>
                              <option value="Fashion">Fashion</option>
                              <option value="Product">Product</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">
                              Venue
                            </label>
                            <input
                              type="text"
                              value={newEventVenue}
                              onChange={(e) => setNewEventVenue(e.target.value)}
                              placeholder="Royal Marquee"
                              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">
                              Event Date
                            </label>
                            <input
                              type="date"
                              value={newEventDate}
                              onChange={(e) => setNewEventDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">
                              Package Price (PKR)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={newEventPrice}
                              onChange={(e) =>
                                setNewEventPrice(Number(e.target.value))
                              }
                              className="w-full px-2.5 py-2 rounded-lg bg-white border border-gray-300 font-mono"
                            />
                          </div>
                          <div className="sm:col-span-6 flex flex-wrap items-end justify-between gap-3 pt-2 border-t border-amber-200/80">
                            <div className="w-full sm:w-56">
                              <label className="block font-bold text-gray-700 mb-1">
                                Initial Advance Deposit Paid (PKR)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={newEventAdvance}
                                onChange={(e) =>
                                  setNewEventAdvance(Number(e.target.value))
                                }
                                placeholder="0"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-300 font-mono"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowQuickEventForm(false)}
                                className="py-2 px-3 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={creatingQuickEvent}
                                className="py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold whitespace-nowrap cursor-pointer"
                              >
                                {creatingQuickEvent ? 'Creating Booking...' : 'Create Event Booking'}
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      {selectedClientEvents.length === 0 ? (
                        <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                          <p className="text-xs text-gray-600">
                            No events booked for {selectedClient.name} yet.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowQuickEventForm(true)}
                            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                          >
                            + Create First Event to Enable Proofing Gallery
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedClientEvents.map((evt) => {
                            const gal = getEventProofingGallery(evt.id);
                            return (
                              <div
                                key={evt.id}
                                className="p-3.5 bg-white border border-gray-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400 transition-colors"
                              >
                                <div>
                                  <div className="font-bold text-xs text-gray-900">
                                    {evt.title}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    {formatDate(evt.eventDate)} • {evt.venue} •{' '}
                                    <span className="text-rose-600 font-semibold">
                                      {gal.photos.length} Proofing Photos (
                                      {
                                        gal.photos.filter(
                                          (p) => p.isSelectedForAlbum
                                        ).length
                                      }{' '}
                                      Selected)
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-right mr-2">
                                    <div className="text-xs font-mono font-bold text-gray-900">
                                      {formatPKR(evt.packagePrice)}
                                    </div>
                                    <StatusBadge status={evt.status} size="sm" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEventId(evt.id);
                                      setActiveProfileTab('PROOFING');
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Upload className="w-3 h-3" />
                                    <span>Manage Gallery</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedClientId(null);
                                      navigate(`/events/${evt.id}`);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Event ERP</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Payment History & Direct Payment Recording */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                          Payment History ({clientPayments.length}) • Total Paid:{' '}
                          <span className="text-emerald-700 font-mono">
                            {formatPKR(m.totalSpent)}
                          </span>{' '}
                          • Balance Due:{' '}
                          <span className="text-rose-600 font-mono">
                            {formatPKR(m.balance)}
                          </span>
                        </h4>
                        {selectedClientEvents.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowQuickPaymentForm((prev) => !prev)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>
                        )}
                      </div>

                      {showQuickPaymentForm && selectedClientEvents.length > 0 && (
                        <form
                          onSubmit={handleQuickRecordPayment}
                          className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end text-xs"
                        >
                          <div className="sm:col-span-2">
                            <label className="block font-bold text-gray-700 mb-1">
                              Target Event
                            </label>
                            <select
                              value={quickPayEventId || selectedClientEvents[0]?.id}
                              onChange={(e) => setQuickPayEventId(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg bg-white border border-gray-300"
                            >
                              {selectedClientEvents.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                  {ev.title} ({formatPKR(ev.packagePrice)})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">
                              Amount (PKR)
                            </label>
                            <input
                              type="number"
                              min={1}
                              required
                              value={quickPayAmount}
                              onChange={(e) => setQuickPayAmount(Number(e.target.value))}
                              className="w-full px-2.5 py-2 rounded-lg bg-white border border-gray-300 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-gray-700 mb-1">
                              Method
                            </label>
                            <select
                              value={quickPayMethod}
                              onChange={(e) => setQuickPayMethod(e.target.value)}
                              className="w-full px-2.5 py-2 rounded-lg bg-white border border-gray-300"
                            >
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Cash">Cash</option>
                              <option value="JazzCash">JazzCash</option>
                              <option value="EasyPaisa">EasyPaisa</option>
                              <option value="RAAST">RAAST</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={quickPayReference}
                              onChange={(e) => setQuickPayReference(e.target.value)}
                              placeholder="Ref / Note"
                              className="w-full px-2.5 py-2 rounded-lg bg-white border border-gray-300"
                            />
                            <button
                              type="submit"
                              disabled={recordingPayment}
                              className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold whitespace-nowrap cursor-pointer"
                            >
                              {recordingPayment ? '...' : 'Save'}
                            </button>
                          </div>
                        </form>
                      )}

                      {clientPayments.length === 0 ? (
                        <p className="text-xs text-gray-400">
                          No payments recorded yet.
                        </p>
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                              <tr>
                                <th className="py-2 px-3">Receipt ID</th>
                                <th className="py-2 px-3">Date</th>
                                <th className="py-2 px-3">Method &amp; Ref</th>
                                <th className="py-2 px-3 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {clientPayments.map((p) => (
                                <tr key={p.id}>
                                  <td className="py-2 px-3 font-semibold">
                                    {p.paymentId}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">
                                    {formatDate(p.paymentDate)}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="font-medium">{p.method}</span>
                                    {p.reference ? (
                                      <span className="text-gray-400 ml-1.5">
                                        ({p.reference})
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                                    {formatPKR(p.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ================= TAB 2: PROOFING GALLERY & UPLOADS ================= */}
                {activeProfileTab === 'PROOFING' && (
                  <div className="space-y-4">
                    {!activeClientEvent || !activeProofingGallery ? (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                        <ImageIcon className="w-8 h-8 text-rose-500 mx-auto" />
                        <h4 className="text-sm font-bold text-gray-900">
                          Create an Event Booking to Upload Proofing Photos
                        </h4>
                        <p className="text-xs text-gray-500 max-w-md mx-auto">
                          Create an event booking for {selectedClient.name} so you can upload proofing gallery photos and enable album selection in their{' '}
                          <code>/client-portal</code> account.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveProfileTab('BOOKINGS');
                            setShowQuickEventForm(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                        >
                          + Create Event Booking for {selectedClient.name}
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Event Selector if client has multiple events */}
                        {selectedClientEvents.length > 1 && (
                          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="text-xs font-bold text-gray-700">
                              Select Client Event Gallery:
                            </span>
                            <select
                              value={activeClientEvent.id}
                              onChange={(e) => setSelectedEventId(e.target.value)}
                              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900"
                            >
                              {selectedClientEvents.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                  {ev.title} ({formatDate(ev.eventDate)})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Album Status & Selection Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-rose-700">
                              Client Album Selection
                            </span>
                            <div className="text-xl font-black text-rose-900 font-mono">
                              {
                                allGalleryPhotos.filter(
                                  (p) => p.isSelectedForAlbum
                                ).length
                              }{' '}
                              / {activeProofingGallery.maxAlbumSelection || 150}
                            </div>
                            <div className="text-[11px] text-rose-700">
                              {
                                allGalleryPhotos.filter(
                                  (p) =>
                                    p.retouchingNote &&
                                    p.retouchingNote.trim().length > 0
                                ).length
                              }{' '}
                              frames with client retouching notes
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                            <span className="text-[10px] font-bold uppercase text-gray-500">
                              Album Min / Max Frame Limits
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={minAlbumDraft}
                                onChange={(e) =>
                                  setMinAlbumDraft(Number(e.target.value))
                                }
                                className="w-20 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                                title="Minimum photos"
                              />
                              <span className="text-xs text-gray-400">to</span>
                              <input
                                type="number"
                                value={maxAlbumDraft}
                                onChange={(e) =>
                                  setMaxAlbumDraft(Number(e.target.value))
                                }
                                className="w-20 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                                title="Maximum photos"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const minVal = Math.max(1, Number(minAlbumDraft) || 100);
                                  const maxVal = Math.max(1, Number(maxAlbumDraft) || 150);
                                  if (minVal > maxVal) {
                                    addToast(
                                      'Minimum album selection cannot exceed maximum album selection.',
                                      'error'
                                    );
                                    return;
                                  }
                                  updateEventProofingGallery(
                                    activeClientEvent.id,
                                    {
                                      minAlbumSelection: minVal,
                                      maxAlbumSelection: maxVal,
                                      targetCountMin: minVal,
                                      targetCountMax: maxVal,
                                      isPinProtected: false,
                                    }
                                  );
                                }}
                                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                              >
                                Save Limits
                              </button>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-gray-500">
                                Proofing Status
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {activeProofingGallery.selectionStatus}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateEventProofingGallery(
                                    activeClientEvent.id,
                                    {
                                      selectionStatus: 'Approved',
                                    }
                                  )
                                }
                                className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                Approve Selection
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateEventProofingGallery(
                                    activeClientEvent.id,
                                    {
                                      selectionStatus: 'Open',
                                    }
                                  )
                                }
                                className="py-1.5 px-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-[11px] font-bold cursor-pointer"
                              >
                                Re-open
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Upload Proofing Photos Card */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-gray-900">
                                Upload Proofing Photos for {selectedClient.name}
                              </h4>
                              <p className="text-[11px] text-gray-500">
                                Uploaded photos appear immediately in {selectedClient.name}&apos;s{' '}
                                <code>/client-portal</code> Proofing Gallery tab.
                              </p>
                            </div>
                            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs">
                              <Upload className="w-3.5 h-3.5" />
                              <span>
                                {uploadingFiles
                                  ? 'Uploading Photos...'
                                  : 'Upload Photo Files from Computer / Phone'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={uploadingFiles}
                                className="hidden"
                                onChange={handleLocalFilesUpload}
                              />
                            </label>
                          </div>

                          <form
                            onSubmit={handleAddSinglePhotoUrl}
                            className="grid grid-cols-1 sm:grid-cols-5 gap-2"
                          >
                            <input
                              type="text"
                              value={photoTitle}
                              onChange={(e) => setPhotoTitle(e.target.value)}
                              placeholder="Frame Title (e.g. Bridal Stage)"
                              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                            />
                            <input
                              type="url"
                              value={photoUrl}
                              onChange={(e) => setPhotoUrl(e.target.value)}
                              placeholder="Image URL (https://...)"
                              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                            />
                            <input
                              type="text"
                              value={photoDayLabel}
                              onChange={(e) => setPhotoDayLabel(e.target.value)}
                              placeholder="Day (e.g. Day 2 · Barat)"
                              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                            />
                            <select
                              value={photoCategory}
                              onChange={(e) =>
                                setPhotoCategory(e.target.value as any)
                              }
                              className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                            >
                              <option value="Couple Portrait">
                                Couple Portrait
                              </option>
                              <option value="Bridal Portrait">
                                Bridal Portrait
                              </option>
                              <option value="Stage & Decor">
                                Stage &amp; Decor
                              </option>
                              <option value="Family & Guests">
                                Family &amp; Guests
                              </option>
                              <option value="Candid Moments">
                                Candid Moments
                              </option>
                              <option value="Details & Jewelry">
                                Details &amp; Jewelry
                              </option>
                            </select>
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                            >
                              + Add Image URL
                            </button>
                          </form>
                        </div>

                        {/* Filter Pills */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setGalleryFilter('ALL')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                galleryFilter === 'ALL'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              All Photos ({allGalleryPhotos.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setGalleryFilter('FAVORITES')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                galleryFilter === 'FAVORITES'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              ♥ Client Favorites (
                              {
                                allGalleryPhotos.filter(
                                  (p) => p.isSelectedForAlbum
                                ).length
                              }
                              )
                            </button>
                            <button
                              type="button"
                              onClick={() => setGalleryFilter('NOTES')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                                galleryFilter === 'NOTES'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              With Retouching Notes (
                              {
                                allGalleryPhotos.filter(
                                  (p) =>
                                    p.retouchingNote &&
                                    p.retouchingNote.trim().length > 0
                                ).length
                              }
                              )
                            </button>
                          </div>
                        </div>

                        {/* Proofing Gallery Grid */}
                        {filteredGalleryPhotos.length === 0 ? (
                          <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                            <p className="text-xs text-gray-600 font-medium">
                              No photos match the current filter ({galleryFilter}).
                            </p>
                            {galleryFilter !== 'ALL' && (
                              <button
                                type="button"
                                onClick={() => setGalleryFilter('ALL')}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold cursor-pointer"
                              >
                                Show All Photos ({allGalleryPhotos.length})
                              </button>
                            )}
                          </div>
                        ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
                          {filteredGalleryPhotos.map((photo, idx) => {
                            const isSelected = Boolean(photo.isSelectedForAlbum);
                            return (
                              <div
                                key={photo.id}
                                className={`group relative rounded-xl overflow-hidden bg-slate-950 border transition-all flex flex-col ${
                                  isSelected
                                    ? 'border-rose-500 ring-2 ring-rose-500/30'
                                    : 'border-gray-200'
                                }`}
                              >
                                <div className="relative aspect-[4/3] overflow-hidden">
                                  <img
                                    src={photo.url}
                                    alt={photo.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono font-bold text-white">
                                    {photo.code || `#${idx + 1}`}
                                  </span>
                                  <div className="absolute top-2 right-2 flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleGalleryFavorite(photo.id)
                                      }
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                                        isSelected
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-black/70 text-white hover:bg-rose-600'
                                      }`}
                                      title="Toggle Album Selection"
                                    >
                                      <Heart
                                        className={`w-2.5 h-2.5 ${
                                          isSelected ? 'fill-white' : ''
                                        }`}
                                      />
                                      <span>{isSelected ? 'Fav' : 'Select'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteGalleryPhoto(photo.id)
                                      }
                                      className="p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white cursor-pointer"
                                      title="Delete Photo"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                  <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-1">
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-bold text-white truncate">
                                        {photo.title}
                                      </p>
                                      <p className="text-[9px] text-amber-300 font-semibold truncate">
                                        {photo.category} · {photo.dayLabel}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingNotePhotoId(photo.id);
                                        setEditingNoteText(photo.retouchingNote || '');
                                      }}
                                      className="px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[9px] text-white font-semibold shrink-0 cursor-pointer"
                                      title="Add or edit retouching note"
                                    >
                                      Note
                                    </button>
                                  </div>
                                </div>
                                {editingNotePhotoId === photo.id ? (
                                  <div className="p-2 bg-amber-50 border-t border-amber-200 space-y-1.5">
                                    <input
                                      type="text"
                                      value={editingNoteText}
                                      onChange={(e) => setEditingNoteText(e.target.value)}
                                      placeholder="Retouching note for this frame..."
                                      className="w-full px-2 py-1 bg-white border border-amber-300 rounded text-[10px] text-gray-900"
                                    />
                                    <div className="flex justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setEditingNotePhotoId(null)}
                                        className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-[9px] font-bold cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const nextPhotos =
                                            activeProofingGallery.photos.map((p) =>
                                              p.id === photo.id
                                                ? {
                                                    ...p,
                                                    retouchingNote: editingNoteText.trim(),
                                                  }
                                                : p
                                            );
                                          await updateEventProofingGallery(
                                            activeClientEvent.id,
                                            { photos: nextPhotos }
                                          );
                                          setEditingNotePhotoId(null);
                                        }}
                                        className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-bold cursor-pointer"
                                      >
                                        Save Note
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  photo.retouchingNote && (
                                    <div className="p-2 bg-amber-50 text-[10px] text-amber-900 border-t border-amber-200">
                                      <strong>Client Note:</strong>{' '}
                                      {photo.retouchingNote}
                                    </div>
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ================= TAB 3: CLOUD MEDIA DELIVERY (GOOGLE DRIVE & 4K FILMS) ================= */}
                {activeProfileTab === 'MEDIA_DELIVERY' && (
                  <div className="space-y-4">
                    {selectedClientEvents.length > 1 && activeClientEvent && (
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <span className="text-xs font-bold text-gray-700">
                          Select Client Event Media Vault:
                        </span>
                        <select
                          value={activeClientEvent.id}
                          onChange={(e) => setSelectedEventId(e.target.value)}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900"
                        >
                          {selectedClientEvents.map((ev) => (
                            <option key={ev.id} value={ev.id}>
                              {ev.title} ({formatDate(ev.eventDate)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Google Drive Folder Configuration */}
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                          <HardDrive className="w-4 h-4" />
                          <span>
                            Google Drive High-Resolution Photo Archive
                          </span>
                        </div>
                        {driveFolderUrlDraft && (
                          <a
                            href={driveFolderUrlDraft}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Test Drive Link</span>
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-gray-700 mb-1">
                            Google Drive Shared Folder URL
                          </label>
                          <input
                            type="url"
                            value={driveFolderUrlDraft}
                            onChange={(e) =>
                              setDriveFolderUrlDraft(e.target.value)
                            }
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">
                            Archive Size (GB)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={driveTotalGbDraft}
                            onChange={(e) =>
                              setDriveTotalGbDraft(Number(e.target.value))
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono text-xs"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block font-semibold text-gray-700 mb-1">
                            Archive Display Title in Client Portal
                          </label>
                          <input
                            type="text"
                            value={driveFolderNameDraft}
                            onChange={(e) =>
                              setDriveFolderNameDraft(e.target.value)
                            }
                            placeholder="Royal Studio · High-Res Edited & RAW Photo Archive"
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      {/* Add Google Drive Subfolder */}
                      <form
                        onSubmit={handleAddDriveSubfolder}
                        className="grid grid-cols-1 sm:grid-cols-7 gap-2 pt-3 border-t border-gray-200 text-xs"
                      >
                        <input
                          type="text"
                          value={newSubfolderName}
                          onChange={(e) => setNewSubfolderName(e.target.value)}
                          placeholder="Subfolder Name (e.g. 01 · Barat Edited)"
                          className="sm:col-span-2 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg"
                        />
                        <select
                          value={newSubfolderType}
                          onChange={(e) =>
                            setNewSubfolderType(
                              e.target.value as ClientGoogleDriveFolderItem['folderType']
                            )
                          }
                          className="px-2 py-1.5 bg-white border border-gray-300 rounded-lg"
                        >
                          <option value="High-Res Edited">High-Res Edited</option>
                          <option value="RAW Archive">RAW Archive</option>
                          <option value="Album Print Ready">Album Print Ready</option>
                          <option value="Social Media Reels">Social Media Reels</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={newSubfolderFiles}
                          onChange={(e) =>
                            setNewSubfolderFiles(Number(e.target.value))
                          }
                          placeholder="Files (350)"
                          title="Photo / File Count"
                          className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono"
                        />
                        <input
                          type="number"
                          step="0.1"
                          min={0.1}
                          value={newSubfolderSizeGb}
                          onChange={(e) =>
                            setNewSubfolderSizeGb(Number(e.target.value))
                          }
                          placeholder="Size (GB)"
                          title="Subfolder Size in GB"
                          className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono"
                        />
                        <input
                          type="url"
                          value={newSubfolderUrl}
                          onChange={(e) => setNewSubfolderUrl(e.target.value)}
                          placeholder="Subfolder URL (optional)"
                          className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer"
                        >
                          + Add Folder
                        </button>
                      </form>

                      {driveSubfoldersDraft.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {driveSubfoldersDraft.map((folder) => {
                            const folderLink = folder.folderUrl || folder.driveUrl || driveFolderUrlDraft;
                            return (
                              <div
                                key={folder.id}
                                className="p-2.5 bg-white rounded-lg border border-gray-200 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-gray-900">
                                    {folder.folderName}
                                  </span>{' '}
                                  <span className="text-[11px] text-gray-500 font-mono">
                                    ({folder.folderType || 'High-Res Edited'} · {folder.fileCount} files ·{' '}
                                    {folder.sizeGb} GB)
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {folderLink && (
                                    <a
                                      href={folderLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold flex items-center gap-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Open</span>
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveDriveSubfolder(folder.id)
                                    }
                                    className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                                    title="Remove Subfolder"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* YouTube Unlisted 4K Films Configuration */}
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
                          <Video className="w-4 h-4" />
                          <span>YouTube Unlisted 4K Wedding Films &amp; Playlist</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">
                            YouTube Unlisted Playlist URL
                          </label>
                          <input
                            type="url"
                            value={ytPlaylistUrlDraft}
                            onChange={(e) =>
                              setYtPlaylistUrlDraft(e.target.value)
                            }
                            placeholder="https://www.youtube.com/watch?v=...&list=..."
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">
                            Playlist Title
                          </label>
                          <input
                            type="text"
                            value={ytPlaylistTitleDraft}
                            onChange={(e) =>
                              setYtPlaylistTitleDraft(e.target.value)
                            }
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      {/* Add Individual Unlisted Film */}
                      <form
                        onSubmit={handleAddYoutubeVideo}
                        className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-gray-200 text-xs"
                      >
                        <input
                          type="text"
                          value={newVideoTitle}
                          onChange={(e) => setNewVideoTitle(e.target.value)}
                          placeholder="Film Title (e.g. 4K Barat Highlight)"
                          className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={newVideoUrl}
                          onChange={(e) => setNewVideoUrl(e.target.value)}
                          placeholder="YouTube URL or Video ID"
                          className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono"
                        />
                        <select
                          value={newVideoType}
                          onChange={(e) =>
                            setNewVideoType(
                              e.target.value as YouTubeUnlistedVideoItem['videoType']
                            )
                          }
                          className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg"
                        >
                          <option value="Teaser">Teaser</option>
                          <option value="Highlight Film">Highlight Film</option>
                          <option value="Couple Highlight">
                            Couple Highlight
                          </option>
                          <option value="Mehndi Coverage">
                            Mehndi Coverage
                          </option>
                          <option value="Barat Coverage">Barat Coverage</option>
                          <option value="Walima Coverage">
                            Walima Coverage
                          </option>
                          <option value="Full Film">Full Film</option>
                          <option value="Full Feature Film">
                            Full Feature Film
                          </option>
                          <option value="Drone Reel">Drone Reel</option>
                        </select>
                        <input
                          type="text"
                          value={newVideoDuration}
                          onChange={(e) => setNewVideoDuration(e.target.value)}
                          placeholder="Duration (04:15)"
                          className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer"
                        >
                          + Add 4K Film
                        </button>
                      </form>

                      {unlistedVideosDraft.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          {unlistedVideosDraft.map((vid) => (
                            <div
                              key={vid.id}
                              className="p-2.5 bg-white rounded-lg border border-gray-200 flex items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <span className="font-bold text-gray-900">
                                  {vid.title}
                                </span>{' '}
                                <span className="text-[11px] text-gray-500 font-mono">
                                  ({vid.videoType} · {vid.duration})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveYoutubeVideo(vid.id)}
                                className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={savingMediaDelivery}
                        onClick={() => handleSaveMediaDelivery()}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                      >
                        {savingMediaDelivery
                          ? 'Saving Media Delivery...'
                          : `Save Google Drive & 4K Films to ${selectedClient.name}'s Profile`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
      </Modal>

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            const hasEvents = events.some((e) => e.clientId === deleteTarget.id);
            deleteClient(deleteTarget.id, hasEvents);
            if (selectedClientId === deleteTarget.id) {
              setSelectedClientId(null);
            }
          }
        }}
        title="Delete Client Profile"
        message={
          deleteTarget
            ? events.some((e) => e.clientId === deleteTarget.id)
              ? `Are you sure you want to delete "${deleteTarget.name}"? This will also permanently remove their ${events.filter((e) => e.clientId === deleteTarget.id).length} booked event(s), invoices, and proofing gallery.`
              : `Are you sure you want to delete "${deleteTarget.name}"?`
            : ''
        }
        confirmLabel="Delete Client"
      />
    </div>
  );
};
