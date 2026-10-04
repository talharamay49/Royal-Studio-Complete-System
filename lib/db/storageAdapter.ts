import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '@/lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export interface DatabaseEngineStats {
  driverName: string;
  storagePath: string;
  fileSizeBytes: number;
  lastModified: string | null;
}

export interface DatabaseStorageAdapter<T> {
  readonly driverName: string;
  readonly storagePath: string;
  read(): T | null;
  readAsync(): Promise<T | null>;
  write(data: T): void;
  writeAsync(data: T): Promise<void>;
  createBackup(data: T): void;
  createBackupAsync(data: T): Promise<void>;
  getStats(): DatabaseEngineStats;
}

const SHARD_KEYS = [
  'profile',
  'users',
  'clients',
  'events',
  'financials',
  'operations',
  'cms',
  'sessions',
] as const;

type ShardKey = (typeof SHARD_KEYS)[number];

const MAX_SHARD_PAYLOAD_BYTES = 940000;

function extractShardPayload(data: any, shardKey: ShardKey): Record<string, any> {
  switch (shardKey) {
    case 'profile':
      return {
        profile: data.profile,
        profileAuditLogs: data.profileAuditLogs || [],
      };
    case 'users':
      return {
        users: data.users || [],
      };
    case 'clients':
      return {
        clients: data.clients || [],
      };
    case 'events':
      return {
        events: data.events || [],
        daySchedules: data.daySchedules || [],
        packages: data.packages || [],
      };
    case 'financials':
      return {
        invoices: data.invoices || [],
        payments: data.payments || [],
        quotations: data.quotations || [],
        eventExpenses: data.eventExpenses || [],
        studioExpenses: data.studioExpenses || [],
        teamPayments: data.teamPayments || [],
      };
    case 'operations':
      return {
        teamMembers: data.teamMembers || [],
        teamAssignments: data.teamAssignments || [],
        equipment: data.equipment || [],
        equipmentAssignments: data.equipmentAssignments || [],
        maintenanceLogs: data.maintenanceLogs || [],
        tasks: data.tasks || [],
        tempHireRecommendations: data.tempHireRecommendations || [],
      };
    case 'cms':
      return {
        cms: data.cms,
      };
    case 'sessions':
      return {
        sessions: data.sessions || {},
      };
  }
}

/**
 * Persistent Cloud Firestore Database Storage Adapter.
 * Replaces local file-system and in-memory state with multi-shard Cloud Firestore persistence
 * in collection `/studio_store/{shardId}` and `/website_inquiries/{inquiryId}`.
 */
