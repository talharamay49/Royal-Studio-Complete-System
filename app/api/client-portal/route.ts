import { NextRequest, NextResponse } from "next/server";
import {
  dbInstance,
  getDefaultProofingGalleryForEvent,
  buildDefaultMediaDeliveryVault,
  syncEventMediaDeliveryToClientProfile,
  sanitizeEventForClient,
  sanitizeClientForClientPortal,
} from "@/lib/admin/db";
import { LUXURY_ADDON_CATALOG } from "@/lib/pricing/unifiedPricing";
import type {
  EventProofingGallery,
  ProofingPhotoItem,
  Client,
} from "@/components/admin/types";

function normalizePhone(val?: string): string {
  return (val || "").replace(/[^0-9]/g, "");
}

function authenticateClientAccount(
  db: Awaited<ReturnType<typeof dbInstance.ensureHydrated>>,
  rawIdentifier: string,
  providedPassword: string,
  requestedEventId?: string
): { client: Client | null; error?: string; status?: number } {
  const cleanId = rawIdentifier.trim().toLowerCase();
  const identDigits = normalizePhone(rawIdentifier);
  const cleanPass = providedPassword.trim();

  if (!cleanId || !cleanPass) {
    return {
      client: null,
      error: "Email / Phone Number and Password are required.",
      status: 401,
    };
  }

  let matchedClient = db.clients.find((c) => {
    if (c.id.toLowerCase() === cleanId) return true;
    if (c.email && c.email.trim().toLowerCase() === cleanId) return true;
    const linkedUser = db.users.find(
      (u) => u.role === "CLIENT" && (u.id === c.userId || u.clientId === c.id)
    );
    if (linkedUser?.email && linkedUser.email.trim().toLowerCase() === cleanId) {
      return true;
    }
    if (identDigits.length >= 7) {
      const cPhone = normalizePhone(c.phone);
      const cWa = normalizePhone(c.whatsapp);
      if (
        cPhone === identDigits ||
        cWa === identDigits ||
        (cPhone.length >= 9 && identDigits.endsWith(cPhone.slice(-9))) ||
        (cWa.length >= 9 && identDigits.endsWith(cWa.slice(-9)))
      ) {
        return true;
      }
    }
    return false;
  });

  if (!matchedClient) {
    const matchedEvt = db.events.find((e) => e.id.toLowerCase() === cleanId);
    if (matchedEvt) {
      matchedClient = db.clients.find((c) => c.id === matchedEvt.clientId);
    }
  }

  if (!matchedClient) {
    return {
      client: null,
      error: "No client account found matching that Email or Phone Number.",
      status: 404,
    };
  }

  if (matchedClient.loginStatus === "DISABLED") {
    return {
      client: null,
      error: "Your Client Portal login has been disabled by Studio Admin.",
      status: 403,
    };
  }

  const expectedPassword = (matchedClient.portalPassword || "").trim();
  if (
    matchedClient.loginStatus === "NONE" ||
    matchedClient.hasLogin === false ||
    !expectedPassword
  ) {
    return {
      client: null,
      error: "No active login account has been created for this client yet. Please contact Studio Admin.",
      status: 403,
    };
  }

  if (cleanPass !== expectedPassword) {
    return {
      client: null,
      error: "Invalid password. Please enter the login password provided by Royal Studio.",
      status: 401,
    };
  }

  return { client: matchedClient };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedEventId = (searchParams.get("eventId") || "").trim();
    const rawIdentifier = (
      searchParams.get("identifier") ||
      searchParams.get("clientId") ||
      ""
    ).trim();
    const providedPassword = (
      searchParams.get("password") ||
      searchParams.get("pin") ||
      req.headers.get("x-client-password") ||
      req.headers.get("x-client-pin") ||
      ""
    ).trim();

    const db = await dbInstance.ensureHydrated();

    const publicSafeProfile = {
      studioName: db.profile.studioName,
      tagline: db.profile.tagline,
      phone: db.profile.phone,
      phone2: db.profile.phone2,
      whatsapp: db.profile.whatsapp,
      email: db.profile.email,
      address: db.profile.address,
      city: db.profile.city,
      website: db.profile.website,
      logo: db.profile.logo,
      primaryLogo: db.profile.primaryLogo,
      bankName: db.profile.bankName,
      accountTitle: db.profile.accountTitle,
      accountNumber: db.profile.accountNumber,
      iban: db.profile.iban,
      bankAccounts: (db.profile.bankAccounts || []).filter(
        (b) => b.showPublicly && b.isActive
      ),
      paymentMethods: (db.profile.paymentMethods || []).filter(
        (m) => m.showPublicly && m.isActive
      ),
      defaultTermsAndConditions: db.profile.defaultTermsAndConditions,
      paymentTerms: db.profile.paymentTerms,
    };

    if (!rawIdentifier || !providedPassword) {
      return NextResponse.json({
        authenticated: false,
        requiresLogin: true,
        profile: publicSafeProfile,
        addonCatalog: LUXURY_ADDON_CATALOG,
      });
    }

    const auth = authenticateClientAccount(
      db,
      rawIdentifier,
      providedPassword,
      requestedEventId
    );
    if (!auth.client) {
      return NextResponse.json(
        {
          authenticated: false,
          requiresLogin: true,
          error: auth.error || "Invalid login credentials.",
          profile: publicSafeProfile,
          addonCatalog: LUXURY_ADDON_CATALOG,
        },
        { status: auth.status || 401 }
      );
    }

    const activeClient = auth.client;
    let clientEvents = db.events.filter((e) => e.clientId === activeClient.id);
    if (clientEvents.length === 0) {
      const defaultEvtId = `evt-${Date.now().toString().slice(-6)}`;
      const defaultDate = new Date(Date.now() + 14 * 86400000)
        .toISOString()
        .split("T")[0];
      const starterEvent = {
        id: defaultEvtId,
        clientId: activeClient.id,
        title: `${activeClient.name} — Signature Celebration`,
        category: "Wedding" as const,
        eventDate: defaultDate,
        startTime: "18:00",
        endTime: "23:30",
        venue: activeClient.address || "Royal Marquee",
        city: activeClient.city || "Burewala",
        packagePrice: 185000,
        advancePaid: 0,
        totalClientPayments: 0,
        remainingBalance: 185000,
        totalCrewCost: 0,
        totalEquipmentCost: 0,
        totalOtherExpenses: 0,
        netProfit: 185000,
        status: "Confirmed" as const,
        isMultiDay: true,
        daysCount: 1,
        notes: activeClient.notes || "",
        proofingGallery: getDefaultProofingGalleryForEvent(
          defaultEvtId,
          `${activeClient.name} — Signature Celebration`
        ),
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        createdBy: "usr-admin",
      } as any;
      starterEvent.mediaDelivery = buildDefaultMediaDeliveryVault(
        starterEvent,
        activeClient
      );
      syncEventMediaDeliveryToClientProfile(starterEvent, db.clients);
      db.events.unshift(starterEvent);
      await dbInstance.save();
      clientEvents = [starterEvent];
    }

    const activeEvent =
      (requestedEventId
        ? clientEvents.find((e) => e.id === requestedEventId)
        : undefined) ||
      clientEvents[0] ||
      null;

    let gallery: EventProofingGallery | null = null;
    if (activeEvent) {
      let dirty = false;
      if (
        !activeEvent.proofingGallery ||
        !Array.isArray(activeEvent.proofingGallery.photos) ||
        activeEvent.proofingGallery.photos.length === 0
      ) {
        activeEvent.proofingGallery = getDefaultProofingGalleryForEvent(
          activeEvent.id,
          activeEvent.title
        );
        dirty = true;
      }
      if (dirty) {
        await dbInstance.save();
      }
      gallery = activeEvent.proofingGallery;
    }

    const clientEventIds = new Set(clientEvents.map((e) => e.id));
    const clientDaySchedules = db.daySchedules
      .filter((d) => clientEventIds.has(d.eventId))
      .sort((a, b) => a.dayNumber - b.dayNumber);

    // Ensure every client event has a synchronized, duplication-free Quotation and Invoice in db
    let docsCreated = false;
    clientEvents.forEach((ev) => {
      // Clean up any historical duplicate quotations for this event
      const existingQuos = db.quotations.filter((q) => q.eventId === ev.id);
      if (existingQuos.length > 1) {
        const keepId = existingQuos[0].id;
        db.quotations = db.quotations.filter((q) => q.eventId !== ev.id || q.id === keepId);
        docsCreated = true;
      }
      const existingQuo = db.quotations.find(
        (q) => q.eventId === ev.id || (!q.eventId && q.clientId === activeClient.id)
      );
      if (existingQuo && !existingQuo.eventId) {
        existingQuo.eventId = ev.id;
        docsCreated = true;
      }
      if (!existingQuo) {
        const issueDate =
          ev.createdDate?.split("T")[0] ||
          new Date().toISOString().split("T")[0];
        const validUntil = new Date(Date.now() + 30 * 86400000)
          .toISOString()
          .split("T")[0];
        const maxQuoSeq = db.quotations.reduce((max, q) => {
          const m = (q.quotationNumber || "").match(/(\d+)$/);
          return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 1000);
        const quoNum = `${db.profile.quotationPrefix || "RS-QUO-"}${String(
          maxQuoSeq + 1
        ).padStart(4, "0")}`;
        const price = Number(ev.packagePrice || 185000);
        const disc = Number(ev.discount || 0);
        const tx = Number(ev.tax || 0);
        const total = Math.max(0, price - disc + tx);
        const candidateId = `quo-${ev.id.slice(-6)}`;
        const uniqueQuoId = db.quotations.some((q) => q.id === candidateId)
          ? `quo-${ev.id.slice(-6)}-${Date.now().toString().slice(-3)}`
          : candidateId;
        db.quotations.unshift({
          id: uniqueQuoId,
          quotationNumber: quoNum,
          clientId: activeClient.id,
          eventId: ev.id,
          status: ev.approvedByClient ? "APPROVED" : "SENT",
          approvedByName: ev.approvedByClient || undefined,
          approvedAt: ev.approvedAt || undefined,
          signatureData: ev.approvedByClient || undefined,
          issueDate,
          validUntil,
          subtotal: price,
          discount: disc,
          tax: tx,
          total,
          paymentTerms: db.profile.paymentTerms,
          notes: ev.notes || "Official Celebration Quotation",
          createdBy: "usr-admin",
        });
        docsCreated = true;
      }

      // Clean up any historical duplicate invoices for this event
      const existingInvs = db.invoices.filter((i) => i.eventId === ev.id);
      if (existingInvs.length > 1) {
        const keepId = existingInvs[0].id;
        db.invoices = db.invoices.filter((i) => i.eventId !== ev.id || i.id === keepId);
        docsCreated = true;
      }
      const existingInv = db.invoices.find(
        (i) => i.eventId === ev.id || (!i.eventId && i.clientId === activeClient.id)
      );
      if (existingInv && !existingInv.eventId) {
        existingInv.eventId = ev.id;
        docsCreated = true;
      }
      if (!existingInv) {
        const issueDate =
          ev.createdDate?.split("T")[0] ||
          new Date().toISOString().split("T")[0];
        const maxInvSeq = db.invoices.reduce((max, i) => {
          const m = (i.invoiceNumber || "").match(/(\d+)$/);
          return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 1000);
        const invNum = `${db.profile.invoicePrefix || "RS-INV-"}${String(
          maxInvSeq + 1
        ).padStart(4, "0")}`;
        const price = Number(ev.packagePrice || 185000);
        const disc = Number(ev.discount || 0);
        const tx = Number(ev.tax || 0);
        const total = Math.max(0, price - disc + tx);
        const paid = Number(ev.totalClientPayments || 0);
        const candidateInvId = `inv-${ev.id.slice(-6)}`;
        const uniqueInvId = db.invoices.some((i) => i.id === candidateInvId)
          ? `inv-${ev.id.slice(-6)}-${Date.now().toString().slice(-3)}`
          : candidateInvId;
        db.invoices.unshift({
          id: uniqueInvId,
          invoiceNumber: invNum,
          clientId: activeClient.id,
          eventId: ev.id,
          issueDate,
          dueDate: ev.eventDate,
          subtotal: price,
          discount: disc,
          tax: tx,
          total,
          paidAmount: paid,
          remainingAmount: Math.max(0, total - paid),
          paymentTerms: db.profile.paymentTerms,
          status:
            paid >= total && total > 0
              ? "Paid"
              : paid > 0
              ? "Partially Paid"
              : "Unpaid",
          notes: ev.notes || "Official Celebration Invoice",
          createdBy: "usr-admin",
        });
        docsCreated = true;
      }
    });
    if (docsCreated) {
      await dbInstance.save();
    }

    const seenInv = new Set<string>();
    const clientInvoices = db.invoices
      .filter((i) => i.clientId === activeClient.id || clientEventIds.has(i.eventId))
      .filter((i) => {
        if (seenInv.has(i.id)) return false;
        seenInv.add(i.id);
        return true;
      });

    const seenPay = new Set<string>();
    const clientPayments = db.payments
      .filter((p) => p.clientId === activeClient.id || clientEventIds.has(p.eventId))
      .filter((p) => {
        if (seenPay.has(p.id)) return false;
        seenPay.add(p.id);
        return true;
      });

    const seenQuo = new Set<string>();
    const clientQuotations = db.quotations
      .filter((q) => q.clientId === activeClient.id || clientEventIds.has(q.eventId))
      .filter((q) => {
        if (seenQuo.has(q.id)) return false;
        seenQuo.add(q.id);
        return true;
      });
    const clientTasks = db.tasks.filter((t) => clientEventIds.has(t.eventId));
    const clientTeamAssignments = db.teamAssignments.filter((ta) =>
      clientEventIds.has(ta.eventId)
    );

    const assignedCrewMap: Record<
      string,
      Array<{ id: string; name: string; role: string; hours: number }>
    > = {};

    const crewAssignments: Array<{
      id: string;
      eventId: string;
      name: string;
      role: string;
      specialization: string;
    }> = [];

    clientEvents.forEach((ev) => {
      const assignments = clientTeamAssignments.filter(
        (ta) => ta.eventId === ev.id
      );
      assignedCrewMap[ev.id] = assignments.map((a) => {
        const tm = db.teamMembers.find((m) => m.id === a.teamMemberId);
        crewAssignments.push({
          id: a.id,
          eventId: ev.id,
          name: tm?.name || "Senior Crew Member",
          role: a.role,
          specialization: tm?.specialization || a.role,
        });
        return {
          id: a.id,
          name: tm?.name || "Senior Crew Member",
          role: a.role,
          hours: a.hoursAssigned,
        };
      });
    });

    const celebrationDirectory = clientEvents.map((ev) => {
      const gal =
        ev.proofingGallery || getDefaultProofingGalleryForEvent(ev.id, ev.title);
      const quo = db.quotations.find((q) => q.eventId === ev.id);
      const inv = db.invoices.find((i) => i.eventId === ev.id);
      return {
        eventId: ev.id,
        quotationId: quo?.id || `quo-${ev.id.slice(-3)}`,
        quotationNumber:
          quo?.quotationNumber || `RS-QUO-${ev.id.slice(-3).toUpperCase()}`,
        invoiceNumber:
          inv?.invoiceNumber || `RS-INV-${ev.id.slice(-3).toUpperCase()}`,
        title: ev.title,
        clientId: activeClient.id,
        clientName: activeClient.name,
        clientPhone: activeClient.phone || "",
        clientEmail: activeClient.email || "",
        category: ev.category,
        weddingSubtype: ev.weddingSubtype,
        eventDate: ev.eventDate,
        venue: ev.venue,
        city: ev.city,
        status: ev.status,
        packagePrice: ev.packagePrice,
        totalClientPayments: ev.totalClientPayments || 0,
        remainingBalance: ev.remainingBalance || 0,
        pinCode: "",
        totalProofs: gal.photos.length,
        favoritesCount: gal.photos.filter((p) => p.isSelectedForAlbum).length,
      };
    });

    return NextResponse.json({
      authenticated: true,
      requiresLogin: false,
      activeEventId: activeEvent?.id || "",
      activeClient: sanitizeClientForClientPortal(activeClient),
      clientEvents: clientEvents.map((ev) => sanitizeEventForClient(ev)),
      celebrationDirectory,
      daySchedules: clientDaySchedules,
      invoices: clientInvoices,
      payments: clientPayments,
      quotations: clientQuotations,
      tasks: clientTasks,
      crewAssignments,
      assignedCrewMap,
      proofingGallery: gallery,
      profile: publicSafeProfile,
      addonCatalog: LUXURY_ADDON_CATALOG,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load client portal" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, eventId, clientId } = body;
    const rawIdentifier = (
      body.identifier ||
      clientId ||
      eventId ||
      ""
    ).trim();
    const providedPassword = (
      body.password ||
      body.pin ||
      req.headers.get("x-client-password") ||
      req.headers.get("x-client-pin") ||
      ""
    ).trim();

    const db = await dbInstance.ensureHydrated();

    const auth = authenticateClientAccount(
      db,
      rawIdentifier,
      providedPassword,
      eventId
    );
    if (!auth.client) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized: Valid Client Portal login required." },
        { status: auth.status || 401 }
      );
    }

    const client = auth.client;

    // 1. UPDATE CLIENT PROFILE (Works even if the client has no events yet)
    if (action === "UPDATE_PROFILE" || action === "UPDATE_CLIENT_PROFILE") {
      const nextEmail =
        typeof body.email === "string"
          ? body.email.trim().toLowerCase()
          : client.email;
      const nextPhone =
        typeof body.phone === "string" && body.phone.trim()
          ? body.phone.trim()
          : client.phone;
      const normPhone = normalizePhone(nextPhone);

      const conflict = db.clients.find((c) => {
        if (c.id === client.id) return false;
        if (nextEmail && c.email && c.email.trim().toLowerCase() === nextEmail) {
          return true;
        }
        const cDigits = normalizePhone(c.phone);
        if (normPhone.length >= 7 && cDigits === normPhone) return true;
        return false;
      });
      if (conflict) {
        return NextResponse.json(
          { error: "That email or phone number is already registered to another client account." },
          { status: 400 }
        );
      }

      if (typeof body.name === "string" && body.name.trim()) {
        client.name = body.name.trim();
      }
      if (typeof body.email === "string") client.email = nextEmail;
      if (typeof body.phone === "string" && body.phone.trim()) {
        client.phone = nextPhone;
      }
      if (typeof body.whatsapp === "string") {
        client.whatsapp = body.whatsapp.trim();
      }
      if (typeof body.city === "string") client.city = body.city.trim();
      if (typeof body.address === "string") client.address = body.address.trim();
      if (typeof body.notes === "string") client.notes = body.notes.trim();
      if (typeof body.newPassword === "string" && body.newPassword.trim().length >= 4) {
        client.portalPassword = body.newPassword.trim();
        client.hasLogin = true;
        client.loginStatus = "ACTIVE";
      }

      // Synchronize linked User record in db.users so Admin ClientsPage stays in sync
      const linkedUser = db.users.find(
        (u) => u.role === "CLIENT" && (u.id === client.userId || u.clientId === client.id)
      );
      if (linkedUser) {
        linkedUser.name = client.name;
        if (client.email) linkedUser.email = client.email;
        if (client.phone) linkedUser.phone = client.phone;
        linkedUser.status = client.loginStatus === "DISABLED" ? "DISABLED" : "ACTIVE";
      }

      await dbInstance.save();
      return NextResponse.json({
        success: true,
        client: sanitizeClientForClientPortal(client),
        updatedPassword:
          typeof body.newPassword === "string" && body.newPassword.trim().length >= 4
            ? client.portalPassword
            : undefined,
      });
    }

    // All remaining actions operate on an event owned by this client
    const event =
      db.events.find((e) => e.id === eventId && e.clientId === client.id) ||
      db.events.find((e) => e.clientId === client.id);

    if (!event) {
      return NextResponse.json(
        { error: "No event booking found for your client account." },
        { status: 404 }
      );
    }

    if (
      !event.proofingGallery ||
      !Array.isArray(event.proofingGallery.photos)
    ) {
      event.proofingGallery = getDefaultProofingGalleryForEvent(
        event.id,
        event.title
      );
    }

    // 2. UPDATE CELEBRATION SCHEDULE & VENUE DETAILS (or ADD DAY)
    if (action === "UPDATE_SCHEDULE" || action === "UPDATE_EVENT_SCHEDULE") {
      if (body.addDay && typeof body.addDay === "object") {
        const existingDays = db.daySchedules.filter(
          (d) => d.eventId === event.id
        );
        const nextDayNum = existingDays.length + 1;
        const newDay = {
          id: `ds-${Date.now().toString().slice(-6)}`,
          eventId: event.id,
          dayNumber: nextDayNum,
          date: body.addDay.date || event.eventDate,
          eventType: body.addDay.eventType || `Day ${nextDayNum} Function`,
          venue: body.addDay.venue || event.venue,
          timingMode: (body.addDay.timingMode || "NIGHT_TIME") as
            | "DAY_TIME"
            | "NIGHT_TIME",
          startTime: body.addDay.startTime || "18:00",
          endTime: body.addDay.endTime || "23:30",
          callTime: body.addDay.callTime || "17:00",
          dressCode: body.addDay.dressCode || "Traditional Formal",
          customPrice: Number(body.addDay.customPrice) || 45000,
          cameraCategory: "CAT_2" as const,
          crewCategory: "CREW_CAT_2" as const,
          cameraCount: 2,
          crewCount: 2,
          photographersCount: 1,
          cinematographersCount: 1,
          droneIncluded: Boolean(body.addDay.droneIncluded),
          notes: body.addDay.notes || "Added via Client Portal",
        };
        db.daySchedules.push(newDay);
        event.isMultiDay = true;
        event.daysCount = nextDayNum;
        event.packagePrice =
          Number(event.packagePrice || 0) + Number(newDay.customPrice || 0);
        await dbInstance.recalculateEvent(event.id);
        return NextResponse.json({
          success: true,
          daySchedule: newDay,
          event: sanitizeEventForClient(event),
        });
      }

      if (typeof body.title === "string" && body.title.trim()) {
        event.title = body.title.trim();
      }
      if (typeof body.eventDate === "string" && body.eventDate.trim()) {
        event.eventDate = body.eventDate.trim();
      }
      if (typeof body.venue === "string" && body.venue.trim()) {
        event.venue = body.venue.trim();
      }
      if (typeof body.city === "string" && body.city.trim()) {
        event.city = body.city.trim();
      }
      if (typeof body.startTime === "string") {
        event.startTime = body.startTime;
      }
      if (typeof body.endTime === "string") {
        event.endTime = body.endTime;
      }
      if (typeof body.notes === "string") {
        event.notes = body.notes;
      }
      if (typeof body.clientNotes === "string") {
        event.notes = body.clientNotes;
      }
      event.updatedDate = new Date().toISOString();
      await dbInstance.save();
      return NextResponse.json({
        success: true,
        event: sanitizeEventForClient(event),
      });
    }

    // 3. ADD NEW MULTI-DAY SCHEDULE FUNCTION
    if (action === "ADD_DAY_SCHEDULE") {
      const existingDays = db.daySchedules.filter(
        (d) => d.eventId === event.id
      );
      const nextDayNum = existingDays.length + 1;
      const newDay = {
        id: `ds-${Date.now().toString().slice(-6)}`,
        eventId: event.id,
        dayNumber: nextDayNum,
        date: body.date || event.eventDate,
        eventType: body.eventType || `Day ${nextDayNum} Function`,
        venue: body.venue || event.venue,
        timingMode: (body.timingMode || "NIGHT_TIME") as
          | "DAY_TIME"
          | "NIGHT_TIME",
        startTime: body.startTime || "18:00",
        endTime: body.endTime || "23:30",
        callTime: body.callTime || "17:00",
        dressCode: body.dressCode || "Traditional Formal",
        customPrice: Number(body.customPrice) || 45000,
        cameraCategory: "CAT_2" as const,
        crewCategory: "CREW_CAT_2" as const,
        cameraCount: 2,
        crewCount: 2,
        photographersCount: 1,
        cinematographersCount: 1,
        droneIncluded: Boolean(body.droneIncluded),
        notes: body.notes || "Added via Client Portal",
      };
      db.daySchedules.push(newDay);
      event.isMultiDay = true;
      event.daysCount = nextDayNum;
      event.packagePrice =
        Number(event.packagePrice || 0) + Number(newDay.customPrice || 0);
      await dbInstance.recalculateEvent(event.id);
      return NextResponse.json({
        success: true,
        daySchedule: newDay,
        event: sanitizeEventForClient(event),
      });
    }

    // 4. UPDATE INTERACTIVE PACKAGE ADD-ONS
    if (action === "UPDATE_ADDONS" || action === "TOGGLE_EVENT_ADDONS") {
      const selectedAddons: string[] = Array.isArray(body.selectedAddons)
        ? body.selectedAddons
        : [];
      const baseWithoutOldAddons = (() => {
        const prevAddons = event.selectedAddons || [];
        const prevSum = prevAddons.reduce((sum, label) => {
          const item = LUXURY_ADDON_CATALOG.find(
            (a) =>
              a.label.toLowerCase() === label.toLowerCase() ||
              a.shortLabel.toLowerCase() === label.toLowerCase()
          );
          return sum + (item ? item.price : 0);
        }, 0);
        return Math.max(85000, (event.packagePrice || 185000) - prevSum);
      })();

      const newAddonsTotal = selectedAddons.reduce((sum, label) => {
        const item = LUXURY_ADDON_CATALOG.find(
          (a) =>
            a.label.toLowerCase() === label.toLowerCase() ||
            a.shortLabel.toLowerCase() === label.toLowerCase()
        );
        return sum + (item ? item.price : 0);
      }, 0);

      event.selectedAddons = selectedAddons;
      event.packagePrice = baseWithoutOldAddons + newAddonsTotal;
      await dbInstance.recalculateEvent(event.id);

      return NextResponse.json({
        success: true,
        event: sanitizeEventForClient(event),
      });
    }

    // 5. TOGGLE PHOTO ALBUM FAVORITE
    if (action === "TOGGLE_PHOTO_FAVORITE") {
      const { photoId } = body;
      event.proofingGallery.photos = event.proofingGallery.photos.map(
        (p: ProofingPhotoItem) => {
          if (p.id !== photoId) return p;
          const nextState = !p.isSelectedForAlbum;
          return {
            ...p,
            isSelectedForAlbum: nextState,
            selectedAt: nextState ? new Date().toISOString() : undefined,
          };
        }
      );
      await dbInstance.save();
      return NextResponse.json({
        success: true,
        proofingGallery: event.proofingGallery,
      });
    }

    // 6. SAVE PHOTO RETOUCHING NOTE
    if (action === "SAVE_PHOTO_NOTE") {
      const { photoId, retouchingNote } = body;
      event.proofingGallery.photos = event.proofingGallery.photos.map(
        (p: ProofingPhotoItem) =>
          p.id === photoId
            ? { ...p, retouchingNote: String(retouchingNote || "").trim() }
            : p
      );
      await dbInstance.save();
      return NextResponse.json({
        success: true,
        proofingGallery: event.proofingGallery,
      });
    }

    // 7. ADD CUSTOM PROOFING PHOTO
    if (action === "ADD_PROOFING_PHOTO") {
      const { title, url, dayLabel, category, retouchingNote } = body;
      if (!title || !url) {
        return NextResponse.json(
          { error: "Photo title and image URL are required" },
          { status: 400 }
        );
      }
      const newPhoto: ProofingPhotoItem = {
        id: `${event.id}-prf-${Date.now().toString().slice(-5)}`,
        url: String(url).trim(),
        title: String(title).trim(),
        dayLabel: String(dayLabel || "Day 2 · Barat").trim(),
        category: String(category || "Couple Portrait").trim(),
        cameraUsed: "Client Reference / Studio Upload",
        lensUsed: "85mm f/1.4 GM",
        isSelectedForAlbum: true,
        retouchingNote: String(retouchingNote || "").trim(),
        selectedAt: new Date().toISOString(),
      };
      event.proofingGallery.photos.unshift(newPhoto);
      await dbInstance.save();
      return NextResponse.json({
        success: true,
        proofingGallery: event.proofingGallery,
      });
    }

    // 8. SUBMIT FINAL ALBUM SELECTION
    if (action === "SUBMIT_ALBUM_SELECTION") {
      event.proofingGallery.selectionStatus = "Submitted";
      event.proofingGallery.submittedAt = new Date().toISOString();
      if (typeof body.clientSubmissionNote === "string") {
        event.proofingGallery.clientSubmissionNote =
          body.clientSubmissionNote.trim();
      }
      await dbInstance.save();
      return NextResponse.json({
        success: true,
        proofingGallery: event.proofingGallery,
      });
    }

    // 9. UPLOAD DIGITAL DEPOSIT RECEIPT
    if (action === "UPLOAD_DEPOSIT_RECEIPT") {
      const amount = Math.max(0, Number(body.amount) || 0);
      const method = (body.method || "Bank Transfer") as
        | "Bank Transfer"
        | "JazzCash"
        | "EasyPaisa"
        | "RAAST"
        | "Cash"
        | "Card";
      const reference = String(body.reference || "").trim();
      const senderAccountTitle = String(body.senderAccountTitle || "").trim();
      const receiptImageUrl = String(body.receiptImageUrl || "").trim();
      const notes = String(body.notes || "").trim();

      if (amount <= 0) {
        return NextResponse.json(
          { error: "Please enter a valid payment amount." },
          { status: 400 }
        );
      }

      const invoice = db.invoices.find(
        (i) => i.eventId === event.id || i.clientId === event.clientId
      );
      const duplicatePayment = reference
        ? db.payments.find(
            (p) =>
              p.eventId === event.id &&
              p.amount === amount &&
              (p.reference || "").trim().toLowerCase() === reference.toLowerCase()
          )
        : undefined;

      if (duplicatePayment) {
        return NextResponse.json({
          success: true,
          payment: duplicatePayment,
          event: sanitizeEventForClient(event),
          message: "Deposit receipt already recorded and verified.",
        });
      }

      const maxPaySeq = db.payments.reduce((max, p) => {
        const m = (p.paymentId || "").match(/(\d+)$/);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 0);

      const newPayment = {
        id: `pay-${Date.now().toString().slice(-6)}`,
        paymentId: `RS-PAY-${new Date().getFullYear()}-${String(
          maxPaySeq + 1
        ).padStart(3, "0")}`,
        invoiceId: invoice?.id || `inv-${event.id.slice(-6)}`,
        eventId: event.id,
        clientId: event.clientId,
        amount,
        paymentDate: new Date().toISOString().split("T")[0],
        method,
        reference: reference || `REF-${Date.now().toString().slice(-5)}`,
        senderAccountTitle: senderAccountTitle || client.name,
        receiptImageUrl: receiptImageUrl || undefined,
        receiptImageDataUrl: receiptImageUrl || undefined,
        verificationStatus: "Verified" as const,
        submittedByClient: true,
        notes:
          notes ||
          `Online deposit submitted via Client Portal (${method})`,
        createdBy: client.name || "Client Portal",
      };

      db.payments.unshift(newPayment);
      await dbInstance.recalculateEvent(event.id);

      return NextResponse.json({
        success: true,
        payment: newPayment,
        event: sanitizeEventForClient(event),
      });
    }

    // 10. DIGITAL CONTRACT & PROPOSAL APPROVAL
    if (action === "APPROVE_CONTRACT" || action === "APPROVE_PROPOSAL") {
      const signatureName = String(
        body.signatureName || client.name || "Client"
      ).trim();
      const signatureData = String(
        body.signatureData || signatureName
      ).trim();
      const notes = String(body.notes || body.clientNotes || "").trim();
      const nowIso = new Date().toISOString();

      event.status = "Confirmed";
      event.approvedByClient = signatureName;
      event.approvedAt = nowIso;
      if (notes) {
        event.clientApprovalNotes = notes;
        if (!event.notes?.includes(notes)) {
          event.notes = `${event.notes ? event.notes + " | " : ""}Client Portal Signature Note: ${notes}`;
        }
      }
      if (!Array.isArray(event.approvalHistory)) {
        event.approvalHistory = [];
      }
      const approvalEntry = {
        id: `apr-${Date.now().toString().slice(-6)}`,
        action: "ACCEPTED" as const,
        actorName: signatureName,
        signatureName,
        actorRole: "CLIENT" as const,
        timestamp: nowIso,
        packagePriceSnapshot: event.packagePrice,
        selectedAddonsSnapshot: event.selectedAddons || [],
        details: `Digitally signed & accepted proposal terms as "${signatureName}"${notes ? ` — Note: ${notes}` : ""}`,
        note: notes || "Digitally signed & confirmed via Client Portal",
      };
      event.approvalHistory.unshift(approvalEntry as any);

      // Synchronize digital signature and APPROVED status onto the linked Quotation
      const linkedQuotation = db.quotations.find(
        (q) => q.eventId === event.id || (!q.eventId && q.clientId === client.id)
      );
      if (linkedQuotation) {
        linkedQuotation.eventId = event.id;
        linkedQuotation.approvedByName = signatureName;
        linkedQuotation.approvedAt = nowIso;
        linkedQuotation.signatureData = signatureData;
        if (
          !linkedQuotation.status ||
          linkedQuotation.status === "DRAFT" ||
          linkedQuotation.status === "SENT"
        ) {
          linkedQuotation.status = "APPROVED";
        }
        if (!Array.isArray(linkedQuotation.approvalHistory)) {
          linkedQuotation.approvalHistory = [];
        }
        linkedQuotation.approvalHistory.unshift(approvalEntry as any);
      }

      await dbInstance.recalculateEvent(event.id);
      return NextResponse.json({
        success: true,
        message: `Proposal digitally signed and approved by ${signatureName}!`,
        event: sanitizeEventForClient(event),
        quotation: linkedQuotation || null,
      });
    }

    return NextResponse.json(
      { error: "Unsupported client portal action" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update client portal" },
      { status: 500 }
    );
  }
}
