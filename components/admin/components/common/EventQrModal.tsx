import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  CheckSquare,
  X,
  Smartphone,
  FileText,
  Camera,
} from 'lucide-react';
import { Event, EventTask, TeamMember } from '../../types';
import { formatDate } from '../../utils/calculations';
import { useStudioData } from '../../context/StudioDataContext';

interface EventQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
  tasks?: EventTask[];
  teamMembers?: TeamMember[];
  staffOnlyView?: boolean;
}

export const EventQrModal: React.FC<EventQrModalProps> = ({
  isOpen,
  onClose,
  event,
  tasks = [],
  teamMembers = [],
}) => {
  const { equipment, equipmentAssignments } = useStudioData();
  const [qrMode, setQrMode] = useState<'LINK' | 'TEXT'>('LINK');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const eventTasks = event ? tasks.filter((t) => t.eventId === event.id) : [];
  const reservedGear = event
    ? equipmentAssignments
        .filter((ea) => ea.eventId === event.id)
        .map((ea) => equipment.find((eq) => eq.id === ea.equipmentId))
        .filter(Boolean)
    : [];

  const getShareUrl = () => {
    if (!event || typeof window === 'undefined') return '';
    return `${window.location.origin}/admin?qrEvent=${encodeURIComponent(event.id)}`;
  };

  const getQrPayload = () => {
    if (!event) return '';
    const locationStr = [event.venue, event.city].filter(Boolean).join(', ') || 'Burewala';
    const timeStr = `${event.startTime || '18:00'} - ${event.endTime || '23:00'}`;

    if (qrMode === 'LINK' && typeof window !== 'undefined') {
      return getShareUrl();
    }

    const gearLines =
      reservedGear.length > 0
        ? reservedGear.map((eq) => eq?.name).join(', ')
        : 'Standard Studio Kit';

    const taskLines =
      eventTasks.length > 0
        ? eventTasks
            .map((t, idx) => {
              const assignee = teamMembers.find((m) => m.id === t.assigneeId);
              return `${idx + 1}. ${t.title} [${t.status}]${
                assignee ? ` - ${assignee.name}` : ''
              } (Due: ${t.dueDate})`;
            })
            .join('\n')
        : 'No tasks assigned yet.';

    return [
      `ROYAL STUDIO ASSIGNMENT PASS`,
      `Event: ${event.title}`,
      `Date: ${formatDate(event.eventDate)}`,
      `Time: ${timeStr}`,
      `Location: ${locationStr}`,
      `Reserved Gear: ${gearLines}`,
      `--- Assigned Tasks ---`,
      taskLines,
    ].join('\n');
  };

  useEffect(() => {
    if (!isOpen || !event) return;
    let isMounted = true;
    const payload = getQrPayload();
    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#111111',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (isMounted) setQrDataUrl('');
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, event?.id, qrMode, eventTasks.length, reservedGear.length]);

  if (!isOpen || !event) return null;

  const locationStr = [event.venue, event.city].filter(Boolean).join(', ') || 'Burewala';
  const timeStr = `${event.startTime || '18:00'} – ${event.endTime || '23:00'}`;

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `RoyalStudio-QR-${event.title.replace(/[^a-z0-9]/gi, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyPayload = async () => {
    try {
      await navigator.clipboard.writeText(getQrPayload());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-primary leading-tight">
                Mobile Assignment QR Pass
              </h3>
              <p className="text-xs text-text-muted">
                Scan with any phone camera to view event schedule, reserved gear &amp; assigned tasks.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-background transition-colors cursor-pointer"
            aria-label="Close QR Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-background rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setQrMode('LINK')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              qrMode === 'LINK'
                ? 'bg-accent text-[#111111] shadow-2xs'
                : 'text-text-muted hover:text-primary'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Portal Link</span>
          </button>
          <button
            type="button"
            onClick={() => setQrMode('TEXT')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              qrMode === 'TEXT'
                ? 'bg-accent text-[#111111] shadow-2xs'
                : 'text-text-muted hover:text-primary'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Offline Schedule Card</span>
          </button>
        </div>

        {/* QR Code Display & Event Summary */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-background border border-border">
          <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-sm shrink-0">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${event.title}`}
                className="w-44 h-44 object-contain"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-gray-400">
                Generating QR...
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2.5 text-left w-full">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-bold uppercase tracking-wider">
              <span>Event Summary</span>
            </div>
            <h4 className="font-display text-lg font-bold text-primary leading-snug">
              {event.title}
            </h4>
            <div className="space-y-1.5 text-xs text-text-muted">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>
                  <strong className="text-primary">Date:</strong> {formatDate(event.eventDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>
                  <strong className="text-primary">Time:</strong> {timeStr}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>
                  <strong className="text-primary">Location:</strong> {locationStr}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reserved Gear Section */}
        {reservedGear.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Camera className="w-3.5 h-3.5 text-accent" />
              <span>Reserved Gear &amp; Equipment ({reservedGear.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {reservedGear.map((eq) =>
                eq ? (
                  <span
                    key={eq.id}
                    className="px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-medium text-primary"
                  >
                    {eq.name}
                  </span>
                ) : null
              )}
            </div>
          </div>
        )}

        {/* Assigned Tasks Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-primary">
            <span className="flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-accent" />
              <span>Assigned Work &amp; Tasks ({eventTasks.length})</span>
            </span>
          </div>
          {eventTasks.length === 0 ? (
            <div className="p-3 rounded-xl bg-background border border-border text-xs text-text-muted text-center">
              No post-production or event tasks linked to this event yet.
            </div>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {eventTasks.map((t) => {
                const assignee = teamMembers.find((m) => m.id === t.assigneeId);
                return (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-primary truncate">{t.title}</div>
                      <div className="text-[10px] text-text-muted">
                        {assignee ? `Assigned: ${assignee.name}` : 'Assigned Crew'} · Due{' '}
                        {formatDate(t.dueDate)}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent shrink-0">
                      {t.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={handleCopyPayload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-background hover:border-accent text-xs font-semibold text-primary transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-accent" />
                <span>{qrMode === 'LINK' ? 'Copy Mobile Link' : 'Copy Details'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadQr}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-light text-[#111111] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download QR PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
