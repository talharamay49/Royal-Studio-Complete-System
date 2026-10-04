import {
  User,
  Client,
  Event,
  EventDaySchedule,
  Package,
  TeamMember,
  EventTeamAssignment,
  Equipment,
  EventEquipmentAssignment,
  EquipmentMaintenanceLog,
  EventExpense,
  StudioExpense,
  Invoice,
  Payment,
  Quotation,
  EventTask,
  TeamPayment,
  AdminProfile,
  StudioThemeConfig,
  TempHireRecommendation,
  AuditLogEntry,
} from '../types';
import { apiRequest } from './api';

export interface ErpDatabaseSnapshot {
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: number | null;
  profile: AdminProfile | null;
  profileAuditLogs: AuditLogEntry[];
  users: User[];
  clients: Client[];
  events: Event[];
  daySchedules: EventDaySchedule[];
  packages: Package[];
  teamMembers: TeamMember[];
  teamAssignments: EventTeamAssignment[];
  teamPayments: TeamPayment[];
  equipment: Equipment[];
  equipmentAssignments: EventEquipmentAssignment[];
  maintenanceLogs: EquipmentMaintenanceLog[];
  eventExpenses: EventExpense[];
  studioExpenses: StudioExpense[];
  invoices: Invoice[];
  payments: Payment[];
  quotations: Quotation[];
  tasks: EventTask[];
  tempHireRecommendations: TempHireRecommendation[];
}

export type ErpCollectionKey =
  | 'users'
  | 'clients'
  | 'events'
  | 'daySchedules'
  | 'packages'
  | 'teamMembers'
  | 'teamAssignments'
  | 'teamPayments'
  | 'equipment'
  | 'equipmentAssignments'
  | 'maintenanceLogs'
  | 'eventExpenses'
  | 'studioExpenses'
  | 'invoices'
  | 'payments'
  | 'quotations'
  | 'tasks'
  | 'tempHireRecommendations'
  | 'profileAuditLogs';

const IDB_NAME = 'royal_studio_erp_embedded_db';
const IDB_VERSION = 1;
const IDB_SNAPSHOT_STORE = 'erp_tables';
const IDB_SNAPSHOT_KEY = 'primary_erp_snapshot';
const SYNC_CHANNEL_NAME = 'royal_studio_erp_db_channel';

const INITIAL_SNAPSHOT: ErpDatabaseSnapshot = {
  isHydrated: false,
  isLoading: true,
  error: null,
  lastSyncedAt: null,
  profile: null,
  profileAuditLogs: [],
  users: [],
  clients: [],
  events: [],
  daySchedules: [],
  packages: [],
  teamMembers: [],
  teamAssignments: [],
  teamPayments: [],
  equipment: [],
  equipmentAssignments: [],
  maintenanceLogs: [],
  eventExpenses: [],
  studioExpenses: [],
  invoices: [],
  payments: [],
  quotations: [],
  tasks: [],
  tempHireRecommendations: [],
};

/**
 * Unified Embedded Persistent ERP Database Service.
 * Combines client-side IndexedDB persistent table storage + BroadcastChannel cross-tab sync
 * with server-side atomic JSON/Relational persistence (/api/db/all).
 * Replaces all ephemeral in-memory entity useState arrays in StudioDataContext.
 */
