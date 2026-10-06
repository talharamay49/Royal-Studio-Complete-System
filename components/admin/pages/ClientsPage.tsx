import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Trash2,
  Edit,
  ArrowRight,
  ExternalLink,
  Key,
  ShieldCheck,
  Lock,
  Power,
  Eye,
  EyeOff,
  CheckCircle2,
  Copy,
  Check,
  MessageCircle
} from 'lucide-react';
import { useStudioData } from '../context/StudioDataContext';
import { useAuth } from '../context/AuthContext';
import { formatPKR, formatDate } from '../utils/calculations';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { Client } from '../types';

interface ClientsPageProps {
  navigate: (path: string) => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({ navigate }) => {
  const {
    clients,
    events,
    users,
    createClient,
    updateClient,
    deleteClient,
    createClientUser,
    updateUserStatus,
    resetUserPassword,
    deleteUser,
    addToast
  } = useStudioData();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  // Client Login Management Modals (Admin Only - No Public Sign Up)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginTargetClient, setLoginTargetClient] = useState<Client | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [createdLoginCreds, setCreatedLoginCreds] = useState<{
    clientName: string;
    email: string;
    password: string;
    whatsapp?: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [resetPassTarget, setResetPassTarget] = useState<{
    userId: string;
    clientName: string;
    email: string;
  } | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Lahore');
  const [notes, setNotes] = useState('');
  const [provisionLoginOnCreate, setProvisionLoginOnCreate] = useState(false);
  const [initialClientPassword, setInitialClientPassword] = useState('Client@123');

  const getClientAccount = (client: Client) => {
    const linkedUser = users.find(
      u =>
        u.linkedClientId === client.id ||
        (u.role === 'CLIENT' && u.id === client.userId) ||
        (u.role === 'CLIENT' && client.email && u.email.toLowerCase() === client.email.toLowerCase())
    );
    const hasLogin = Boolean(linkedUser || client.hasLogin);
    const userId = linkedUser?.id || client.userId;
    const status = linkedUser?.status || client.loginStatus || (hasLogin ? 'ACTIVE' : undefined);
    const loginEmailAddr = linkedUser?.email || client.email;
    return { hasLogin, userId, status, loginEmailAddr };
  };

  const openCreateClientLoginModal = (client: Client) => {
    setLoginTargetClient(client);
    const suggestedEmail =
      client.email ||
      `${client.name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '')}@client.royalstudio.pk`;
    setLoginEmail(suggestedEmail);
    setLoginPassword('Client@123');
    setCreatedLoginCreds(null);
    setIsLoginModalOpen(true);
  };

  const handleCreateClientLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginTargetClient || !loginEmail.trim() || !loginPassword.trim()) return;
    setIsSubmittingLogin(true);
    try {
      await createClientUser({
        clientId: loginTargetClient.id,
        email: loginEmail.trim(),
        password: loginPassword.trim(),
        name: loginTargetClient.name,
        phone: loginTargetClient.phone
      });
      setCreatedLoginCreds({
        clientName: loginTargetClient.name,
        email: loginEmail.trim(),
        password: loginPassword.trim(),
        whatsapp: loginTargetClient.whatsapp || loginTargetClient.phone
      });
    } catch {
      // Toast handled in context
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleResetClientPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassTarget || !newResetPassword.trim()) return;
    setIsSubmittingLogin(true);
    try {
      await resetUserPassword(resetPassTarget.userId, newResetPassword.trim());
      setIsResetPassModalOpen(false);
      setResetPassTarget(null);
      setNewResetPassword('');
    } catch {
      // Toast handled in context
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.city.toLowerCase().includes(search.toLowerCase());
    const matchesCity = cityFilter === 'ALL' || c.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      addToast('Name and Phone are required.', 'error');
      return;
    }
    const created = await createClient({
      name,
      phone,
      whatsapp: whatsapp || phone,
      email,
      address,
      city,
      notes
    });
    if (provisionLoginOnCreate && created?.id) {
      const loginAddr =
        email.trim() ||
        `${name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '')}@client.royalstudio.pk`;
      await createClientUser({
        clientId: created.id,
        email: loginAddr,
        password: initialClientPassword.trim() || 'Client@123',
        name,
        phone
      });
    }
    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    await updateClient(selectedClient.id, {
      name,
      phone,
      whatsapp,
      email,
      address,
      city,
      notes
    });
    setIsEditModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    await deleteClient(clientToDelete);
    if (selectedClient?.id === clientToDelete) setSelectedClient(null);
    setClientToDelete(null);
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setAddress('');
    setCity('Lahore');
    setNotes('');
  };

  const openEditModal = (c: Client) => {
    setSelectedClient(c);
    setName(c.name);
    setPhone(c.phone);
    setWhatsapp(c.whatsapp);
    setEmail(c.email);
    setAddress(c.address);
    setCity(c.city);
    setNotes(c.notes);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Client Directory & CRM</h2>
          <p className="text-xs text-gray-500">
            Client contacts, lifetime booking value, wedding histories, and outstanding balances.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Client</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by client name, phone, city..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Cities</option>
            <option value="Lahore">Lahore</option>
            <option value="Islamabad">Islamabad</option>
            <option value="Karachi">Karachi</option>
            <option value="Rawalpindi">Rawalpindi</option>
            <option value="Faisalabad">Faisalabad</option>
          </select>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(c => {
          const clientEvents = events.filter(e => e.clientId === c.id);
          const totalSpent = clientEvents.reduce((sum, e) => sum + (e.packagePrice || 0), 0);
          const totalPaid = clientEvents.reduce((sum, e) => sum + (e.totalClientPayments || 0), 0);
          const totalOutstanding = totalSpent - totalPaid;
          const acct = getClientAccount(c);

          return (
            <div
              key={c.id}
              className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-amber-400 transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-bold text-sm text-gray-900">{c.name}</h3>
                      {acct.hasLogin ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            acct.status === 'DISABLED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <Key className="w-2.5 h-2.5" />
                          {acct.status === 'DISABLED' ? 'Login Disabled' : 'Portal Login Active'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                          No Portal Login
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400" /> {c.city}, Pakistan
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Edit Client"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setClientToDelete(c.id);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Client"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1.5 text-gray-600 bg-gray-50/70 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{c.phone}</span>
                  </div>
                  {c.whatsapp && (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <span className="font-bold text-[10px]">WA:</span>
                      <span>{c.whatsapp}</span>
                    </div>
                  )}
                  {(acct.loginEmailAddr || c.email) && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate font-mono text-[11px]">
                        {acct.loginEmailAddr || c.email}
                      </span>
                    </div>
                  )}
                </div>

                {/* Financial Snapshot */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase">Bookings</div>
                    <div className="font-bold text-gray-900">{clientEvents.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase">Paid</div>
                    <div className="font-bold text-emerald-600 font-mono">{formatPKR(totalPaid)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase">Balance</div>
                    <div className={`font-bold font-mono ${totalOutstanding > 0 ? 'text-amber-700' : 'text-gray-700'}`}>
                      {formatPKR(totalOutstanding)}
                    </div>
                  </div>
                </div>

                {/* Events list preview */}
                {clientEvents.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Latest Event:</div>
                    <div
                      onClick={() => navigate(`/events/${clientEvents[0].id}`)}
                      className="flex items-center justify-between text-xs p-2 bg-amber-50/50 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors"
                    >
                      <span className="font-semibold text-gray-900 truncate max-w-[180px]">
                        {clientEvents[0].title}
                      </span>
                      <ArrowRight className="w-3 h-3 text-amber-700" />
                    </div>
                  </div>
                )}
              </div>

              {/* Admin-Only Client Portal Login Controls (like Staff Login System) */}
              {isAdmin && (
                <div className="pt-3 border-t border-gray-100">
                  {!acct.hasLogin ? (
                    <button
                      type="button"
                      onClick={() => openCreateClientLoginModal(c)}
                      className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Create Client Portal Login</span>
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-3 gap-1.5">
                        {acct.userId && (
                          <button
                            type="button"
                            onClick={() => {
                              setResetPassTarget({
                                userId: acct.userId!,
                                clientName: c.name,
                                email: acct.loginEmailAddr || ''
                              });
                              setNewResetPassword('Client@123');
                              setIsResetPassModalOpen(true);
                            }}
                            className="px-2 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                            title="Reset Client Password"
                          >
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>Password</span>
                          </button>
                        )}
                        {acct.userId && (
                          <button
                            type="button"
                            onClick={() =>
                              updateUserStatus(
                                acct.userId!,
                                acct.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED'
                              )
                            }
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                              acct.status === 'DISABLED'
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                            }`}
                            title={acct.status === 'DISABLED' ? 'Enable Login' : 'Suspend Login'}
                          >
                            <Power className="w-3 h-3" />
                            <span>{acct.status === 'DISABLED' ? 'Enable' : 'Suspend'}</span>
                          </button>
                        )}
                        {acct.userId && (
                          <button
                            type="button"
                            onClick={() => deleteUser(acct.userId!)}
                            className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                            title="Revoke Client Login"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Revoke</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Studio Client"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Tariq Mehmood"
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="client@example.pk"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Lahore"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Residential Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. House 14-A, DHA Phase 5"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Client Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Special preferences, aesthetic taste, family members..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          {isAdmin && (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={provisionLoginOnCreate}
                  onChange={e => setProvisionLoginOnCreate(e.target.checked)}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Also create Client Portal Login account now (Admin-Only)</span>
              </label>
              {provisionLoginOnCreate && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Initial Client Portal Password
                  </label>
                  <input
                    type="text"
                    value={initialClientPassword}
                    onChange={e => setInitialClientPassword(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs"
            >
              Save Client
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CREATE CLIENT PORTAL LOGIN (ADMIN ONLY - NO PUBLIC SIGN UP) */}
      <Modal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setCreatedLoginCreds(null);
        }}
        title={`Provision Client Portal Login — ${loginTargetClient?.name || ''}`}
      >
        {createdLoginCreds ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Client Portal Login Activated!</span>
              </div>
              <p className="text-xs text-emerald-700">
                Share these credentials with <strong>{createdLoginCreds.clientName}</strong>. They can log in to view their event details, payment milestones, invoices, and private wedding photo proofing gallery.
              </p>
              <div className="p-3 rounded-lg bg-white border border-emerald-200 font-mono text-xs space-y-1 text-slate-900">
                <div>
                  <strong>Portal URL:</strong> {typeof window !== 'undefined' ? `${window.location.origin}/admin` : '/admin'}
                </div>
                <div>
                  <strong>Login Email:</strong> {createdLoginCreds.email}
                </div>
                <div>
                  <strong>Password:</strong> {createdLoginCreds.password}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const text = `Royal Studio Client Portal Login for ${createdLoginCreds.clientName}\nPortal: ${typeof window !== 'undefined' ? `${window.location.origin}/admin` : '/admin'}\nEmail: ${createdLoginCreds.email}\nPassword: ${createdLoginCreds.password}`;
                  navigator.clipboard.writeText(text);
                  setCopiedCreds(true);
                  setTimeout(() => setCopiedCreds(false), 2000);
                }}
                className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCreds ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCreds ? 'Copied Credentials' : 'Copy Credentials'}</span>
              </button>
              {createdLoginCreds.whatsapp && (
                <a
                  href={`https://wa.me/${createdLoginCreds.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Assalam-o-Alaikum ${createdLoginCreds.clientName},\n\nYour private Royal Studio Client Portal account is now active!\n\n🔗 Portal Link: ${typeof window !== 'undefined' ? `${window.location.origin}/admin` : '/admin'}\n📧 Login Email: ${createdLoginCreds.email}\n🔑 Password: ${createdLoginCreds.password}\n\nLog in anytime to view your event schedule, payment ledger, and private wedding photo proofing gallery.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsLoginModalOpen(false);
                  setCreatedLoginCreds(null);
                }}
                className="px-3.5 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateClientLoginSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong>Admin-Controlled Access (No Sign-Up):</strong> Only Administrators can create Client logins. Provisioning this account grants <strong>{loginTargetClient?.name}</strong> access to their personal Client Profile Portal (events, payments, invoices, and proofing gallery).
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Client Login Email *
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Assign Password *
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  minLength={4}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                {isSubmittingLogin ? 'Provisioning...' : 'Activate Client Login'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: RESET CLIENT PASSWORD */}
      <Modal
        isOpen={isResetPassModalOpen}
        onClose={() => setIsResetPassModalOpen(false)}
        title={`Reset Client Portal Password — ${resetPassTarget?.clientName || ''}`}
      >
        <form onSubmit={handleResetClientPasswordSubmit} className="space-y-4">
          <div className="text-xs text-gray-600">
            Resetting password for client login <strong className="font-mono">{resetPassTarget?.email}</strong>.
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              New Password *
            </label>
            <input
              type="text"
              required
              minLength={4}
              value={newResetPassword}
              onChange={e => setNewResetPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono"
            />
          </div>
          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsResetPassModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
            >
              {isSubmittingLogin ? 'Updating...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Client Information"
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs"
            >
              Update Client
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Client Record?"
        message="Are you sure you want to permanently delete this client? Only clients with zero events can be deleted."
      />
    </div>
  );
};
