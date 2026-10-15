"use client";

import type {
  Event,
  Client,
  Quotation,
  Invoice,
  EventDaySchedule,
  Payment,
  AdminProfile,
  EventProofingGallery,
  ProofingPhotoItem,
} from "@/components/admin/types";

export interface SavedOfflineProposalRecord {
  proposalId: string;
  eventId: string;
  quotationId: string;
  quotationNumber: string;
  title: string;
  clientName: string;
  eventDate: string;
  venue: string;
  city: string;
  status: string;
  packagePrice: number;
  selectedAddons: string[];
  savedAt: string;
  payload: {
    event: Event;
    client: Client;
    quotation: Quotation;
    invoice: Invoice | null;
    daySchedules: EventDaySchedule[];
    payments: Payment[];
    profile: AdminProfile;
    addonCatalog: {
      id: string;
      label: string;
      shortLabel: string;
      price: number;
      category: string;
    }[];
  };
}

export interface SavedOfflineGalleryRecord {
  eventId: string;
  title: string;
  clientName: string;
  category: string;
  eventDate: string;
  venue: string;
  city: string;
  pinCode: string;
  totalProofs: number;
  favoritesCount: number;
  savedAt: string;
  payload: {
    event: {
      id: string;
      title: string;
      category: string;
      weddingSubtype?: string;
      eventDate: string;
      venue: string;
      city: string;
      status: string;
    };
    client: {
      id: string;
      name: string;
      phone: string;
      whatsapp: string;
      city: string;
    };
    daySchedules: EventDaySchedule[];
    proofingGallery: EventProofingGallery;
    profile: {
      studioName: string;
      tagline: string;
      phone: string;
      whatsapp: string;
      email: string;
      address: string;
      city: string;
      logo?: string;
      primaryLogo?: string;
    };
  };
}

export interface OfflineSyncQueueItem {
  id: string;
  type:
    | "TOGGLE_PHOTO_SELECTION"
    | "UPDATE_RETOUCH_NOTE"
    | "SAVE_GALLERY_PROGRESS"
    | "SUBMIT_FINAL_SELECTION"
    | "UPDATE_PROPOSAL_ADDONS"
    | "APPROVE_PROPOSAL"
    | "CLIENT_PORTAL_ACTION";
  endpoint: string;
  method: "POST";
  body: Record<string, unknown>;
  label: string;
  eventId?: string;
  proposalId?: string;
  createdAt: string;
  status: "PENDING" | "SYNCED" | "FAILED";
}

const DB_NAME = "royal-studio-offline-vault";
const DB_VERSION = 1;
const STORE_PROPOSALS = "proposals";
const STORE_GALLERIES = "galleries";
const STORE_PORTAL = "portal";
const STORE_SYNC_QUEUE = "syncQueue";

const LS_PROPOSALS_KEY = "rs_offline_proposals_v1";
const LS_GALLERIES_KEY = "rs_offline_galleries_v1";
const LS_PORTAL_KEY = "rs_offline_portal_v1";
const LS_DIRECTORY_KEY = "rs_offline_directory_v1";
const LS_SYNC_QUEUE_KEY = "rs_offline_sync_queue_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function notifyVaultUpdated(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent("royal-studio-offline-vault-updated"));
}