class UnifiedErpDatabaseService {
  private snapshot: ErpDatabaseSnapshot = INITIAL_SNAPSHOT;
  private listeners = new Set<() => void>();
  private channel: BroadcastChannel | null = null;
  private hydrationPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (event.data && event.data.type === 'ERP_DB_UPDATED' && event.data.snapshot) {
            this.snapshot = {
              ...this.snapshot,
              ...event.data.snapshot,
              isHydrated: true,
            };
            this.emitChange();
          }
        };
      } catch {
        this.channel = null;
      }
    }
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getSnapshot = (): ErpDatabaseSnapshot => {
    return this.snapshot;
  };

  public getServerSnapshot = (): ErpDatabaseSnapshot => {
    return INITIAL_SNAPSHOT;
  };

  private emitChange(): void {
    this.listeners.forEach((listener) => listener());
  }

  private broadcastSnapshot(): void {
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'ERP_DB_UPDATED',
          snapshot: this.snapshot,
        });
      } catch {
        // Ignore broadcast errors
      }
    }
  }

  private openIDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_SNAPSHOT_STORE)) {
            db.createObjectStore(IDB_SNAPSHOT_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private async persistToIDB(nextSnapshot: ErpDatabaseSnapshot): Promise<void> {
    const db = await this.openIDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_SNAPSHOT_STORE, 'readwrite');
        const store = tx.objectStore(IDB_SNAPSHOT_STORE);
        const persistable = {
          profile: nextSnapshot.profile,
          profileAuditLogs: nextSnapshot.profileAuditLogs,
          users: nextSnapshot.users,
          clients: nextSnapshot.clients,
          events: nextSnapshot.events,
          daySchedules: nextSnapshot.daySchedules,
          packages: nextSnapshot.packages,
          teamMembers: nextSnapshot.teamMembers,
          teamAssignments: nextSnapshot.teamAssignments,
          teamPayments: nextSnapshot.teamPayments,
          equipment: nextSnapshot.equipment,
          equipmentAssignments: nextSnapshot.equipmentAssignments,
          maintenanceLogs: nextSnapshot.maintenanceLogs,
          eventExpenses: nextSnapshot.eventExpenses,
          studioExpenses: nextSnapshot.studioExpenses,
          invoices: nextSnapshot.invoices,
          payments: nextSnapshot.payments,
          quotations: nextSnapshot.quotations,
          tasks: nextSnapshot.tasks,
          tempHireRecommendations: nextSnapshot.tempHireRecommendations,
          lastSyncedAt: nextSnapshot.lastSyncedAt,
        };
        store.put(persistable, IDB_SNAPSHOT_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  private async readFromIDB(): Promise<Partial<ErpDatabaseSnapshot> | null> {
    const db = await this.openIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_SNAPSHOT_STORE, 'readonly');
        const store = tx.objectStore(IDB_SNAPSHOT_STORE);
        const req = store.get(IDB_SNAPSHOT_KEY);
        req.onsuccess = () => {
          db.close();
          resolve((req.result as Partial<ErpDatabaseSnapshot>) || null);
        };
        req.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    });
  }

  private commit(partial: Partial<ErpDatabaseSnapshot>, persist = true): void {
    this.snapshot = {
      ...this.snapshot,
      ...partial,
    };
    this.emitChange();
    if (persist) {
      void this.persistToIDB(this.snapshot);
      this.broadcastSnapshot();
    }
  }

  /**
   * Hydrate immediately from persistent IndexedDB cache before/during network sync.
   */
  public async hydrateFromLocalStore(): Promise<void> {
    if (this.snapshot.isHydrated) return;
    if (this.hydrationPromise) return this.hydrationPromise;

    this.hydrationPromise = (async () => {
      const cached = await this.readFromIDB();
      if (cached && cached.profile) {
        this.commit(
          {
            ...cached,
            isHydrated: true,
            isLoading: false,
          },
          false
        );
      } else {
        this.commit({ isHydrated: true }, false);
      }
    })();

    return this.hydrationPromise;
  }

  /**
   * Synchronize all ERP tables from the authoritative backend database (/api/db/all)
   * and persist the snapshot into IndexedDB.
   */
  public async syncAllFromServer(): Promise<void> {
    await this.hydrateFromLocalStore();

    // Only show loading spinner if we don't already have hydrated records in IndexedDB
    const hasExistingData = Boolean(this.snapshot.profile && this.snapshot.events.length > 0);
    if (!hasExistingData) {
      this.commit({ isLoading: true, error: null }, false);
    } else {
      this.commit({ error: null }, false);
    }

    try {
      const data = await apiRequest<any>('/api/db/all');
      this.commit(
        {
          isHydrated: true,
          isLoading: false,
          error: null,
          lastSyncedAt: Date.now(),
          profile: data.profile || this.snapshot.profile,
          profileAuditLogs: data.profileAuditLogs || [],
          users: data.users || [],
          clients: data.clients || [],
          events: data.events || [],
          daySchedules: data.daySchedules || [],
          packages: data.packages || [],
          teamMembers: data.teamMembers || [],
          teamAssignments: data.teamAssignments || [],
          teamPayments: data.teamPayments || [],
          equipment: data.equipment || [],
          equipmentAssignments: data.equipmentAssignments || [],
          maintenanceLogs: data.maintenanceLogs || [],
          eventExpenses: data.eventExpenses || [],
          studioExpenses: data.studioExpenses || [],
          invoices: data.invoices || [],
          payments: data.payments || [],
          quotations: data.quotations || [],
          tasks: data.tasks || [],
          tempHireRecommendations: data.tempHireRecommendations || [],
        },
        true
      );
    } catch (err: any) {
      this.commit(
        {
          isLoading: false,
          error: err.message || 'Failed to synchronize studio database.',
        },
        false
      );
      throw err;
    }
  }

  /**
   * Load the public Studio Profile even when unauthenticated (e.g. LoginPage & Theme Engine)
   */
  public async syncPublicProfile(): Promise<void> {
    await this.hydrateFromLocalStore();
    try {
      const response = await fetch('/api/profile', { credentials: 'include' });
      if (response.ok) {
        const profile = (await response.json()) as AdminProfile;
        if (profile && profile.studioName) {
          this.commit({ profile, isLoading: false }, true);
          return;
        }
      }
    } catch {
      // Fallback to cached IndexedDB profile
    }
    this.commit({ isLoading: false }, false);
  }

  public setProfile(profile: AdminProfile, auditLogs?: AuditLogEntry[]): void {
    this.commit(
      {
        profile,
        ...(auditLogs ? { profileAuditLogs: auditLogs } : {}),
        lastSyncedAt: Date.now(),
      },
      true
    );
  }

  public getThemeConfig(): StudioThemeConfig | null {
    return this.snapshot.profile?.themeConfig || null;
  }

  /**
   * Persist global Studio Theme Preferences (Light/Dark mode, Accent Color, Primary Color, Border-Radius)
   * directly to the database for all users across both the Admin ERP and Public Website.
   */
  public async saveThemeConfig(
    themeUpdate: Partial<StudioThemeConfig>
  ): Promise<StudioThemeConfig> {
    const currentProfile = this.snapshot.profile;
    const optimisticTheme = {
      ...(currentProfile?.themeConfig || {}),
      ...themeUpdate,
    } as StudioThemeConfig;

    if (currentProfile) {
      this.commit(
        {
          profile: {
            ...currentProfile,
            themeConfig: optimisticTheme,
          },
          lastSyncedAt: Date.now(),
        },
        true
      );
    }

    const res = await apiRequest<{
      themeConfig: StudioThemeConfig;
      profile: AdminProfile;
    }>('/api/theme', {
      method: 'PUT',
      body: JSON.stringify(themeUpdate),
    });

    if (res?.profile) {
      this.commit(
        {
          profile: res.profile,
          lastSyncedAt: Date.now(),
        },
        true
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('royalstudio:profile-updated', { detail: res.profile })
        );
      }
      return res.themeConfig;
    }

    return optimisticTheme;
  }

  public insertRecord<K extends ErpCollectionKey>(
    collection: K,
    record: ErpDatabaseSnapshot[K][number],
    prepend = true
  ): void {
    const currentList = (this.snapshot[collection] as any[]) || [];
    const nextList = prepend ? [record, ...currentList] : [...currentList, record];
    this.commit(
      {
        [collection]: nextList,
        lastSyncedAt: Date.now(),
      } as Partial<ErpDatabaseSnapshot>,
      true
    );
  }

  public updateRecord<K extends ErpCollectionKey>(
    collection: K,
    id: string,
    updatedRecord: Partial<ErpDatabaseSnapshot[K][number]>
  ): void {
    const currentList = (this.snapshot[collection] as any[]) || [];
    const nextList = currentList.map((item) =>
      item.id === id ? { ...item, ...updatedRecord } : item
    );
    this.commit(
      {
        [collection]: nextList,
        lastSyncedAt: Date.now(),
      } as Partial<ErpDatabaseSnapshot>,
      true
    );
  }

  public deleteRecord<K extends ErpCollectionKey>(collection: K, id: string): void {
    const currentList = (this.snapshot[collection] as any[]) || [];
    const nextList = currentList.filter((item) => item.id !== id);
    this.commit(
      {
        [collection]: nextList,
        lastSyncedAt: Date.now(),
      } as Partial<ErpDatabaseSnapshot>,
      true
    );
  }
}

export const erpDatabase = new UnifiedErpDatabaseService();
