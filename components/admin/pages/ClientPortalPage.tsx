import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Clock,
  CreditCard,
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Heart,
  Lock,
  User as UserIcon,
  Phone,
  Mail,
  Save,
  Copy,
  Check,
  Upload,
  Camera,
  Users,
  ShieldCheck,
  BookOpen,
  MessageCircle,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStudioData } from '../context/StudioDataContext';
import { apiRequest } from '../services/api';
import { formatPKR, formatDate } from '../utils/calculations';
import { generateInvoicePDF, generateQuotationPDF } from '../utils/pdfGenerator';
import { PaymentMethod } from '../types';

export type ClientPortalTab = 'EVENTS' | 'PAYMENTS' | 'GALLERY' | 'PROFILE';

interface ClientPortalPageProps {
  initialTab?: ClientPortalTab;
}

export const ClientPortalPage: React.FC<ClientPortalPageProps> = ({
  initialTab = 'EVENTS',
}) => {
  const { user } = useAuth();
  const {
    profile,
    clients,
    events,
    daySchedules,
    invoices,
    payments,
    quotations,
    tasks,
    teamMembers,
    teamAssignments,
    packages,
    createPayment,
    refreshAll,
    addToast,
  } = useStudioData();

  const [activeTab, setActiveTab] = useState<ClientPortalTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const myClient = useMemo(() => {
    return (
      clients.find(
        (c) =>
          c.id === user?.linkedClientId ||
          c.userId === user?.id ||
          (user?.email && c.email?.toLowerCase() === user.email.toLowerCase())
      ) || clients[0]
    );
  }, [clients, user]);

  const myEvents = useMemo(() => {
    if (!myClient) return events;
    const filtered = events.filter((e) => e.clientId === myClient.id);
    return filtered.length > 0 ? filtered : events;
  }, [events, myClient]);

  const myEventIds = useMemo(() => new Set(myEvents.map((e) => e.id)), [myEvents]);

  const myPayments = useMemo(
    () => payments.filter((p) => myEventIds.has(p.eventId)),
    [payments, myEventIds]
  );

  const myInvoices = useMemo(
    () => invoices.filter((inv) => myEventIds.has(inv.eventId)),
    [invoices, myEventIds]
  );

  const myQuotations = useMemo(
    () => quotations.filter((q) => myEventIds.has(q.eventId)),
    [quotations, myEventIds]
  );

  // Financial Summary across all client events
  const totalContractValue = useMemo(
    () => myEvents.reduce((sum, e) => sum + Number(e.packagePrice || 0), 0),
    [myEvents]
  );

  const totalVerifiedPaid = useMemo(
    () =>
      myPayments
        .filter(
          (p) =>
            p.verificationStatus !== 'Pending Verification' &&
            p.verificationStatus !== 'Rejected'
        )
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [myPayments]
  );

  const totalPendingDeposits = useMemo(
    () =>
      myPayments
        .filter((p) => p.verificationStatus === 'Pending Verification')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    [myPayments]
  );

  const totalRemainingBalance = Math.max(0, totalContractValue - totalVerifiedPaid);

  // Deposit Upload Form State
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('Bank Transfer');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [depositReference, setDepositReference] = useState<string>('');
  const [depositSenderTitle, setDepositSenderTitle] = useState<string>('');
  const [depositReceiptDataUrl, setDepositReceiptDataUrl] = useState<string>('');
  const [depositFileName, setDepositFileName] = useState<string>('');
  const [depositNotes, setDepositNotes] = useState<string>('');
  const [isUploadingDeposit, setIsUploadingDeposit] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewReceiptImage, setPreviewReceiptImage] = useState<string | null>(null);

  // Profile Edit State
  const [name, setName] = useState<string>(myClient?.name || user?.name || '');
  const [phone, setPhone] = useState<string>(myClient?.phone || user?.phone || '');
  const [whatsapp, setWhatsapp] = useState<string>(
    myClient?.whatsapp || myClient?.phone || ''
  );
  const [address, setAddress] = useState<string>(myClient?.address || '');
  const [city, setCity] = useState<string>(myClient?.city || 'Lahore');
  const [notes, setNotes] = useState<string>(myClient?.notes || '');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  useEffect(() => {
    if (myEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(myEvents[0].id);
      const suggestedAdvance = Math.round((myEvents[0].packagePrice || 0) * 0.3);
      setDepositAmount(suggestedAdvance > 0 ? suggestedAdvance : 50000);
    }
  }, [myEvents, selectedEventId]);

  useEffect(() => {
    if (myClient) {
      setName(myClient.name || user?.name || '');
      setPhone(myClient.phone || user?.phone || '');
      setWhatsapp(myClient.whatsapp || myClient.phone || '');
      setAddress(myClient.address || '');
      setCity(myClient.city || 'Lahore');
      setNotes(myClient.notes || '');
      setDepositSenderTitle(myClient.name || '');
    }
  }, [myClient?.id, user?.id]);

  const handleCopyText = (key: string, value: string) => {
    if (typeof window === 'undefined' || !value) return;
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDepositFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDepositReceiptDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEventId = selectedEventId || myEvents[0]?.id;
    if (!targetEventId) {
      addToast('No event selected for payment upload.', 'error');
      return;
    }
    if (!depositAmount || depositAmount <= 0) {
      addToast('Please enter a valid deposit amount.', 'error');
      return;
    }
    if (!depositReference.trim()) {
      addToast('Please enter your bank/wallet transaction reference ID.', 'error');
      return;
    }

    setIsUploadingDeposit(true);
    try {
      const linkedInv = myInvoices.find((inv) => inv.eventId === targetEventId);
      await createPayment({
        eventId: targetEventId,
        invoiceId: linkedInv?.id,
        amount: Number(depositAmount),
        paymentDate: new Date().toISOString().split('T')[0],
        method: depositMethod,
        reference: depositReference.trim(),
        senderAccountTitle: depositSenderTitle.trim() || name || 'Client',
        receiptImageUrl: depositReceiptDataUrl || undefined,
        verificationStatus: 'Pending Verification',
        notes:
          depositNotes.trim() ||
          `Uploaded by ${name || 'Client'} via Client Portal (${depositMethod})`,
      });
      setDepositReference('');
      setDepositReceiptDataUrl('');
      setDepositFileName('');
      setDepositNotes('');
      addToast(
        'Deposit receipt submitted! Studio Finance has been notified for verification.'
      );
    } catch {
      // Handled in context
    } finally {
      setIsUploadingDeposit(false);
    }
  };

  const handleSaveClientProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Full name is required.', 'error');
      return;
    }
    if (newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        addToast('New password must be at least 4 characters.', 'error');
        return;
      }
      if (newPassword.trim() !== confirmPassword.trim()) {
        addToast('Passwords do not match.', 'error');
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      await apiRequest('/api/me/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim(),
          address: address.trim(),
          city: city.trim(),
          notes: notes.trim(),
          newPassword: newPassword.trim() || undefined,
        }),
      });
      setNewPassword('');
      setConfirmPassword('');
      await refreshAll();
      addToast('Your client profile & preferences have been updated.');
    } catch (err: any) {
      addToast(err?.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const studioWhatsapp = (
    profile?.publicWhatsappNumber ||
    profile?.whatsapp ||
    profile?.phone ||
    '03084877073'
  ).replace(/[^0-9]/g, '');
  const formattedWa = studioWhatsapp.startsWith('92')
    ? studioWhatsapp
    : `92${studioWhatsapp.replace(/^0/, '')}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Luxury Client Portal Hero Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#121216] via-[#191920] to-[#121216] text-[#F5F2EB] border border-[#D4AF37]/35 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-display font-bold text-2xl shrink-0">
            {(myClient?.name || user?.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              <span>{profile?.studioName || 'Royal Studio'} · Private Client Portal</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              {myClient?.name || user?.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#A39E93]">
              <span>{user?.email}</span>
              {myClient?.phone && (
                <>
                  <span>·</span>
                  <span>{myClient.phone}</span>
                </>
              )}
              {myClient?.city && (
                <>
                  <span>·</span>
                  <span>{myClient.city}, Pakistan</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Pill Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0D0D0F]/90 border border-white/10 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('EVENTS')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'EVENTS'
                ? 'bg-[#D4AF37] text-[#111111] shadow-xs'
                : 'text-[#A39E93] hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>My Events ({myEvents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAYMENTS')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PAYMENTS'
                ? 'bg-[#D4AF37] text-[#111111] shadow-xs'
                : 'text-[#A39E93] hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payments &amp; Invoices</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GALLERY')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'GALLERY'
                ? 'bg-[#D4AF37] text-[#111111] shadow-xs'
                : 'text-[#A39E93] hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Photo Proofing Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PROFILE')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'bg-[#D4AF37] text-[#111111] shadow-xs'
                : 'text-[#A39E93] hover:text-white'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>My Profile</span>
          </button>
        </div>
      </div>

      {/* Quick Financial & Booking KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span>Booked Celebrations</span>
            <Calendar className="w-4 h-4 text-accent" />
          </div>
          <div className="font-display text-2xl font-bold text-primary">
            {myEvents.length} {myEvents.length === 1 ? 'Event' : 'Events'}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            Total Contract Value: <strong className="font-mono text-primary">{formatPKR(totalContractValue)}</strong>
          </div>
        </div>

        <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span>Verified Amount Paid</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatPKR(totalVerifiedPaid)}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            {totalPendingDeposits > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                + {formatPKR(totalPendingDeposits)} Pending Verification
              </span>
            ) : (
              <span>Official receipts verified by Finance</span>
            )}
          </div>
        </div>

        <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs">
          <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span>Remaining Balance</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatPKR(totalRemainingBalance)}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            30% Advance · 60% Event End · 10% Delivery
          </div>
        </div>

        <div className="p-5 bg-surface rounded-2xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Direct Studio Concierge</span>
            <MessageCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-[11px] text-text-muted leading-snug">
            Need schedule adjustments or album support? Chat with our producer.
          </p>
          <a
            href={`https://wa.me/${formattedWa}?text=${encodeURIComponent(
              `Assalam-o-Alaikum ${profile?.studioName || 'Royal Studio'}, I am logged into my Client Portal (${myClient?.name || user?.name}) and would like to discuss my event.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp Studio Concierge</span>
          </a>
        </div>
      </div>

      {/* ===================== TAB 1: MY EVENTS & COVERAGE DETAILS ===================== */}
      {activeTab === 'EVENTS' && (
        <div className="space-y-6">
          {myEvents.length === 0 ? (
            <div className="p-10 bg-surface rounded-2xl border border-border text-center space-y-3">
              <Calendar className="w-10 h-10 text-accent mx-auto" />
              <h3 className="font-display text-xl font-bold text-primary">
                No Active Events Linked Yet
              </h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Your client account is active. As soon as our studio links your wedding or event booking, your full day-by-day schedule and deliverables will appear here.
              </p>
            </div>
          ) : (
            myEvents.map((evt) => {
              const evtDays = daySchedules
                .filter((d) => d.eventId === evt.id)
                .sort((a, b) => a.dayNumber - b.dayNumber);
              const evtQuotation = myQuotations.find((q) => q.eventId === evt.id);
              const evtInvoice = myInvoices.find((inv) => inv.eventId === evt.id);
              const evtTasks = tasks.filter((t) => t.eventId === evt.id);
              const evtCrew = teamAssignments
                .filter((ta) => ta.eventId === evt.id)
                .map((ta) => {
                  const member = teamMembers.find((m) => m.id === ta.teamMemberId);
                  return {
                    id: ta.id,
                    name: member?.name || 'Senior Studio Specialist',
                    role: ta.assignedRole || member?.role || 'Production Crew',
                  };
                });
              const pkg = packages.find((p) => p.id === evt.packageId);
              const galleryPhotos = evt.proofingGallery?.photos || [];
              const selectedPhotosCount = galleryPhotos.filter(
                (p) => p.isSelectedForAlbum
              ).length;

              return (
                <div
                  key={evt.id}
                  className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden space-y-6 p-6 sm:p-7"
                >
                  {/* Event Header */}
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-border pb-5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold uppercase tracking-wider">
                          {evt.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          Status: {evt.status}
                        </span>
                        {pkg && (
                          <span className="px-2.5 py-0.5 rounded-full bg-background border border-border text-text-muted text-[10px] font-semibold">
                            Package: {pkg.name}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-2xl sm:text-3xl font-bold text-primary">
                        {evt.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-accent" />
                          Primary Date: <strong className="text-primary">{formatDate(evt.eventDate)}</strong>
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-accent" />
                          {evt.startTime || '18:00'} – {evt.endTime || '23:00'}
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-accent" />
                          {evt.venue}, {evt.city}
                        </span>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link
                        href={`/proposal/${encodeURIComponent(evtQuotation?.id || evt.id)}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:opacity-90 text-[#111111] text-xs font-bold transition-opacity"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Interactive Proposal</span>
                      </Link>

                      <Link
                        href={`/gallery/${encodeURIComponent(evt.id)}?unlocked=1`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-white/10 text-xs font-bold transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                        <span>
                          Proofing Gallery ({selectedPhotosCount}/
                          {evt.proofingGallery?.targetCountMax || 150})
                        </span>
                      </Link>

                      {evtQuotation && myClient && profile && (
                        <button
                          type="button"
                          onClick={() =>
                            generateQuotationPDF(
                              evtQuotation,
                              evt,
                              myClient,
                              profile,
                              evtDays
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:border-accent text-xs font-semibold text-primary cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-accent" />
                          <span>Quote PDF</span>
                        </button>
                      )}

                      {evtInvoice && myClient && profile && (
                        <button
                          type="button"
                          onClick={() =>
                            generateInvoicePDF(
                              evtInvoice,
                              evt,
                              myClient,
                              profile,
                              evtDays,
                              myPayments.filter((p) => p.eventId === evt.id)
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:border-accent text-xs font-semibold text-primary cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-accent" />
                          <span>Invoice PDF</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Event Financial Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-background border border-border text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                        Package &amp; Add-Ons Total
                      </span>
                      <span className="font-mono text-base font-bold text-primary">
                        {formatPKR(evt.packagePrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                        Verified Amount Paid
                      </span>
                      <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPKR(evt.totalClientPayments)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between sm:block">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                          Remaining Balance
                        </span>
                        <span className="font-mono text-base font-bold text-amber-600 dark:text-amber-400">
                          {formatPKR(evt.remainingBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Day Celebration Schedule */}
                  {evtDays.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-accent" />
                        <span>Multi-Day Celebration Coverage Schedule ({evtDays.length} Days)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {evtDays.map((day) => (
                          <div
                            key={day.id}
                            className="p-4 rounded-xl bg-background border border-border space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-primary">
                                Day {day.dayNumber}: {day.eventType}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-accent">
                                {formatPKR(day.customPrice)}
                              </span>
                            </div>
                            <div className="text-text-muted space-y-1 text-[11px]">
                              <div>📅 {formatDate(day.date)}</div>
                              <div>
                                ⏰ {day.startTime} – {day.endTime} (Crew Call: {day.callTime})
                              </div>
                              <div>📍 {day.venue}</div>
                              <div className="pt-1 text-primary font-medium">
                                🎥 {day.photographersCount ?? 1} Photo ·{' '}
                                {day.cinematographersCount ?? 1} Cinema
                                {day.droneIncluded ? ' · Drone Unit' : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assigned Production Crew & Deliverable Pipeline */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                    {/* Assigned Crew */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-accent" />
                        <span>Assigned Studio Production Team ({evtCrew.length})</span>
                      </h4>
                      {evtCrew.length === 0 ? (
                        <div className="p-3 rounded-xl bg-background border border-border text-xs text-text-muted">
                          Senior photographers &amp; cinematographers are being scheduled for your dates.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {evtCrew.map((c) => (
                            <div
                              key={c.id}
                              className="px-3 py-2 rounded-xl bg-background border border-border text-xs flex items-center gap-2"
                            >
                              <Camera className="w-3.5 h-3.5 text-accent shrink-0" />
                              <div>
                                <div className="font-bold text-primary">{c.name}</div>
                                <div className="text-[10px] text-text-muted">{c.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Post-Production & Deliverable Status */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        <span>Post-Production &amp; Deliverables Tracker</span>
                      </h4>
                      {evtTasks.length === 0 ? (
                        <div className="p-3 rounded-xl bg-background border border-border text-xs text-text-muted">
                          Post-production milestones (Culling, Color Grading, Highlight Film &amp; Luxury Album) initialize automatically after the shoot.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {evtTasks.map((t) => (
                            <div
                              key={t.id}
                              className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-semibold text-primary truncate">
                                {t.title}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                  t.status === 'Completed'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : t.status === 'In Progress'
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : 'bg-white/10 text-text-muted'
                                }`}
                              >
                                {t.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===================== TAB 2: PAYMENTS, INVOICES & DEPOSIT UPLOAD ===================== */}
      {activeTab === 'PAYMENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Official Bank Channels & Payment Ledger */}
          <div className="lg:col-span-7 space-y-6">
            {/* Official Studio Bank / JazzCash / EasyPaisa / RAAST Channels */}
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    <span>Official Studio Payment Channels</span>
                  </h3>
                  <p className="text-xs text-text-muted">
                    Copy any official account or IBAN below, complete your transfer, and upload the screenshot on the right.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                      {profile?.bankName || 'Meezan Bank Limited'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          'iban',
                          profile?.iban || 'PK36MEZN0002010105829144'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-bold cursor-pointer"
                    >
                      {copiedKey === 'iban' ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedKey === 'iban' ? 'Copied IBAN' : 'Copy IBAN'}</span>
                    </button>
                  </div>
                  <div className="font-bold text-primary">
                    {profile?.accountTitle || 'Royal Studio (Muhammad Ramzan)'}
                  </div>
                  <div className="font-mono text-[11px] text-text-muted break-all">
                    IBAN: {profile?.iban || 'PK36MEZN0002010105829144'}
                  </div>
                  <div className="font-mono text-[11px] text-text-muted">
                    Account #: {profile?.accountNumber || '0201-0105829144'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-background border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                      JazzCash · EasyPaisa · RAAST
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText('wallet', profile?.phone || '0308-4877073')
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500 text-[10px] font-bold cursor-pointer"
                    >
                      {copiedKey === 'wallet' ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedKey === 'wallet' ? 'Copied #' : 'Copy Number'}</span>
                    </button>
                  </div>
                  <div className="font-bold text-primary">
                    {profile?.accountTitle || 'Muhammad Ramzan / Royal Studio'}
                  </div>
                  <div className="font-mono text-[11px] text-emerald-500">
                    JazzCash / RAAST ID: {profile?.phone || '0308-4877073'}
                  </div>
                  <div className="font-mono text-[11px] text-text-muted">
                    EasyPaisa: {profile?.phone2 || profile?.phone || '0303-2213806'}
                  </div>
                </div>
              </div>
            </div>

            {/* Client Payment & Deposit Receipt History */}
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-primary">
                    Payment &amp; Deposit Receipt Ledger ({myPayments.length})
                  </h3>
                  <p className="text-xs text-text-muted">
                    All recorded payments and uploaded transfer receipts with Finance verification status.
                  </p>
                </div>
              </div>

              {myPayments.length === 0 ? (
                <div className="p-6 rounded-xl bg-background border border-border text-center text-xs text-text-muted">
                  No payments or deposit receipts recorded yet. Use the form on the right to upload your booking advance receipt.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myPayments.map((p) => {
                    const evt = myEvents.find((e) => e.id === p.eventId);
                    const vStatus = p.verificationStatus || 'Verified';
                    return (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-sm text-primary">
                              {formatPKR(p.amount)}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-semibold text-primary">
                              {p.method}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                vStatus === 'Pending Verification'
                                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                  : vStatus === 'Rejected'
                                  ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                              }`}
                            >
                              {vStatus}
                            </span>
                          </div>
                          <div className="text-[11px] text-text-muted">
                            Event: <strong className="text-primary">{evt?.title || p.eventId}</strong> · Date: {formatDate(p.paymentDate)}
                          </div>
                          <div className="text-[11px] font-mono text-text-muted">
                            Ref: {p.reference || 'N/A'}
                            {p.senderAccountTitle ? ` · Sender: ${p.senderAccountTitle}` : ''}
                          </div>
                        </div>

                        {p.receiptImageUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewReceiptImage(p.receiptImageUrl || null)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:border-accent text-[11px] font-semibold text-primary cursor-pointer shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5 text-accent" />
                            <span>View Receipt</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Cols: Upload Digital Deposit Receipt Form */}
          <div className="lg:col-span-5">
            <form
              onSubmit={handleDepositSubmit}
              className="bg-surface rounded-2xl border border-accent/40 p-6 space-y-4 shadow-xs"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent block">
                  Instant Finance Sync
                </span>
                <h3 className="font-display text-xl font-bold text-primary">
                  Upload Deposit Receipt
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Submit your Bank / RAAST / JazzCash / EasyPaisa transfer reference and screenshot for admin verification.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Select Celebration / Event *
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs text-primary"
                >
                  {myEvents.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({formatDate(e.eventDate)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Transfer Channel *
                  </label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs text-primary"
                  >
                    <option value="Bank Transfer">Bank Transfer (IBAN)</option>
                    <option value="RAAST">RAAST Instant ID</option>
                    <option value="JazzCash">JazzCash Wallet</option>
                    <option value="EasyPaisa">EasyPaisa Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Amount Paid (PKR) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={depositAmount || ''}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs font-mono text-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Transaction Reference / TID *
                </label>
                <input
                  type="text"
                  required
                  value={depositReference}
                  onChange={(e) => setDepositReference(e.target.value)}
                  placeholder="e.g. TXN-9482710 or RAAST Ref #"
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs font-mono text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Sender Account Title
                </label>
                <input
                  type="text"
                  value={depositSenderTitle}
                  onChange={(e) => setDepositSenderTitle(e.target.value)}
                  placeholder={myClient?.name || 'Account Holder Name'}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-xs text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Transfer Screenshot (Optional Image)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptFileChange}
                  className="w-full text-xs text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-accent/20 file:text-accent hover:file:bg-accent/30 cursor-pointer"
                />
                {depositFileName && (
                  <div className="mt-1 text-[11px] text-emerald-500 font-mono">
                    Attached: {depositFileName}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Notes for Studio Finance
                </label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="e.g. 30% Booking Advance Deposit"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-primary"
                />
              </div>

              <button
                type="submit"
                disabled={isUploadingDeposit}
                className="w-full py-3 rounded-xl bg-accent hover:opacity-95 text-[#111111] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {isUploadingDeposit
                    ? 'Submitting Deposit Receipt...'
                    : 'Submit Deposit Receipt for Verification'}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: PRIVATE PHOTO PROOFING & ALBUM GALLERY ===================== */}
      {activeTab === 'GALLERY' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-2xl border border-border p-6 space-y-2">
            <h3 className="font-display text-xl font-bold text-primary flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              <span>Private Wedding Photo Proofing &amp; Luxury Album Selection</span>
            </h3>
            <p className="text-xs text-text-muted">
              Heart your favorite 100–150 wedding photos for your handcrafted Luxury Album, leave specific retouching or color notes on individual frames, and submit directly to our post-production editors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myEvents.map((evt) => {
              const gallery = evt.proofingGallery;
              const photos = gallery?.photos || [];
              const selectedCount = photos.filter((p) => p.isSelectedForAlbum).length;
              const notesCount = photos.filter(
                (p) => p.retouchingNote && p.retouchingNote.trim().length > 0
              ).length;
              const targetMin = gallery?.targetCountMin || 100;
              const targetMax = gallery?.targetCountMax || 150;
              const pinCode = gallery?.pinCode || '1234';
              const isSubmitted = gallery?.selectionStatus === 'Submitted';

              return (
                <div
                  key={evt.id}
                  className="bg-surface rounded-2xl border border-border p-6 flex flex-col justify-between gap-5 shadow-xs"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isSubmitted
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-accent/15 text-accent'
                          }`}
                        >
                          {isSubmitted ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Final Selection Submitted</span>
                            </>
                          ) : (
                            <>
                              <Heart className="w-3 h-3" />
                              <span>Open for Album Selection</span>
                            </>
                          )}
                        </span>
                        <h4 className="font-display text-xl font-bold text-primary mt-1.5">
                          {evt.title}
                        </h4>
                        <div className="text-xs text-text-muted">
                          {formatDate(evt.eventDate)} · {evt.venue}, {evt.city}
                        </div>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-background border border-border text-right">
                        <div className="text-[10px] uppercase tracking-wider text-text-muted">
                          Family PIN
                        </div>
                        <div className="font-mono text-sm font-bold text-accent">
                          {pinCode}
                        </div>
                      </div>
                    </div>

                    {/* Preview Thumbnails */}
                    {photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {photos.slice(0, 4).map((ph) => (
                          <div
                            key={ph.id}
                            className="relative aspect-4/3 rounded-lg overflow-hidden bg-black border border-border"
                          >
                            <img
                              src={ph.url}
                              alt={ph.title}
                              className="w-full h-full object-cover"
                            />
                            {ph.isSelectedForAlbum && (
                              <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#D4AF37] text-[#111111] flex items-center justify-center shadow">
                                <Heart className="w-3 h-3 fill-[#111111]" />
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-background border border-border text-center text-xs">
                      <div>
                        <div className="text-[10px] text-text-muted uppercase">Total Proofs</div>
                        <div className="font-mono font-bold text-primary">{photos.length}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase">Hearted</div>
                        <div className="font-mono font-bold text-accent">
                          {selectedCount} / {targetMax}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase">Edit Notes</div>
                        <div className="font-mono font-bold text-emerald-500">{notesCount}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          `gal-${evt.id}`,
                          typeof window !== 'undefined'
                            ? `${window.location.origin}/gallery/${evt.id}`
                            : `/gallery/${evt.id}`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-background hover:border-accent text-xs font-semibold text-primary cursor-pointer"
                    >
                      {copiedKey === `gal-${evt.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Link Copied (PIN: {pinCode})</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-accent" />
                          <span>Copy Family Link</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/gallery/${encodeURIComponent(evt.id)}?unlocked=1`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:opacity-90 text-[#111111] text-xs font-bold"
                    >
                      <Heart className="w-3.5 h-3.5 fill-[#111111]" />
                      <span>Open Proofing Gallery →</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== TAB 4: MY CLIENT PROFILE & SECURITY ===================== */}
      {activeTab === 'PROFILE' && (
        <form
          onSubmit={handleSaveClientProfile}
          className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6"
        >
          <div>
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-accent" />
              <span>My Client Profile &amp; Contact Preferences</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Keep your phone, WhatsApp, and delivery address updated for album courier handover and studio updates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-primary mb-1.5">
                Full Name / Couple Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary mb-1.5">
                Portal Login Email (Admin Managed)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 bg-background/60 border border-border rounded-xl text-sm text-text-muted cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary mb-1.5">
                Primary Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary mb-1.5">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary mb-1.5">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-primary mb-1.5">
                Album Delivery / Residential Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-primary mb-1.5">
                Special Preferences &amp; Family Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-accent" />
              <span>Change My Portal Password (Optional)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent hover:opacity-90 text-[#111111] text-xs font-bold cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Receipt Image Lightbox Modal */}
      {previewReceiptImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewReceiptImage(null)}
        >
          <div
            className="max-w-lg w-full bg-surface border border-border rounded-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Uploaded Deposit Receipt Screenshot
              </h4>
              <button
                type="button"
                onClick={() => setPreviewReceiptImage(null)}
                className="p-1 rounded-lg text-text-muted hover:text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewReceiptImage}
              alt="Deposit Receipt"
              className="w-full max-h-[70vh] object-contain rounded-xl bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