function openVaultDB(): Promise<IDBDatabase | null> {
  if (!isBrowser() || typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_PROPOSALS)) {
          db.createObjectStore(STORE_PROPOSALS, { keyPath: "proposalId" });
        }
        if (!db.objectStoreNames.contains(STORE_GALLERIES)) {
          db.createObjectStore(STORE_GALLERIES, { keyPath: "eventId" });
        }
        if (!db.objectStoreNames.contains(STORE_PORTAL)) {
          db.createObjectStore(STORE_PORTAL, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
          db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readLocalJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function requestServiceWorkerCacheUrls(urls: string[]): void {
  if (!isBrowser() || !("serviceWorker" in navigator)) return;
  const cleanUrls = Array.from(new Set(urls.filter(Boolean)));
  if (cleanUrls.length === 0) return;

  navigator.serviceWorker.ready
    .then((reg) => {
      if (reg.active) {
        reg.active.postMessage({
          type: "CACHE_OFFLINE_BUNDLE",
          urls: cleanUrls,
        });
      }
    })
    .catch(() => {});
}

export async function registerServiceWorkerBackgroundSync(
  tag = "royal-studio-bg-sync"
): Promise<void> {
  if (!isBrowser() || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("sync" in reg && reg.sync && typeof (reg.sync as any).register === "function") {
      await (reg.sync as any).register(tag);
    } else if (reg.active && navigator.onLine) {
      reg.active.postMessage({ type: "TRIGGER_BACKGROUND_SYNC" });
    }
  } catch {
    // Fallback handled by window online listener
  }
}

// ============================================================================
// 1. SAVED PROPOSALS OFFLINE VAULT
// ============================================================================

export async function saveOfflineProposal(
  proposalId: string,
  payload: SavedOfflineProposalRecord["payload"]
): Promise<SavedOfflineProposalRecord | null> {
  if (!isBrowser() || !payload?.event || !payload?.quotation) return null;

  const record: SavedOfflineProposalRecord = {
    proposalId: proposalId || payload.quotation.id || payload.event.id,
    eventId: payload.event.id,
    quotationId: payload.quotation.id,
    quotationNumber: payload.quotation.quotationNumber || payload.quotation.id,
    title: payload.event.title,
    clientName: payload.client?.name || (payload.event as any).clientName || "Valued Client",
    eventDate: payload.event.eventDate,
    venue: payload.event.venue,
    city: payload.event.city,
    status: payload.event.status,
    packagePrice: Number(payload.event.packagePrice || payload.quotation.total || 0),
    selectedAddons: payload.event.selectedAddons || [],
    savedAt: new Date().toISOString(),
    payload,
  };

  // Persist to localStorage map (saves under both proposalId, quotationId, and eventId lookup keys)
  const map = readLocalJson<Record<string, SavedOfflineProposalRecord>>(
    LS_PROPOSALS_KEY,
    {}
  );
  map[record.proposalId] = record;
  if (record.quotationId) map[record.quotationId] = record;
  if (record.eventId) map[record.eventId] = record;
  writeLocalJson(LS_PROPOSALS_KEY, map);

  // Persist to IndexedDB
  const db = await openVaultDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_PROPOSALS, "readwrite");
        const store = tx.objectStore(STORE_PROPOSALS);
        store.put(record);
        if (record.quotationId && record.quotationId !== record.proposalId) {
          store.put({ ...record, proposalId: record.quotationId });
        }
        if (record.eventId && record.eventId !== record.proposalId) {
          store.put({ ...record, proposalId: record.eventId });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // Tell Service Worker to cache the proposal page & API route (including unlocked PIN query if available)
  const session = getCustomerPortalSession();
  const unlockedPin =
    (isBrowser() &&
      (sessionStorage.getItem(`rs_gallery_unlocked_${record.proposalId}`) ||
        sessionStorage.getItem(`rs_gallery_unlocked_${record.eventId}`))) ||
    session?.pin ||
    "";
  const urlsToCache = [
    "/proposal",
    `/proposal/${encodeURIComponent(record.proposalId)}`,
    `/proposal/${encodeURIComponent(record.eventId)}`,
    `/api/proposal/${encodeURIComponent(record.proposalId)}`,
    `/api/proposal/${encodeURIComponent(record.eventId)}`,
  ];
  if (unlockedPin) {
    urlsToCache.push(
      `/api/proposal/${encodeURIComponent(record.proposalId)}?pin=${encodeURIComponent(unlockedPin)}`,
      `/api/proposal/${encodeURIComponent(record.eventId)}?pin=${encodeURIComponent(unlockedPin)}`
    );
  }
  requestServiceWorkerCacheUrls(urlsToCache);

  notifyVaultUpdated();
  return record;
}

export async function getOfflineProposal(
  idOrRef: string
): Promise<SavedOfflineProposalRecord | null> {
  if (!isBrowser() || !idOrRef) return null;

  const db = await openVaultDB();
  if (db) {
    const idbMatch = await new Promise<SavedOfflineProposalRecord | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_PROPOSALS, "readonly");
        const req = tx.objectStore(STORE_PROPOSALS).get(idOrRef);
        req.onsuccess = () => resolve((req.result as SavedOfflineProposalRecord) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (idbMatch) return idbMatch;
  }

  const map = readLocalJson<Record<string, SavedOfflineProposalRecord>>(
    LS_PROPOSALS_KEY,
    {}
  );
  if (map[idOrRef]) return map[idOrRef];

  const lower = idOrRef.toLowerCase();
  const match = Object.values(map).find(
    (item) =>
      item.proposalId.toLowerCase() === lower ||
      item.eventId.toLowerCase() === lower ||
      item.quotationId.toLowerCase() === lower ||
      item.quotationNumber.toLowerCase() === lower
  );
  return match || null;
}

export async function getAllOfflineProposals(): Promise<SavedOfflineProposalRecord[]> {
  if (!isBrowser()) return [];

  const uniqueByEvent = new Map<string, SavedOfflineProposalRecord>();

  const map = readLocalJson<Record<string, SavedOfflineProposalRecord>>(
    LS_PROPOSALS_KEY,
    {}
  );
  Object.values(map).forEach((rec) => {
    if (rec?.eventId) {
      uniqueByEvent.set(rec.eventId, rec);
    }
  });

  const db = await openVaultDB();
  if (db) {
    const idbAll = await new Promise<SavedOfflineProposalRecord[]>((resolve) => {
      try {
        const tx = db.transaction(STORE_PROPOSALS, "readonly");
        const req = tx.objectStore(STORE_PROPOSALS).getAll();
        req.onsuccess = () => resolve((req.result as SavedOfflineProposalRecord[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
    idbAll.forEach((rec) => {
      if (rec?.eventId) {
        const existing = uniqueByEvent.get(rec.eventId);
        if (!existing || rec.savedAt >= existing.savedAt) {
          uniqueByEvent.set(rec.eventId, rec);
        }
      }
    });
  }

  return Array.from(uniqueByEvent.values()).sort((a, b) =>
    b.savedAt.localeCompare(a.savedAt)
  );
}

// ============================================================================
// 2. SAVED GALLERIES & FAVORITE PHOTOS OFFLINE VAULT
// ============================================================================

export async function saveOfflineGallery(
  eventId: string,
  payload: SavedOfflineGalleryRecord["payload"]
): Promise<SavedOfflineGalleryRecord | null> {
  if (!isBrowser() || !payload?.event || !payload?.proofingGallery) return null;

  const photos = Array.isArray(payload.proofingGallery.photos)
    ? payload.proofingGallery.photos
    : [];
  const favoritesCount = photos.filter((p) => p.isSelectedForAlbum).length;

  const record: SavedOfflineGalleryRecord = {
    eventId: payload.event.id || eventId,
    title: payload.event.title,
    clientName: payload.client?.name || "Valued Couple",
    category: payload.event.category || "Wedding",
    eventDate: payload.event.eventDate,
    venue: payload.event.venue,
    city: payload.event.city,
    pinCode: payload.proofingGallery.pinCode || "1234",
    totalProofs: photos.length,
    favoritesCount,
    savedAt: new Date().toISOString(),
    payload,
  };

  const map = readLocalJson<Record<string, SavedOfflineGalleryRecord>>(
    LS_GALLERIES_KEY,
    {}
  );
  map[record.eventId] = record;
  writeLocalJson(LS_GALLERIES_KEY, map);

  const db = await openVaultDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_GALLERIES, "readwrite");
        tx.objectStore(STORE_GALLERIES).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // Ask Service Worker to cache the gallery page, API route, and all favorite photo image URLs
  const favoriteImageUrls = photos
    .filter((p) => p.isSelectedForAlbum || p.retouchingNote)
    .map((p) => p.url)
    .filter(Boolean);

  const sampleImageUrls = photos
    .slice(0, 12)
    .map((p) => p.url)
    .filter(Boolean);

  requestServiceWorkerCacheUrls([
    "/gallery",
    `/gallery/${encodeURIComponent(record.eventId)}`,
    `/api/gallery/${encodeURIComponent(record.eventId)}`,
    ...favoriteImageUrls,
    ...sampleImageUrls,
  ]);

  notifyVaultUpdated();
  return record;
}

export async function getOfflineGallery(
  eventId: string
): Promise<SavedOfflineGalleryRecord | null> {
  if (!isBrowser() || !eventId) return null;

  const db = await openVaultDB();
  if (db) {
    const idbMatch = await new Promise<SavedOfflineGalleryRecord | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_GALLERIES, "readonly");
        const req = tx.objectStore(STORE_GALLERIES).get(eventId);
        req.onsuccess = () => resolve((req.result as SavedOfflineGalleryRecord) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (idbMatch) return idbMatch;
  }

  const map = readLocalJson<Record<string, SavedOfflineGalleryRecord>>(
    LS_GALLERIES_KEY,
    {}
  );
  return map[eventId] || null;
}

export async function getAllOfflineGalleries(): Promise<SavedOfflineGalleryRecord[]> {
  if (!isBrowser()) return [];

  const uniqueByEvent = new Map<string, SavedOfflineGalleryRecord>();
  const map = readLocalJson<Record<string, SavedOfflineGalleryRecord>>(
    LS_GALLERIES_KEY,
    {}
  );
  Object.values(map).forEach((rec) => {
    if (rec?.eventId) uniqueByEvent.set(rec.eventId, rec);
  });

  const db = await openVaultDB();
  if (db) {
    const idbAll = await new Promise<SavedOfflineGalleryRecord[]>((resolve) => {
      try {
        const tx = db.transaction(STORE_GALLERIES, "readonly");
        const req = tx.objectStore(STORE_GALLERIES).getAll();
        req.onsuccess = () => resolve((req.result as SavedOfflineGalleryRecord[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
    idbAll.forEach((rec) => {
      if (rec?.eventId) {
        const existing = uniqueByEvent.get(rec.eventId);
        if (!existing || rec.savedAt >= existing.savedAt) {
          uniqueByEvent.set(rec.eventId, rec);
        }
      }
    });
  }

  return Array.from(uniqueByEvent.values()).sort((a, b) =>
    b.savedAt.localeCompare(a.savedAt)
  );
}

export interface OfflineFavoritePhotoWithEvent {
  eventId: string;
  eventTitle: string;
  clientName: string;
  eventDate: string;
  city: string;
  photo: ProofingPhotoItem;
}

export async function getAllOfflineFavoritePhotos(): Promise<
  OfflineFavoritePhotoWithEvent[]
> {
  const galleries = await getAllOfflineGalleries();
  const items: OfflineFavoritePhotoWithEvent[] = [];

  for (const gal of galleries) {
    const photos = gal.payload?.proofingGallery?.photos || [];
    for (const photo of photos) {
      if (photo.isSelectedForAlbum || (photo.retouchingNote && photo.retouchingNote.trim())) {
        items.push({
          eventId: gal.eventId,
          eventTitle: gal.title,
          clientName: gal.clientName,
          eventDate: gal.eventDate,
          city: gal.city,
          photo,
        });
      }
    }
  }
  return items;
}

// ============================================================================
// 3. CLIENT PORTAL & DIRECTORY OFFLINE CACHE
// ============================================================================

export async function saveOfflinePortalData(
  payload: Record<string, any>
): Promise<void> {
  if (!isBrowser() || !payload) return;

  const activeEventId = payload.activeEventId || "default";
  const map = readLocalJson<Record<string, any>>(LS_PORTAL_KEY, {});
  map[activeEventId] = {
    key: activeEventId,
    savedAt: new Date().toISOString(),
    payload,
  };
  map["latest"] = map[activeEventId];
  writeLocalJson(LS_PORTAL_KEY, map);

  if (Array.isArray(payload.celebrationDirectory)) {
    writeLocalJson(LS_DIRECTORY_KEY, payload.celebrationDirectory);
  }

  const db = await openVaultDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_PORTAL, "readwrite");
        const store = tx.objectStore(STORE_PORTAL);
        store.put({
          key: activeEventId,
          savedAt: new Date().toISOString(),
          payload,
        });
        store.put({
          key: "latest",
          savedAt: new Date().toISOString(),
          payload,
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // Also extract and persist any embedded event proposal & gallery into their stores
  try {
    const clientEvents: Event[] = Array.isArray(payload.clientEvents)
      ? payload.clientEvents
      : [];
    const activeEvt =
      clientEvents.find((e) => e.id === activeEventId) || clientEvents[0];
    if (activeEvt) {
      const evtQuotation = (payload.quotations || []).find(
        (q: Quotation) => q.eventId === activeEvt.id
      );
      const evtInvoice =
        (payload.invoices || []).find((i: Invoice) => i.eventId === activeEvt.id) ||
        null;
      const evtDays = (payload.daySchedules || []).filter(
        (d: EventDaySchedule) => d.eventId === activeEvt.id
      );
      const evtPayments = (payload.payments || []).filter(
        (p: Payment) => p.eventId === activeEvt.id
      );

      if (evtQuotation && payload.activeClient && payload.profile) {
        await saveOfflineProposal(evtQuotation.id || activeEvt.id, {
          event: activeEvt,
          client: payload.activeClient,
          quotation: evtQuotation,
          invoice: evtInvoice,
          daySchedules: evtDays,
          payments: evtPayments,
          profile: payload.profile,
          addonCatalog: payload.addonCatalog || [],
        });
      }

      if (activeEvt.proofingGallery && payload.activeClient && payload.profile) {
        await saveOfflineGallery(activeEvt.id, {
          event: {
            id: activeEvt.id,
            title: activeEvt.title,
            category: activeEvt.category,
            weddingSubtype: activeEvt.weddingSubtype,
            eventDate: activeEvt.eventDate,
            venue: activeEvt.venue,
            city: activeEvt.city,
            status: activeEvt.status,
          },
          client: {
            id: payload.activeClient.id,
            name: payload.activeClient.name,
            phone: payload.activeClient.phone,
            whatsapp: payload.activeClient.whatsapp || payload.activeClient.phone,
            city: payload.activeClient.city,
          },
          daySchedules: evtDays,
          proofingGallery: activeEvt.proofingGallery,
          profile: {
            studioName: payload.profile.studioName || "Royal Studio",
            tagline: payload.profile.tagline || "",
            phone: payload.profile.phone || "",
            whatsapp: payload.profile.whatsapp || "",
            email: payload.profile.email || "",
            address: payload.profile.address || "",
            city: payload.profile.city || "Burewala",
            logo: payload.profile.logo,
            primaryLogo: payload.profile.primaryLogo,
          },
        });
      }
    }
  } catch {
    // Non-blocking enrichment
  }

  // Aggressively warm the Service Worker cache for client-portal routes and static assets
  const currentSession = getCustomerPortalSession();
  const warmUrls: string[] = [
    "/client-portal",
    "/proposal",
    "/gallery",
    "/manifest.json",
    "/RoyalLogo.png",
  ];
  if (currentSession?.identifier && currentSession?.pin) {
    const params = new URLSearchParams({
      identifier: currentSession.identifier,
      eventId: activeEventId !== "default" ? activeEventId : currentSession.eventId || currentSession.identifier,
      pin: currentSession.pin,
    });
    warmUrls.push(`/api/client-portal?${params.toString()}`);
  }
  requestServiceWorkerCacheUrls(warmUrls);

  notifyVaultUpdated();
}

export async function getOfflinePortalData(
  eventId?: string
): Promise<Record<string, any> | null> {
  if (!isBrowser()) return null;
  const lookupKey = eventId || "latest";

  const db = await openVaultDB();
  if (db) {
    const idbRes = await new Promise<Record<string, any> | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_PORTAL, "readonly");
        const store = tx.objectStore(STORE_PORTAL);
        const req = store.get(lookupKey);
        req.onsuccess = () => {
          if (req.result?.payload) {
            resolve(req.result.payload);
          } else {
            const latestReq = store.get("latest");
            latestReq.onsuccess = () => resolve(latestReq.result?.payload || null);
            latestReq.onerror = () => resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    if (idbRes) return idbRes;
  }

  const map = readLocalJson<Record<string, any>>(LS_PORTAL_KEY, {});
  return map[lookupKey]?.payload || map["latest"]?.payload || null;
}

export function getOfflineCelebrationDirectory(): any[] {
  return readLocalJson<any[]>(LS_DIRECTORY_KEY, []);
}

export interface CustomerPortalAuthSession {
  identifier: string;
  eventId: string;
  clientId?: string;
  quotationId?: string;
  pin: string;
  clientName?: string;
  eventTitle?: string;
  verifiedAt: string;
}

const SESSION_AUTH_KEY = "rs_client_portal_session_v2";

export function getCustomerPortalSession(): CustomerPortalAuthSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomerPortalAuthSession;
  } catch {
    return null;
  }
}

export function setCustomerPortalSession(
  session: CustomerPortalAuthSession
): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(session));
    if (session.eventId && session.pin) {
      sessionStorage.setItem(
        `rs_gallery_unlocked_${session.eventId}`,
        session.pin
      );
    }
    notifyVaultUpdated();
  } catch {
    // Ignore
  }
}

export function clearCustomerPortalSession(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    localStorage.removeItem(LS_PROPOSALS_KEY);
    localStorage.removeItem(LS_GALLERIES_KEY);
    localStorage.removeItem(LS_PORTAL_KEY);
    localStorage.removeItem(LS_DIRECTORY_KEY);
    notifyVaultUpdated();
  } catch {
    // Ignore
  }
}

// ============================================================================
// 4. BACKGROUND SYNC QUEUE FOR OFFLINE FAVORITES, NOTES & PROPOSAL EDITS
// ============================================================================

export async function getBackgroundSyncQueue(): Promise<OfflineSyncQueueItem[]> {
  if (!isBrowser()) return [];

  const list = readLocalJson<OfflineSyncQueueItem[]>(LS_SYNC_QUEUE_KEY, []);
  const byId = new Map<string, OfflineSyncQueueItem>();
  list.forEach((item) => {
    if (item?.id) byId.set(item.id, item);
  });

  const db = await openVaultDB();
  if (db) {
    const idbItems = await new Promise<OfflineSyncQueueItem[]>((resolve) => {
      try {
        const tx = db.transaction(STORE_SYNC_QUEUE, "readonly");
        const req = tx.objectStore(STORE_SYNC_QUEUE).getAll();
        req.onsuccess = () => resolve((req.result as OfflineSyncQueueItem[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
    idbItems.forEach((item) => {
      if (item?.id) byId.set(item.id, item);
    });
  }

  return Array.from(byId.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
}

export async function enqueueBackgroundSync(
  input: Omit<OfflineSyncQueueItem, "id" | "createdAt" | "status">
): Promise<OfflineSyncQueueItem> {
  const newItem: OfflineSyncQueueItem = {
    ...input,
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: "PENDING",
  };

  const current = await getBackgroundSyncQueue();
  const updated = [...current, newItem];
  writeLocalJson(LS_SYNC_QUEUE_KEY, updated);

  const db = await openVaultDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_SYNC_QUEUE, "readwrite");
        tx.objectStore(STORE_SYNC_QUEUE).put(newItem);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  await registerServiceWorkerBackgroundSync("royal-studio-bg-sync");
  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent("royal-studio-offline-action-queued", {
        detail: {
          item: newItem,
          pendingCount: updated.filter((i) => i.status === "PENDING").length,
        },
      })
    );
  }
  notifyVaultUpdated();
  return newItem;
}

export async function flushBackgroundSyncQueue(): Promise<{
  syncedCount: number;
  remainingCount: number;
}> {
  if (!isBrowser() || !navigator.onLine) {
    const all = await getBackgroundSyncQueue();
    return {
      syncedCount: 0,
      remainingCount: all.filter((i) => i.status === "PENDING").length,
    };
  }

  const queue = await getBackgroundSyncQueue();
  const pending = queue.filter((i) => i.status === "PENDING");
  if (pending.length === 0) {
    return { syncedCount: 0, remainingCount: 0 };
  }

  let syncedCount = 0;
  const remaining: OfflineSyncQueueItem[] = [];

  for (const item of pending) {
    try {
      const res = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
          "X-Background-Sync": "1",
        },
        body: JSON.stringify(item.body),
      });
      if (res.ok) {
        syncedCount += 1;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  writeLocalJson(LS_SYNC_QUEUE_KEY, remaining);

  const db = await openVaultDB();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_SYNC_QUEUE, "readwrite");
        const store = tx.objectStore(STORE_SYNC_QUEUE);
        store.clear();
        remaining.forEach((r) => store.put(r));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  if (syncedCount > 0) {
    window.dispatchEvent(
      new CustomEvent("royal-studio-sync-completed", {
        detail: { syncedCount, remainingCount: remaining.length },
      })
    );
  }
  notifyVaultUpdated();

  return {
    syncedCount,
    remainingCount: remaining.length,
  };
}

// ============================================================================
// 5. PRE-CACHE / WARM OFFLINE BUNDLE HELPER
// ============================================================================

export async function warmAllSavedProposalsAndGalleries(): Promise<{
  proposalsSaved: number;
  galleriesSaved: number;
  favoritesCount: number;
}> {
  if (!isBrowser()) {
    return { proposalsSaved: 0, galleriesSaved: 0, favoritesCount: 0 };
  }

  let proposalsSaved = 0;
  let galleriesSaved = 0;
  const session = getCustomerPortalSession();

  try {
    if (session?.identifier && session?.pin) {
      const params = new URLSearchParams({
        identifier: session.identifier,
        eventId: session.eventId || session.identifier,
        pin: session.pin,
      });
      const portalRes = await fetch(`/api/client-portal?${params.toString()}`);
      if (portalRes.ok) {
        const portalJson = await portalRes.json();
        if (portalJson?.authenticated) {
          await saveOfflinePortalData(portalJson);

          const directory: any[] = Array.isArray(portalJson?.celebrationDirectory)
            ? portalJson.celebrationDirectory
            : [];

          for (const entry of directory) {
            const eventId = entry.eventId;
            const quotationId = entry.quotationId || entry.eventId;
            const entryPin = entry.pinCode || session.pin;

            try {
              const propRes = await fetch(
                `/api/proposal/${encodeURIComponent(quotationId)}?pin=${encodeURIComponent(entryPin)}`
              );
              if (propRes.ok) {
                const propJson = await propRes.json();
                if (!propJson.locked) {
                  await saveOfflineProposal(quotationId, propJson);
                  proposalsSaved += 1;
                }
              }
            } catch {
              // Ignore
            }

            try {
              const galRes = await fetch(
                `/api/gallery/${encodeURIComponent(eventId)}?pin=${encodeURIComponent(entryPin)}`
              );
              if (galRes.ok) {
                const galJson = await galRes.json();
                if (!galJson.locked) {
                  await saveOfflineGallery(eventId, galJson);
                  galleriesSaved += 1;
                }
              }
            } catch {
              // Ignore
            }
          }
        }
      }
    }
  } catch {
    // Offline already
  }

  const allFavorites = await getAllOfflineFavoritePhotos();
  notifyVaultUpdated();
  return {
    proposalsSaved,
    galleriesSaved,
    favoritesCount: allFavorites.length,
  };
}
