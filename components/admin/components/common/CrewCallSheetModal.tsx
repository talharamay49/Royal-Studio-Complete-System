import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Download,
  MessageCircle,
  Copy,
  Check,
  MapPin,
  Calendar,
  Clock,
  Camera,
  Users,
  Phone,
  ExternalLink,
  X,
  Plane,
  Sparkles,
} from 'lucide-react';
import {
  Event,
  Client,
  EventDaySchedule,
  EventTeamAssignment,
  TeamMember,
  EventEquipmentAssignment,
  Equipment,
  AdminProfile,
} from '../../types';
import { formatDate } from '../../utils/calculations';

interface CrewCallSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  client?: Client;
  daySchedules: EventDaySchedule[];
  teamAssignments?: EventTeamAssignment[];
  crewAssignments?: EventTeamAssignment[];
  teamMembers: TeamMember[];
  equipmentAssignments: EventEquipmentAssignment[];
  equipment: Equipment[];
  profile?: AdminProfile | null;
  onToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const CrewCallSheetModal: React.FC<CrewCallSheetModalProps> = ({
  isOpen,
  onClose,
  event,
  client,
  daySchedules,
  teamAssignments: teamAssignmentsProp,
  crewAssignments,
  teamMembers,
  equipmentAssignments,
  equipment,
  profile,
}) => {
  const teamAssignments = teamAssignmentsProp || crewAssignments || [];
  const [copiedText, setCopiedText] = useState(false);
  const [copiedMapsPin, setCopiedMapsPin] = useState(false);
  const [customBriefingNote, setCustomBriefingNote] = useState(
    'Please arrive 30 minutes prior to Call Time in formal black studio attire. Format dual SD/CFexpress cards only after verifying NAS backup.'
  );

  const sortedDays = useMemo(
    () => [...daySchedules].sort((a, b) => a.dayNumber - b.dayNumber),
    [daySchedules]
  );

  const googleMapsPinUrl = useMemo(() => {
    if (event.venueMapPinUrl && event.venueMapPinUrl.trim()) {
      return event.venueMapPinUrl.trim();
    }
    const query = [event.venue, event.city, 'Pakistan'].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }, [event.venue, event.city, event.venueMapPinUrl]);

  const crewRoster = useMemo(() => {
    return teamAssignments.map((ta) => {
      const tm = teamMembers.find((m) => m.id === ta.teamMemberId);
      return {
        id: ta.id,
        name: tm?.name || 'Assigned Specialist',
        role: ta.assignedRole || tm?.role || 'Photographer',
        phone: tm?.phone || '',
        whatsapp: tm?.whatsapp || tm?.phone || '',
        specialization: tm?.specialization || '',
        notes: ta.notes || '',
      };
    });
  }, [teamAssignments, teamMembers]);

  const assignedGearList = useMemo(() => {
    const explicit = equipmentAssignments
      .map((ea) => {
        const eq = equipment.find((item) => item.id === ea.equipmentId);
        return eq
          ? {
              id: ea.id,
              name: eq.name,
              category: eq.category,
              serialNumber: eq.serialNumber,
              condition: eq.condition,
            }
          : null;
      })
      .filter(Boolean) as Array<{
      id: string;
      name: string;
      category: string;
      serialNumber: string;
      condition: string;
    }>;

    if (explicit.length > 0) return explicit;

    // Fallback default kit based on event requirements so Call-Sheet is always complete
    return [
      {
        id: 'def-cam-1',
        name: 'Sony A7S III / FX3 Cinema Body',
        category: 'Camera',
        serialNumber: 'RS-CAM-01',
        condition: 'Excellent',
      },
      {
        id: 'def-cam-2',
        name: 'Sony A7 IV High-Res Stills Body',
        category: 'Camera',
        serialNumber: 'RS-CAM-02',
        condition: 'Excellent',
      },
      {
        id: 'def-lens-1',
        name: 'Sony 24-70mm f/2.8 GM II & 85mm f/1.4 GM',
        category: 'Lens',
        serialNumber: 'RS-LENS-GM',
        condition: 'Excellent',
      },
      {
        id: 'def-gimbal-1',
        name: 'DJI RS3 Pro Gimbal + Wireless Mic Kit',
        category: 'Gimbal',
        serialNumber: 'RS-GIM-01',
        condition: 'Good',
      },
      {
        id: 'def-drone-1',
        name: 'DJI Air 3 / Mavic 3 Pro 4K Aerial Unit',
        category: 'Drone',
        serialNumber: 'RS-DRN-01',
        condition: 'Excellent',
      },
    ];
  }, [equipmentAssignments, equipment]);

  const whatsappCallSheetText = useMemo(() => {
    const studioTitle = (profile?.studioName || 'ROYAL STUDIO').toUpperCase();
    const lines = [
      `📋 *${studioTitle} — OFFICIAL CREW CALL-SHEET*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `*Event:* ${event.title} (${event.category})`,
      `*Primary Date:* ${formatDate(event.eventDate)}`,
      `*Call Time:* ${event.callTime || '17:00'}  |  *Shoot:* ${event.startTime || '18:00'} – ${event.endTime || '23:00'}`,
      `*Venue:* ${event.venue}, ${event.city}`,
      `📍 *Google Maps Venue Pin:* ${googleMapsPinUrl}`,
      ``,
      `👤 *CLIENT CONTACT PERSON:*`,
      `• Name: ${client?.name || 'Booked Client'}`,
      `• Phone / WhatsApp: ${client?.phone || client?.whatsapp || 'Contact Producer'}`,
      ...(client?.address ? [`• Address: ${client.address}, ${client.city}`] : []),
      ``,
      `🗓 *EVENT TIMELINE & RUN-SHEET:*`,
      ...(sortedDays.length > 0
        ? sortedDays.map(
            (d) =>
              `• *Day ${d.dayNumber} (${d.eventType} - ${formatDate(d.date)}):* Call ${
                d.callTime || '17:00'
              } | Shoot ${d.startTime}–${d.endTime} @ ${d.venue} (${
                d.photographersCount ?? 1
              } Photo, ${d.cinematographersCount ?? 1} Cinema${
                d.droneIncluded ? ', 1 Drone' : ''
              })`
          )
        : [
            `• *Main Event (${formatDate(event.eventDate)}):* Call ${
              event.callTime || '17:00'
            } | Shoot ${event.startTime || '18:00'}–${event.endTime || '23:00'} @ ${
              event.venue
            }`,
          ]),
      ``,
      `🎬 *ASSIGNED CREW ROSTER:*`,
      ...(crewRoster.length > 0
        ? crewRoster.map(
            (c, i) => `${i + 1}. *${c.name}* — ${c.role}${c.phone ? ` (${c.phone})` : ''}`
          )
        : [`• Senior Royal Studio Production Team`]),
      ``,
      `📷 *ASSIGNED CAMERAS, LENSES & DRONES:*`,
      ...assignedGearList.map((g) => `• [${g.category}] ${g.name} (${g.serialNumber})`),
      ``,
      `⚡ *PRODUCER BRIEFING:*`,
      `${customBriefingNote}`,
      ...(event.notes ? [`Note: ${event.notes}`] : []),
    ];
    return lines.join('\n');
  }, [
    profile,
    event,
    client,
    sortedDays,
    crewRoster,
    assignedGearList,
    googleMapsPinUrl,
    customBriefingNote,
  ]);

  if (!isOpen) return null;

  const handleCopyCallSheet = () => {
    navigator.clipboard.writeText(whatsappCallSheetText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2200);
  };

  const handleCopyMapPin = () => {
    navigator.clipboard.writeText(googleMapsPinUrl);
    setCopiedMapsPin(true);
    setTimeout(() => setCopiedMapsPin(false), 2000);
  };

  const handleDownloadCallSheetPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const studioName = (profile?.studioName || 'ROYAL STUDIO').toUpperCase();

    // Header Banner
    doc.setFillColor(17, 17, 21);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.8);
    doc.line(0, 38, 210, 38);

    doc.setTextColor(212, 175, 55);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`${studioName} — PRODUCTION CREW CALL-SHEET`, 14, 15);

    doc.setTextColor(245, 242, 235);
    doc.setFontSize(10.5);
    doc.text(`${event.title} (${event.category})`, 14, 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 180, 170);
    doc.text(
      `Primary Date: ${formatDate(event.eventDate)}   |   Call Time: ${
        event.callTime || '17:00'
      }   |   Shoot: ${event.startTime || '18:00'} - ${event.endTime || '23:00'}`,
      14,
      31
    );

    let y = 46;

    // Box 1: Venue & Client Contact Person
    doc.setDrawColor(212, 175, 55);
    doc.setFillColor(249, 248, 245);
    doc.roundedRect(14, y, 182, 34, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(20, 20, 25);
    doc.text('1. VENUE LOCATION, GOOGLE MAPS PIN & CLIENT CONTACT PERSON', 18, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Venue & City: ${event.venue}, ${event.city}`, 18, y + 14);
    doc.text(
      `Client Contact: ${client?.name || 'Booked Client'} (${
        client?.phone || client?.whatsapp || 'N/A'
      })`,
      18,
      y + 20
    );
    doc.setTextColor(165, 125, 35);
    doc.text(`Google Maps Pin: ${googleMapsPinUrl.slice(0, 82)}`, 18, y + 27);

    y += 42;

    // Box 2: Event Timeline & Day-by-Day Run-Sheet
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 25);
    doc.text('2. EVENT TIMELINE & MULTI-DAY RUN-SHEET', 14, y);
    y += 4;

    const daysToRender =
      sortedDays.length > 0
        ? sortedDays
        : [
            {
              id: 'd-main',
              eventId: event.id,
              dayNumber: 1,
              eventType: event.category,
              date: event.eventDate,
              callTime: event.callTime || '17:00',
              startTime: event.startTime || '18:00',
              endTime: event.endTime || '23:00',
              venue: event.venue,
              cameraCount: 2,
              photographersCount: 1,
              cinematographersCount: 1,
              droneIncluded: true,
              customPrice: event.packagePrice,
              notes: event.notes || 'Full coverage',
            },
          ];

    daysToRender.forEach((d, idx) => {
      doc.setDrawColor(220, 220, 225);
      doc.setFillColor(idx % 2 === 0 ? 252 : 246, idx % 2 === 0 ? 252 : 247, 250);
      doc.roundedRect(14, y, 182, 14, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(25, 25, 30);
      doc.text(
        `Day ${d.dayNumber}: ${d.eventType} (${formatDate(d.date)})`,
        18,
        y + 5.5
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(70, 70, 80);
      doc.text(
        `Call: ${d.callTime || '17:00'}  |  Shoot: ${d.startTime} - ${d.endTime}  |  Venue: ${
          d.venue
        }  |  Units: ${d.photographersCount ?? 1}P, ${d.cinematographersCount ?? 1}V${
          d.droneIncluded ? ', 1 Drone' : ''
        }`,
        18,
        y + 11
      );
      y += 16;
    });

    y += 4;

    // Box 3: Assigned Photographers / Cinematographers Roster
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 25);
    doc.text('3. ASSIGNED PHOTOGRAPHERS, CINEMATOGRAPHERS & CREW ROSTER', 14, y);
    y += 4;

    if (crewRoster.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Senior Royal Studio Photographers & Cinematographers Assigned.', 18, y + 5);
      y += 12;
    } else {
      crewRoster.forEach((c, idx) => {
        doc.setDrawColor(225, 225, 230);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(14, y, 182, 10, 1, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(20, 20, 25);
        doc.text(`${idx + 1}. ${c.name}`, 18, y + 6.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Role: ${c.role}`, 82, y + 6.5);
        doc.text(`Contact: ${c.phone || 'Studio Roster'}`, 140, y + 6.5);
        y += 12;
      });
    }

    y += 4;

    // Box 4: Assigned Cameras, Lenses, Gimbals & Drones
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 25);
    doc.text('4. ASSIGNED CAMERAS, LENSES, GIMBALS & DRONE CHECKLIST', 14, y);
    y += 4;

    assignedGearList.forEach((g) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
      doc.setDrawColor(225, 225, 230);
      doc.setFillColor(250, 250, 252);
      doc.roundedRect(14, y, 182, 9, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(165, 125, 35);
      doc.text(`[${g.category.toUpperCase()}]`, 18, y + 6);
      doc.setTextColor(25, 25, 30);
      doc.text(g.name, 48, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 110);
      doc.text(`Serial: ${g.serialNumber}  |  [  ] Checked Out   [  ] Returned`, 125, y + 6);
      y += 10.5;
    });

    y += 4;
    if (y < 270) {
      doc.setDrawColor(212, 175, 55);
      doc.setFillColor(253, 251, 244);
      doc.roundedRect(14, y, 182, 16, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(25, 25, 30);
      doc.text('PRODUCER FIELD INSTRUCTIONS:', 18, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(customBriefingNote.slice(0, 105), 18, y + 11.5);
    }

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 125);
    doc.text(
      `${profile?.studioName || 'Royal Studio'} · ${
        profile?.address || 'Burewala, Punjab, Pakistan'
      } · Producer Hotline: ${profile?.phone || '0308-4877073'}`,
      14,
      287
    );

    doc.save(
      `Royal-Studio-Crew-Call-Sheet-${event.title.replace(/[^a-z0-9]/gi, '-')}.pdf`
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-border bg-surface p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent/15 border border-accent/35 flex items-center justify-center text-accent shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                <Sparkles className="w-3 h-3" />
                <span>Automated Production Briefing Generator</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-primary">
                Crew Call-Sheet (PDF &amp; WhatsApp) — {event.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-primary hover:bg-background cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Action Bar: One-Click PDF Download + Master WhatsApp Dispatch + Copy */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-background border border-border">
          <div className="text-xs text-text-muted">
            Ready to dispatch to <strong className="text-primary">{crewRoster.length || 'all'}</strong> assigned crew members with Google Maps pin &amp; gear list.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCallSheetPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:opacity-90 text-[#111111] text-xs font-bold cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Crew Call-Sheet (A4 PDF)</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappCallSheetText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Share Call-Sheet on WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleCopyCallSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-surface hover:border-accent text-xs font-semibold text-primary cursor-pointer"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied Briefing!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-accent" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 1: Venue Google Maps Pin & Client Contact Person */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-background border border-border space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Venue &amp; Google Maps Pin</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyMapPin}
                  className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-semibold text-primary cursor-pointer"
                >
                  {copiedMapsPin ? 'Copied Pin' : 'Copy Pin'}
                </button>
                <a
                  href={googleMapsPinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-bold"
                >
                  <span>Open Maps</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
            <div className="font-bold text-sm text-primary">
              {event.venue}, {event.city}
            </div>
            <div className="text-[11px] text-text-muted">
              Primary Date: <strong className="text-primary">{formatDate(event.eventDate)}</strong> · Call Time:{' '}
              <strong className="text-accent">{event.callTime || '17:00'}</strong> ({event.startTime || '18:00'} – {event.endTime || '23:00'})
            </div>
          </div>

          <div className="p-4 rounded-xl bg-background border border-border space-y-2 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span>Client Contact Person on Ground</span>
            </span>
            <div className="font-bold text-sm text-primary">
              {client?.name || 'Booked Client'}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-text-muted text-[11px]">
              <span>📞 Phone: {client?.phone || 'N/A'}</span>
              {client?.whatsapp && <span>💬 WA: {client.whatsapp}</span>}
            </div>
            {client?.address && (
              <div className="text-[11px] text-text-muted truncate">
                🏠 {client.address}, {client.city}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Event Timeline & Multi-Day Run-Sheet */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span>Event Timeline &amp; Day-by-Day Call Times</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(sortedDays.length > 0
              ? sortedDays
              : [
                  {
                    id: 'default-day',
                    dayNumber: 1,
                    eventType: event.category,
                    date: event.eventDate,
                    callTime: event.callTime || '17:00',
                    startTime: event.startTime || '18:00',
                    endTime: event.endTime || '23:00',
                    venue: event.venue,
                    photographersCount: 1,
                    cinematographersCount: 1,
                    droneIncluded: true,
                  },
                ]
            ).map((d) => (
              <div
                key={d.id}
                className="p-3.5 rounded-xl bg-background border border-border space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">
                    Day {d.dayNumber}: {d.eventType}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-accent/15 text-accent font-mono text-[10px] font-bold">
                    Call: {d.callTime || '17:00'}
                  </span>
                </div>
                <div className="text-[11px] text-text-muted">
                  📅 {formatDate(d.date)} · ⏰ {d.startTime} – {d.endTime}
                </div>
                <div className="text-[11px] text-text-muted truncate">📍 {d.venue}</div>
                <div className="text-[10px] font-semibold text-primary pt-1 border-t border-border">
                  {d.photographersCount ?? 1} Photo · {d.cinematographersCount ?? 1} Cinema
                  {d.droneIncluded ? ' · 1 Drone' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Assigned Crew & Individual 1-Click WhatsApp Dispatch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-accent" />
              <span>Assigned Crew Roster &amp; Direct WhatsApp Dispatch</span>
            </h4>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {crewRoster.length === 0 ? (
                <div className="p-3 rounded-xl bg-background border border-border text-xs text-text-muted">
                  No specific crew members linked yet. Use the master WhatsApp button above to share with your production group.
                </div>
              ) : (
                crewRoster.map((c) => {
                  const cleanPhone = (c.whatsapp || c.phone || '').replace(/[^0-9]/g, '');
                  const waPhone = cleanPhone
                    ? cleanPhone.startsWith('92')
                      ? cleanPhone
                      : `92${cleanPhone.replace(/^0/, '')}`
                    : '';
                  return (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-background border border-border flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-primary">{c.name}</div>
                        <div className="text-[11px] text-text-muted">
                          {c.role} {c.phone ? `· ${c.phone}` : ''}
                        </div>
                      </div>
                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                            `Assalam-o-Alaikum ${c.name}, here is your official Royal Studio Call-Sheet for ${event.title} (${formatDate(event.eventDate)}):\n\n${whatsappCallSheetText}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Send WA</span>
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 4: Assigned Cameras, Lenses & Drones */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-accent" />
              <span>Assigned Cameras, Lenses &amp; Drones ({assignedGearList.length})</span>
            </h4>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {assignedGearList.map((g) => (
                <div
                  key={g.id}
                  className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {g.category === 'Drone' ? (
                      <Plane className="w-3.5 h-3.5 text-accent shrink-0" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-accent shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-semibold text-primary truncate">{g.name}</div>
                      <div className="text-[10px] text-text-muted font-mono">
                        {g.category} · SN: {g.serialNumber}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] font-semibold text-emerald-500 shrink-0">
                    Reserved
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Producer Instructions */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
            Producer Call-Sheet Instructions (Included in PDF &amp; WhatsApp)
          </label>
          <textarea
            rows={2}
            value={customBriefingNote}
            onChange={(e) => setCustomBriefingNote(e.target.value)}
            className="w-full p-3 rounded-xl bg-background border border-border text-xs text-primary"
          />
        </div>
      </div>
    </div>
  );
};
