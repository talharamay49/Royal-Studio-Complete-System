import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useSyncExternalStore,
  ReactNode,
} from 'react';
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
  TempHireRecommendation,
  AIBriefing,
  AuditLogEntry,
} from '../types';
import { apiRequest } from '../services/api';
import { erpDatabase } from '../services/databaseService';
import { useAuth } from './AuthContext';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface StudioDataContextType {
  isLoading: boolean;
  error: string | null;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;

  // Persistent Database Entities (backed by UnifiedErpDatabaseService)
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

  // Refresh & Sync
  refreshAll: () => Promise<void>;

  // CRUD Operations
  updateProfile: (profileData: Partial<AdminProfile>, auditSection?: string) => Promise<void>;
  resetProfileToDefaults: () => Promise<void>;
  createClient: (clientData: Partial<Client>) => Promise<Client>;
  updateClient: (id: string, clientData: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;

  createEvent: (eventData: any) => Promise<Event>;
  updateEvent: (id: string, eventData: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  recalculateEvent: (id: string) => Promise<Event>;
  autoAssignCrew: (eventId: string) => Promise<any>;

  createDaySchedule: (data: Partial<EventDaySchedule>) => Promise<void>;
  updateDaySchedule: (id: string, data: Partial<EventDaySchedule>) => Promise<void>;
  deleteDaySchedule: (id: string) => Promise<void>;

  createTeamMember: (data: Partial<TeamMember>) => Promise<void>;
  updateTeamMember: (id: string, data: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;

  createTeamAssignment: (data: Partial<EventTeamAssignment>) => Promise<void>;
  deleteTeamAssignment: (id: string) => Promise<void>;

  createEquipment: (data: Partial<Equipment>) => Promise<void>;
  updateEquipment: (id: string, data: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;

  assignEquipment: (data: Partial<EventEquipmentAssignment>) => Promise<void>;
  deleteEquipmentAssignment: (id: string) => Promise<void>;
  createMaintenanceLog: (data: Partial<EquipmentMaintenanceLog>) => Promise<void>;

  createPackage: (data: Partial<Package>) => Promise<Package>;
  updatePackage: (id: string, data: Partial<Package>) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;

  createExpense: (data: Partial<EventExpense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  createStudioExpense: (data: Partial<StudioExpense>) => Promise<void>;
  deleteStudioExpense: (id: string) => Promise<void>;

  createInvoice: (data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  createPayment: (data: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;

  createQuotation: (data: Partial<Quotation>) => Promise<void>;

  createTask: (data: Partial<EventTask>) => Promise<void>;
  updateTask: (id: string, data: Partial<EventTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  createTeamPayment: (data: Partial<TeamPayment>) => Promise<void>;
  processPayoutBatch: (payouts: any[]) => Promise<any>;

  fetchAIBriefing: () => Promise<AIBriefing>;

  // User Accounts & Staff Login Management
  createStaffUser: (userData: {
    teamMemberId: string;
    email: string;
    password: string;
    name?: string;
    phone?: string;
  }) => Promise<User>;
  updateUserStatus: (id: string, status: 'ACTIVE' | 'DISABLED') => Promise<void>;
  resetUserPassword: (id: string, password: string) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const StudioDataContext = createContext<StudioDataContextType | undefined>(undefined);

export const StudioDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Subscribe directly to the Unified Persistent ERP Database Service (no ephemeral in-memory entity states)
  const dbSnapshot = useSyncExternalStore(
    erpDatabase.subscribe,
    erpDatabase.getSnapshot,
    erpDatabase.getServerSnapshot
  );

  const addToast = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    await erpDatabase.syncAllFromServer().catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user) {
      void erpDatabase.syncAllFromServer().catch(() => {});
    } else {
      void erpDatabase.syncPublicProfile();
    }
  }, [user]);

  // Listen for global client-side errors captured by AdminErrorBoundary / adminErrorLogger
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleAdminErrorAlert = (event: globalThis.Event) => {
      const customEvent = event as CustomEvent<{ id?: string; message?: string; route?: string }>;
      const msg = customEvent.detail?.message || 'Unexpected client-side error captured.';
      const ref = customEvent.detail?.id ? ` [${customEvent.detail.id}]` : '';
      addToast(`Admin Alert${ref}: ${msg}`, 'error');
    };
    window.addEventListener('royalstudio:admin-error-alert', handleAdminErrorAlert);
    return () => {
      window.removeEventListener('royalstudio:admin-error-alert', handleAdminErrorAlert);
    };
  }, [addToast]);

  // Operations backed by UnifiedErpDatabaseService
  const updateProfile = async (profileData: Partial<AdminProfile>, auditSection?: string) => {
    try {
      const updated = await apiRequest<AdminProfile>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(
          auditSection ? { ...profileData, _auditSection: auditSection } : profileData
        ),
      });
      let nextLogs: AuditLogEntry[] | undefined;
      try {
        const logs = await apiRequest<AuditLogEntry[]>('/api/profile/audit-logs');
        if (Array.isArray(logs)) nextLogs = logs;
      } catch {
        // Ignore if not admin
      }
      erpDatabase.setProfile(updated, nextLogs);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('royalstudio:profile-updated', { detail: updated }));
      }
      addToast('Studio profile and settings updated successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const resetProfileToDefaults = async () => {
    try {
      const res = await apiRequest<{ profile: AdminProfile; auditLogs: AuditLogEntry[] }>(
        '/api/profile/reset',
        {
          method: 'POST',
        }
      );
      if (res.profile) {
        erpDatabase.setProfile(res.profile, res.auditLogs);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('royalstudio:profile-updated', { detail: res.profile })
          );
        }
      }
      addToast('Restored official Royal Studio profile defaults.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createClient = async (clientData: Partial<Client>) => {
    try {
      const newClient = await apiRequest<Client>('/api/clients', {
        method: 'POST',
        body: JSON.stringify(clientData),
      });
      erpDatabase.insertRecord('clients', newClient, true);
      addToast('Client created successfully.');
      return newClient;
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      const updated = await apiRequest<Client>(`/api/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(clientData),
      });
      erpDatabase.updateRecord('clients', id, updated);
      addToast('Client updated successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await apiRequest(`/api/clients/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('clients', id);
      addToast('Client deleted successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createEvent = async (eventData: any) => {
    try {
      const newEvent = await apiRequest<Event>('/api/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Event created successfully.');
      return newEvent;
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const updateEvent = async (id: string, eventData: Partial<Event>) => {
    try {
      const updated = await apiRequest<Event>(`/api/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(eventData),
      });
      erpDatabase.updateRecord('events', id, updated);
      addToast('Event updated successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await apiRequest(`/api/events/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('events', id);
      await erpDatabase.syncAllFromServer();
      addToast('Event deleted successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const recalculateEvent = async (id: string) => {
    try {
      const updated = await apiRequest<Event>(`/api/events/${id}/recalculate`, {
        method: 'POST',
      });
      erpDatabase.updateRecord('events', id, updated);
      addToast('Event financials recalculated successfully.');
      return updated;
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const autoAssignCrew = async (eventId: string) => {
    try {
      const res = await apiRequest<any>(`/api/events/${eventId}/auto-assign`, {
        method: 'POST',
      });
      await erpDatabase.syncAllFromServer();
      if (res.hasShortage) {
        addToast(
          `Insufficient team availability: Shortage of ${res.missingRoles.join(', ')}. Temporary hire recommendation generated.`,
          'warning'
        );
      } else {
        addToast(`Auto-assigned ${res.assignedCount} team members successfully.`);
      }
      return res;
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createDaySchedule = async (data: Partial<EventDaySchedule>) => {
    try {
      await apiRequest('/api/day-schedules', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Event day schedule added.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const updateDaySchedule = async (id: string, data: Partial<EventDaySchedule>) => {
    try {
      await apiRequest(`/api/day-schedules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Day schedule updated.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteDaySchedule = async (id: string) => {
    try {
      await apiRequest(`/api/day-schedules/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('daySchedules', id);
      await erpDatabase.syncAllFromServer();
      addToast('Day schedule removed.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createTeamMember = async (data: Partial<TeamMember>) => {
    try {
      await apiRequest('/api/team', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Team member created successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const updateTeamMember = async (id: string, data: Partial<TeamMember>) => {
    try {
      await apiRequest(`/api/team/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Team member updated successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteTeamMember = async (id: string) => {
    try {
      await apiRequest(`/api/team/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('teamMembers', id);
      await erpDatabase.syncAllFromServer();
      addToast('Team member removed.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createTeamAssignment = async (data: Partial<EventTeamAssignment>) => {
    try {
      await apiRequest('/api/team-assignments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Team member assigned to event.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteTeamAssignment = async (id: string) => {
    try {
      await apiRequest(`/api/team-assignments/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('teamAssignments', id);
      await erpDatabase.syncAllFromServer();
      addToast('Assignment removed.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createEquipment = async (data: Partial<Equipment>) => {
    try {
      await apiRequest('/api/equipment', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Equipment added successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const updateEquipment = async (id: string, data: Partial<Equipment>) => {
    try {
      await apiRequest(`/api/equipment/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Equipment updated successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteEquipment = async (id: string) => {
    try {
      await apiRequest(`/api/equipment/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('equipment', id);
      await erpDatabase.syncAllFromServer();
      addToast('Equipment deleted.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const assignEquipment = async (data: Partial<EventEquipmentAssignment>) => {
    try {
      await apiRequest('/api/equipment-assignments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Equipment assigned to event.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteEquipmentAssignment = async (id: string) => {
    try {
      await apiRequest(`/api/equipment-assignments/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('equipmentAssignments', id);
      await erpDatabase.syncAllFromServer();
      addToast('Equipment assignment removed.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createMaintenanceLog = async (data: Partial<EquipmentMaintenanceLog>) => {
    try {
      await apiRequest('/api/maintenance-logs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Maintenance log recorded.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createPackage = async (data: Partial<Package>): Promise<Package> => {
    try {
      const created = await apiRequest<Package>('/api/packages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Package created successfully.');
      return created;
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const updatePackage = async (id: string, data: Partial<Package>) => {
    try {
      await apiRequest(`/api/packages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Package updated successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deletePackage = async (id: string) => {
    try {
      await apiRequest(`/api/packages/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('packages', id);
      await erpDatabase.syncAllFromServer();
      addToast('Package deleted.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createExpense = async (data: Partial<EventExpense>) => {
    try {
      await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Event expense recorded.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await apiRequest(`/api/expenses/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('eventExpenses', id);
      await erpDatabase.syncAllFromServer();
      addToast('Expense removed.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createStudioExpense = async (data: Partial<StudioExpense>) => {
    try {
      await apiRequest('/api/studio-expenses', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Studio overhead expense recorded.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteStudioExpense = async (id: string) => {
    try {
      await apiRequest(`/api/studio-expenses/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('studioExpenses', id);
      await erpDatabase.syncAllFromServer();
      addToast('Studio expense removed.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createInvoice = async (data: Partial<Invoice>) => {
    try {
      await apiRequest('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Invoice generated successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await apiRequest(`/api/invoices/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('invoices', id);
      await erpDatabase.syncAllFromServer();
      addToast('Invoice deleted.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createPayment = async (data: Partial<Payment>) => {
    try {
      await apiRequest('/api/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Payment recorded successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deletePayment = async (id: string) => {
    try {
      await apiRequest(`/api/payments/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('payments', id);
      await erpDatabase.syncAllFromServer();
      addToast('Payment deleted.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createQuotation = async (data: Partial<Quotation>) => {
    try {
      await apiRequest('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Quotation created successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createTask = async (data: Partial<EventTask>) => {
    try {
      await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Task created successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const updateTask = async (id: string, data: Partial<EventTask>) => {
    try {
      await apiRequest(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Task updated successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });
      erpDatabase.deleteRecord('tasks', id);
      await erpDatabase.syncAllFromServer();
      addToast('Task deleted.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createTeamPayment = async (data: Partial<TeamPayment>) => {
    try {
      await apiRequest('/api/team-payments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      await erpDatabase.syncAllFromServer();
      addToast('Team payment recorded successfully.');
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const processPayoutBatch = async (payouts: any[]) => {
    try {
      const res = await apiRequest('/api/payout-batch', {
        method: 'POST',
        body: JSON.stringify({ payouts }),
      });
      await erpDatabase.syncAllFromServer();
      addToast(`Batch ${res.batchId} processed with ${res.totalProcessed} payouts.`);
      return res;
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const fetchAIBriefing = async (): Promise<AIBriefing> => {
    try {
      const briefing = await apiRequest<AIBriefing>('/api/ai/briefing', {
        method: 'POST',
      });
      return briefing;
    } catch (err: any) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  const createStaffUser = async (userData: {
    teamMemberId: string;
    email: string;
    password: string;
    name?: string;
    phone?: string;
  }) => {
    try {
      const created = await apiRequest<User>('/api/users/staff', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      erpDatabase.insertRecord('users', created, false);
      await erpDatabase.syncAllFromServer();
      addToast(`Staff login credentials created for ${created.name}`);
      return created;
    } catch (err: any) {
      addToast(err.message || 'Failed to create staff login', 'error');
      throw err;
    }
  };

  const updateUserStatus = async (id: string, status: 'ACTIVE' | 'DISABLED') => {
    try {
      const updated = await apiRequest<User>(`/api/users/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      erpDatabase.updateRecord('users', id, { status: updated.status });
      await erpDatabase.syncAllFromServer();
      addToast(`Account status updated to ${status}`);
    } catch (err: any) {
      addToast(err.message || 'Failed to update user status', 'error');
      throw err;
    }
  };

  const resetUserPassword = async (id: string, password: string) => {
    try {
      await apiRequest(`/api/users/${id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
      addToast('Password has been securely reset.');
    } catch (err: any) {
      addToast(err.message || 'Failed to reset password', 'error');
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await apiRequest(`/api/users/${id}`, {
        method: 'DELETE',
      });
      erpDatabase.deleteRecord('users', id);
      await erpDatabase.syncAllFromServer();
      addToast('Staff login account removed successfully.');
    } catch (err: any) {
      addToast(err.message || 'Failed to delete user account', 'error');
      throw err;
    }
  };

  return (
    <StudioDataContext.Provider
      value={{
        isLoading: dbSnapshot.isLoading,
        error: dbSnapshot.error,
        toasts,
        addToast,
        removeToast,
        profile: dbSnapshot.profile,
        profileAuditLogs: dbSnapshot.profileAuditLogs || [],
        users: dbSnapshot.users,
        clients: dbSnapshot.clients,
        events: dbSnapshot.events,
        daySchedules: dbSnapshot.daySchedules,
        packages: dbSnapshot.packages,
        teamMembers: dbSnapshot.teamMembers,
        teamAssignments: dbSnapshot.teamAssignments,
        teamPayments: dbSnapshot.teamPayments,
        equipment: dbSnapshot.equipment,
        equipmentAssignments: dbSnapshot.equipmentAssignments,
        maintenanceLogs: dbSnapshot.maintenanceLogs,
        eventExpenses: dbSnapshot.eventExpenses,
        studioExpenses: dbSnapshot.studioExpenses,
        invoices: dbSnapshot.invoices,
        payments: dbSnapshot.payments,
        quotations: dbSnapshot.quotations,
        tasks: dbSnapshot.tasks,
        tempHireRecommendations: dbSnapshot.tempHireRecommendations,
        refreshAll,
        updateProfile,
        resetProfileToDefaults,
        createClient,
        updateClient,
        deleteClient,
        createEvent,
        updateEvent,
        deleteEvent,
        recalculateEvent,
        autoAssignCrew,
        createDaySchedule,
        updateDaySchedule,
        deleteDaySchedule,
        createTeamMember,
        updateTeamMember,
        deleteTeamMember,
        createTeamAssignment,
        deleteTeamAssignment,
        createEquipment,
        updateEquipment,
        deleteEquipment,
        assignEquipment,
        deleteEquipmentAssignment,
        createMaintenanceLog,
        createPackage,
        updatePackage,
        deletePackage,
        createExpense,
        deleteExpense,
        createStudioExpense,
        deleteStudioExpense,
        createInvoice,
        deleteInvoice,
        createPayment,
        deletePayment,
        createQuotation,
        createTask,
        updateTask,
        deleteTask,
        createTeamPayment,
        processPayoutBatch,
        fetchAIBriefing,
        createStaffUser,
        updateUserStatus,
        resetUserPassword,
        deleteUser,
      }}
    >
      {children}
    </StudioDataContext.Provider>
  );
};

export function useStudioData() {
  const context = useContext(StudioDataContext);
  if (!context) {
    throw new Error('useStudioData must be used within a StudioDataProvider');
  }
  return context;
}