export class FirebaseFirestoreStorageAdapter<T extends Record<string, any>>
  implements DatabaseStorageAdapter<T>
{
  public readonly driverName = 'Google Cloud Firestore (Persistent Enterprise DB)';
  public readonly storagePath = `firestore://${firebaseConfig.projectId}/${firebaseConfig.firestoreDatabaseId}/studio_store`;

  private lastShardJson: Partial<Record<ShardKey, string>> = {};
  private shardVersions: Partial<Record<ShardKey, number>> = {};
  private lastByteSize = 0;
  private lastModifiedIso: string | null = null;

  public read(): T | null {
    return null;
  }

  public async readAsync(): Promise<T | null> {
    const merged: Record<string, any> = {};
    let foundAny = false;
    let totalBytes = 0;

    for (const shardKey of SHARD_KEYS) {
      const pathStr = `studio_store/${shardKey}`;
      try {
        const snap = await getDoc(doc(db, 'studio_store', shardKey));
        if (snap.exists()) {
          const docData = snap.data();
          if (docData && typeof docData.payloadJson === 'string') {
            this.lastShardJson[shardKey] = docData.payloadJson;
            this.shardVersions[shardKey] =
              typeof docData.version === 'number' ? docData.version : 1;
            totalBytes += docData.payloadJson.length;
            if (typeof docData.updatedAtIso === 'string') {
              this.lastModifiedIso = docData.updatedAtIso;
            }
            const parsed = JSON.parse(docData.payloadJson);
            Object.assign(merged, parsed);
            foundAny = true;
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, pathStr);
      }
    }

    if (!foundAny) {
      return null;
    }

    this.lastByteSize = totalBytes;
    return merged as T;
  }

  public write(data: T): void {
    void this.writeAsync(data);
  }

  public async writeAsync(data: T): Promise<void> {
    const nowIso = new Date().toISOString().slice(0, 64);
    let totalBytes = 0;
    const writePromises: Promise<void>[] = [];

    for (const shardKey of SHARD_KEYS) {
      const shardObj = extractShardPayload(data, shardKey);
      let payloadJson = JSON.stringify(shardObj);

      // Defensive payload constraint matching firebase-blueprint.json maxLength (950000)
      if (payloadJson.length > MAX_SHARD_PAYLOAD_BYTES) {
        if (shardKey === 'profile' && Array.isArray(shardObj.profileAuditLogs)) {
          shardObj.profileAuditLogs = shardObj.profileAuditLogs.slice(0, 25);
          payloadJson = JSON.stringify(shardObj);
        }
      }

      totalBytes += payloadJson.length;

      // Only write shards whose serialized content changed
      if (this.lastShardJson[shardKey] === payloadJson) {
        continue;
      }

      const nextVersion = (this.shardVersions[shardKey] || 0) + 1;
      const pathStr = `studio_store/${shardKey}`;

      const p = (async () => {
        try {
          await setDoc(doc(db, 'studio_store', shardKey), {
            shardKey,
            payloadJson,
            updatedAtIso: nowIso,
            version: nextVersion,
          });
          this.lastShardJson[shardKey] = payloadJson;
          this.shardVersions[shardKey] = nextVersion;
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, pathStr);
        }
      })();

      writePromises.push(p);
    }

    if (writePromises.length > 0) {
      await Promise.all(writePromises);
    }

    this.lastByteSize = totalBytes;
    this.lastModifiedIso = nowIso;
  }

  public createBackup(data: T): void {
    void this.createBackupAsync(data);
  }

  public async createBackupAsync(data: T): Promise<void> {
    const nowIso = new Date().toISOString().slice(0, 64);
    const summaryObj = {
      profile: data.profile,
      clientsCount: Array.isArray(data.clients) ? data.clients.length : 0,
      eventsCount: Array.isArray(data.events) ? data.events.length : 0,
      invoicesCount: Array.isArray(data.invoices) ? data.invoices.length : 0,
      paymentsCount: Array.isArray(data.payments) ? data.payments.length : 0,
      backupCreatedAt: nowIso,
    };
    const payloadJson = JSON.stringify(summaryObj).slice(0, MAX_SHARD_PAYLOAD_BYTES);
    const nextVersion = (this.shardVersions.profile || 1) + 1;
    const pathStr = 'studio_store/backup';

    try {
      await setDoc(doc(db, 'studio_store', 'backup'), {
        shardKey: 'backup',
        payloadJson,
        updatedAtIso: nowIso,
        version: nextVersion,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathStr);
    }
  }

  public getStats(): DatabaseEngineStats {
    return {
      driverName: this.driverName,
      storagePath: this.storagePath,
      fileSizeBytes: this.lastByteSize,
      lastModified: this.lastModifiedIso,
    };
  }
}

export async function persistWebsiteInquiryToFirestore(inquiry: {
  referenceId: string;
  brideName: string;
  groomName?: string;
  phone: string;
  email?: string;
  weddingDate: string;
  city: string;
  venue?: string;
  eventType?: string;
  message?: string;
  submittedAt: string;
}): Promise<void> {
  const safeId = inquiry.referenceId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 64);
  const pathStr = `website_inquiries/${safeId}`;
  const payload = {
    referenceId: safeId,
    brideName: (inquiry.brideName || 'Client').slice(0, 120),
    groomName: (inquiry.groomName || '').slice(0, 120),
    phone: (inquiry.phone || '').slice(0, 40),
    email: (inquiry.email || '').slice(0, 160),
    weddingDate: (inquiry.weddingDate || '').slice(0, 40),
    city: (inquiry.city || 'Burewala').slice(0, 100),
    venue: (inquiry.venue || '').slice(0, 200),
    eventType: (inquiry.eventType || 'Wedding').slice(0, 80),
    message: (inquiry.message || '').slice(0, 2000),
    submittedAt: (inquiry.submittedAt || new Date().toISOString()).slice(0, 64),
  };

  try {
    await setDoc(doc(db, 'website_inquiries', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, pathStr);
  }
}

let activeAdapter: DatabaseStorageAdapter<any> = new FirebaseFirestoreStorageAdapter();

export function getDatabaseAdapter<T>(): DatabaseStorageAdapter<T> {
  return activeAdapter as DatabaseStorageAdapter<T>;
}

export function setDatabaseAdapter<T>(adapter: DatabaseStorageAdapter<T>): void {
  activeAdapter = adapter;
}
