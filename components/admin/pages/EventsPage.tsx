import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MapPin,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  Edit,
  Trash2,
  QrCode,
  Camera
} from 'lucide-react';
import { useStudioData } from '../context/StudioDataContext';
import { useAuth } from '../context/AuthContext';
import { formatPKR, formatDate } from '../utils/calculations';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { EventQrModal } from '../components/common/EventQrModal';
import { IntegratedBookingModal } from '../components/common/IntegratedBookingModal';
import { Event, EventCategory, WeddingSubtype, EventStatus } from '../types';

interface EventsPageProps {
  navigate: (path: string) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ navigate }) => {
  const {
    events,
    daySchedules,
    clients,
    packages,
    tasks,
    teamMembers,
    teamAssignments,
    equipment,
    equipmentAssignments,
    createClient,
    createPackage,
    createEvent,
    updateEvent,
    deleteEvent,
    addToast
  } = useStudioData();
  const { isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [qrModalEvent, setQrModalEvent] = useState<Event | null>(null);

  // Quick-Create Inline Client mode inside New Event Booking modal
  const [isQuickClientMode, setIsQuickClientMode] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [bookingDiscount, setBookingDiscount] = useState<number>(0);
  const [bookingTax, setBookingTax] = useState<number>(0);

  // Edit Event State & Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Edit Form Fields
  const [editClientId, setEditClientId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<EventCategory>('Wedding');
  const [editWeddingSubtype, setEditWeddingSubtype] = useState<WeddingSubtype>('Barat');
  const [editPackageId, setEditPackageId] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('18:00');
  const [editEndTime, setEditEndTime] = useState('23:30');
  const [editVenue, setEditVenue] = useState('');
  const [editCity, setEditCity] = useState('Lahore');
  const [editPackagePrice, setEditPackagePrice] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<EventStatus>('Confirmed');
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editTax, setEditTax] = useState<number>(0);
  const [editIsMultiDay, setEditIsMultiDay] = useState<boolean>(false);
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // New Event Form State
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Wedding');
  const [weddingSubtype, setWeddingSubtype] = useState<WeddingSubtype>('Barat');
  const [packageId, setPackageId] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('23:30');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Lahore');
  const [packagePrice, setPackagePrice] = useState<number>(150000);
  const [advancePaid, setAdvancePaid] = useState<number>(50000);
  const [isMultiDay, setIsMultiDay] = useState<boolean>(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When package changes, auto-fill price
  const handlePackageChange = (pId: string) => {
    setPackageId(pId);
    const selected = packages.find(p => p.id === pId);
    if (selected) {
      setPackagePrice(selected.price);
    }
  };

  const handleEditPackageChange = (pId: string) => {
    setEditPackageId(pId);
    const selected = packages.find(p => p.id === pId);
    if (selected) {
      setEditPackagePrice(selected.price);
    }
  };

  const openEditModal = (evt: Event) => {
    setEditingEvent(evt);
    setEditClientId(evt.clientId);
    setEditTitle(evt.title);
    setEditCategory(evt.category);
    setEditWeddingSubtype(evt.weddingSubtype || 'Barat');
    setEditPackageId(evt.packageId || '');
    setEditEventDate(evt.eventDate);
    setEditStartTime(evt.startTime || '18:00');
    setEditEndTime(evt.endTime || '23:30');
    setEditVenue(evt.venue || '');
    setEditCity(evt.city || 'Lahore');
    setEditPackagePrice(evt.packagePrice);
    setEditStatus(evt.status);
    setEditDiscount(evt.discount || 0);
    setEditTax(evt.tax || 0);
    setEditIsMultiDay(!!evt.isMultiDay);
    setEditNotes(evt.notes || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;
    if (!editClientId || !editTitle || !editEventDate) {
      addToast('Please fill out client, title and date.', 'error');
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateEvent(editingEvent.id, {
        clientId: editClientId,
        title: editTitle,
        category: editCategory,
        weddingSubtype: editCategory === 'Wedding' ? editWeddingSubtype : undefined,
        packageId: editPackageId || undefined,
        eventDate: editEventDate,
        startTime: editStartTime,
        endTime: editEndTime,
        venue: editVenue,
        city: editCity,
        packagePrice: Number(editPackagePrice || 0),
        status: editStatus,
        discount: Number(editDiscount || 0),
        tax: Number(editTax || 0),
        isMultiDay: editIsMultiDay,
        notes: editNotes
      });

      setIsEditModalOpen(false);
      addToast('Event booking updated successfully.');
    } catch (err: any) {
      addToast(err.message || 'Failed to update event', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    try {
      await deleteEvent(eventToDelete);
      setEventToDelete(null);
    } catch {
      // error handled in context
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDate) {
      addToast('Please select the main event date.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let resolvedClientId = clientId;
      let resolvedClientName = clients.find(c => c.id === clientId)?.name || 'Client';

      if (isQuickClientMode) {
        if (!newClientName.trim() || !newClientPhone.trim()) {
          addToast('Please enter the new client name and phone number.', 'error');
          setIsSubmitting(false);
          return;
        }
        const createdClient = await createClient({
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          whatsapp: newClientPhone.trim(),
          email: newClientEmail.trim(),
          city: city || 'Burewala',
          address: venue || city || 'Burewala',
        });
        resolvedClientId = createdClient.id;
        resolvedClientName = createdClient.name;
      }

      if (!resolvedClientId) {
        addToast('Please select an existing client or create a new client.', 'error');
        setIsSubmitting(false);
        return;
      }

      const finalTitle =
        title.trim() ||
        `${resolvedClientName} — ${category === 'Wedding' ? `${weddingSubtype} Wedding` : category}`;

      const created = await createEvent({
        clientId: resolvedClientId,
        title: finalTitle,
        category,
        weddingSubtype: category === 'Wedding' ? weddingSubtype : undefined,
        packageId: packageId || undefined,
        eventDate,
        startTime,
        endTime,
        venue: venue || city || 'Burewala',
        city: city || 'Burewala',
        packagePrice: Number(packagePrice || 0),
        advancePaid: Number(advancePaid || 0),
        discount: Number(bookingDiscount || 0),
        tax: Number(bookingTax || 0),
        notes,
        isMultiDay
      });

      setIsCreateModalOpen(false);
      setIsQuickClientMode(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setBookingDiscount(0);
      setBookingTax(0);
      navigate(`/events/${created.id}`);
    } catch (err: any) {
      addToast(err.message || 'Failed to create event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = events.filter(evt => {
    const client = clients.find(c => c.id === evt.clientId);
    const matchesSearch =
      (evt.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (evt.venue || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || evt.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || evt.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Strict Staff View: ONLY Event Name, Date, Location, and Time — no deep details
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-primary">My Assigned Events</h2>
            <p className="text-xs text-text-muted">
              Your scheduled event assignments showing event name, date, location, and time.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search assigned events..."
              className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-xs text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-10 bg-surface rounded-2xl border border-border text-center space-y-2">
            <Calendar className="w-8 h-8 text-accent mx-auto" />
            <h3 className="text-sm font-bold text-primary">No Assigned Events Found</h3>
            <p className="text-xs text-text-muted">
              You currently have no assigned events matching your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map(evt => {
              const reservedGear = equipmentAssignments
                .filter(ea => ea.eventId === evt.id)
                .map(ea => equipment.find(eq => eq.id === ea.equipmentId))
                .filter(Boolean);

              return (
                <div
                  key={evt.id}
                  className="p-5 bg-surface rounded-2xl border border-border shadow-xs space-y-3"
                >
                  <h3 className="font-display text-lg font-bold text-primary leading-snug">
                    {evt.title}
                  </h3>

                  <div className="space-y-2 pt-2 border-t border-border text-xs text-text-muted">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-accent shrink-0" />
                      <span>
                        <strong className="text-primary">Date:</strong> {formatDate(evt.eventDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-accent shrink-0" />
                      <span>
                        <strong className="text-primary">Time:</strong> {evt.startTime || '18:00'} – {evt.endTime || '23:00'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-accent shrink-0" />
                      <span>
                        <strong className="text-primary">Location:</strong>{' '}
                        {[evt.venue, evt.city].filter(Boolean).join(', ') || 'Burewala'}
                      </span>
                    </div>
                  </div>

                  {reservedGear.length > 0 && (
                    <div className="pt-2 border-t border-border space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Reserved Gear ({reservedGear.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {reservedGear.map(eq =>
                          eq ? (
                            <span
                              key={eq.id}
                              className="px-2 py-0.5 rounded-md bg-background border border-border text-[10px] font-medium text-primary"
                            >
                              {eq.name}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border flex justify-end">
                    <button
                      type="button"
                      onClick={() => setQrModalEvent(evt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 hover:bg-accent/25 text-accent text-xs font-bold cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Mobile QR Pass</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <EventQrModal
          isOpen={Boolean(qrModalEvent)}
          onClose={() => setQrModalEvent(null)}
          event={qrModalEvent}
          tasks={tasks}
          teamMembers={teamMembers}
          staffOnlyView={true}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Event Bookings & Multi-Day Schedules</h2>
          <p className="text-xs text-gray-500">
            Manage upcoming shoots, wedding schedules, crew assignments, and profit calculations.
          </p>
        </div>
        <button
          onClick={() => {
            if (packages.length > 0 && !packageId) {
              setPackageId(packages[0].id);
              setPackagePrice(packages[0].price);
            }
            if (clients.length > 0 && !clientId) {
              setClientId(clients[0].id);
            }
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Event Booking</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by client, title, venue..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="Wedding">Wedding</option>
            <option value="Nikah">Nikah</option>
            <option value="Engagement">Engagement</option>
            <option value="Corporate">Corporate</option>
            <option value="Birthday">Birthday</option>
            <option value="Concert">Concert</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Inquiry">Inquiry</option>
            <option value="Quotation Sent">Quotation Sent</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Shoot Scheduled">Shoot Scheduled</option>
            <option value="Shoot Done">Shoot Done</option>
            <option value="Editing">Editing</option>
            <option value="Delivered">Delivered</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Mobile & Tablet Responsive Event Cards (<1024px) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
        {filteredEvents.map((evt) => {
          const client = clients.find((c) => c.id === evt.clientId);
          return (
            <div
              key={`card-${evt.id}`}
              onClick={() => navigate(`/events/${evt.id}`)}
              className="p-4 bg-white rounded-xl border border-gray-100 shadow-xs space-y-3 cursor-pointer hover:border-amber-400 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{evt.title}</h3>
                  <div className="text-xs text-amber-700 font-medium">
                    {client?.name || 'Client'} · {client?.phone}
                  </div>
                </div>
                <StatusBadge status={evt.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>{formatDate(evt.eventDate)}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">{evt.venue || evt.city}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 font-mono text-xs">
                <div>
                  <div className="text-[10px] text-gray-400 font-sans">Package</div>
                  <div className="font-bold text-gray-900">{formatPKR(evt.packagePrice)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-sans">Net Profit</div>
                  <div className={evt.netProfit >= 0 ? 'font-bold text-emerald-700' : 'font-bold text-rose-600'}>
                    {formatPKR(evt.netProfit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-sans">Balance</div>
                  <div className="font-bold text-amber-700">{formatPKR(evt.remainingBalance)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => openEditModal(evt)}
                  className="px-3 py-1.5 text-amber-900 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-amber-600" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/events/${evt.id}`)}
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Control Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop & Ultra-Wide Events Table (1024px+) */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Event & Client</th>
                <th className="py-3 px-4">Schedule & Venue</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Package Price</th>
                <th className="py-3 px-4">Staff & Rental Cost</th>
                <th className="py-3 px-4">Net Profit</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents.map(evt => {
                const client = clients.find(c => c.id === evt.clientId);
                return (
                  <tr
                    key={evt.id}
                    onClick={() => navigate(`/events/${evt.id}`)}
                    className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      <div className="text-sm font-bold text-gray-900">{evt.title}</div>
                      <div className="text-xs text-amber-700 font-medium">
                        {client?.name || 'Client'} • {client?.phone}
                      </div>
                      {evt.isMultiDay && (
                        <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                          Multi-Day Event
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-gray-900 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatDate(evt.eventDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-[150px]">{evt.venue}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 bg-gray-100 rounded-md font-medium text-gray-700">
                        {evt.category}
                        {evt.weddingSubtype ? ` (${evt.weddingSubtype})` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                      {formatPKR(evt.packagePrice)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600">
                      <div>Staff: {formatPKR(evt.staffCost)}</div>
                      <div className="text-[10px] text-gray-400">Gear: {formatPKR(evt.rentalCost)}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={evt.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {formatPKR(evt.netProfit)}
                      </span>
                      <div className="text-[10px] font-normal text-gray-500">
                        {evt.netMargin.toFixed(1)}% margin
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className={evt.remainingBalance > 0 ? 'text-amber-700 font-bold' : 'text-emerald-700 font-medium'}>
                        {formatPKR(evt.remainingBalance)}
                      </div>
                      <div className="text-[10px] text-gray-400">Paid: {formatPKR(evt.totalClientPayments)}</div>
                    </td>
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={evt.status}
                          onChange={async (e) => {
                            const newStatus = e.target.value as EventStatus;
                            try {
                              await updateEvent(evt.id, { status: newStatus });
                              addToast(`Event "${evt.title}" status changed to ${newStatus}`);
                            } catch (err: any) {
                              addToast(err.message || 'Failed to update status', 'error');
                            }
                          }}
                          className="text-[11px] font-semibold px-2 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs cursor-pointer"
                          title="Quick update event workflow status"
                        >
                          <option value="Inquiry">Inquiry</option>
                          <option value="Quotation Sent">Quotation Sent</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Shoot Scheduled">Shoot Scheduled</option>
                          <option value="Shoot Done">Shoot Done</option>
                          <option value="Editing">Editing</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(evt);
                          }}
                          className="px-2.5 py-1 text-amber-900 bg-amber-50 border border-amber-200 hover:border-amber-400 hover:text-amber-950 hover:bg-amber-100 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs shadow-2xs cursor-pointer"
                          title="Edit Event Parameters & Pricing"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/events/${evt.id}`);
                          }}
                          className="px-2.5 py-1 text-slate-700 bg-gray-100 hover:bg-slate-900 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold cursor-pointer shadow-2xs"
                          title="Open Event Control Room"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEventToDelete(evt.id);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified 3-Step Integrated Event Booking Modal */}
      <IntegratedBookingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        initialDate={eventDate}
        clients={clients}
        events={events}
        daySchedules={daySchedules}
        packages={packages}
        teamMembers={teamMembers}
        teamAssignments={teamAssignments}
        equipment={equipment}
        equipmentAssignments={equipmentAssignments}
        createClient={createClient}
        createPackage={createPackage}
        createEvent={createEvent}
        addToast={addToast}
      />

      {/* EDIT EVENT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Event: ${editingEvent?.title || ''}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Client *
              </label>
              <select
                value={editClientId}
                onChange={e => setEditClientId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Choose Client --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone} - {c.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Event Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Event Category *
              </label>
              <select
                value={editCategory}
                onChange={e => setEditCategory(e.target.value as EventCategory)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              >
                <option value="Wedding">Wedding</option>
                <option value="Birthday">Birthday</option>
                <option value="Nikah">Nikah</option>
                <option value="Corporate">Corporate</option>
                <option value="Concert">Concert</option>
                <option value="Engagement">Engagement</option>
                <option value="Bridal Shower">Bridal Shower</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Wedding Subtype */}
            {editCategory === 'Wedding' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Wedding Subtype
                </label>
                <select
                  value={editWeddingSubtype}
                  onChange={e => setEditWeddingSubtype(e.target.value as WeddingSubtype)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="Barat">Barat</option>
                  <option value="Mehndi">Mehndi</option>
                  <option value="Walima">Walima</option>
                  <option value="Nikah">Nikah</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            {/* Package */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Studio Service Package
              </label>
              <select
                value={editPackageId}
                onChange={e => handleEditPackageChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Custom Package / None --</option>
                {packages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {formatPKR(p.price)}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Agreed Package Price (PKR) *
              </label>
              <input
                type="number"
                value={editPackagePrice}
                onChange={e => setEditPackagePrice(Number(e.target.value))}
                min="0"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Event Status *
              </label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value as EventStatus)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              >
                <option value="Inquiry">Inquiry</option>
                <option value="Quotation Sent">Quotation Sent</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Shoot Scheduled">Shoot Scheduled</option>
                <option value="Shoot Done">Shoot Done</option>
                <option value="Editing">Editing</option>
                <option value="Delivered">Delivered</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Event Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Main Event Date *
              </label>
              <input
                type="date"
                value={editEventDate}
                onChange={e => setEditEventDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={editStartTime}
                  onChange={e => setEditStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={e => setEditEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Venue & City */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Venue Name</label>
              <input
                type="text"
                value={editVenue}
                onChange={e => setEditVenue(e.target.value)}
                placeholder="e.g. Royal Palm / Pearl Continental"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={editCity}
                onChange={e => setEditCity(e.target.value)}
                placeholder="Lahore"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Discount & Tax */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Discount (PKR)</label>
                <input
                  type="number"
                  value={editDiscount}
                  onChange={e => setEditDiscount(Number(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tax (PKR)</label>
                <input
                  type="number"
                  value={editTax}
                  onChange={e => setEditTax(Number(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Multi-Day Toggle */}
            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                id="editIsMultiDay"
                checked={editIsMultiDay}
                onChange={e => setEditIsMultiDay(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded-xs border-gray-300 focus:ring-amber-500"
              />
              <label htmlFor="editIsMultiDay" className="text-xs font-semibold text-gray-900 cursor-pointer">
                Multi-Day Event System (Has multiple schedules)
              </label>
            </div>
          </div>

          {/* Financial Preview Box */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-gray-500 font-medium">Contract Net Total: </span>
              <span className="font-mono font-bold text-gray-900 text-sm">
                {formatPKR(Math.max(0, Number(editPackagePrice || 0) - Number(editDiscount || 0) + Number(editTax || 0)))}
              </span>
            </div>
            {editingEvent && (
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-gray-500 font-medium">Client Paid: </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatPKR(editingEvent.totalClientPayments)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">Est. Balance: </span>
                  <span className="font-mono font-bold text-amber-800">
                    {formatPKR(Math.max(0, Number(editPackagePrice || 0) - Number(editDiscount || 0) + Number(editTax || 0) - editingEvent.totalClientPayments))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Instructions</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={2}
              placeholder="Special instructions, music choices, drone clearances..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isSavingEdit ? 'Saving Changes...' : 'Save Event Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION: DELETE EVENT */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete this Event?"
        message="This action will permanently delete this event, its day schedules, team assignments, equipment bookings, and expense records. This action cannot be undone."
      />
    </div>
  );
};
